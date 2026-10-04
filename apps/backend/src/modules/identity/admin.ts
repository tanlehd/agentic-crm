import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { Ajv } from 'ajv';
import { identitySchema } from '@agentic-crm/contracts';
import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError, DurableCommands, canonical } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from './authorization.js';
import { parseGrants, permits, seatCapabilities } from './domain/authorization.js';
const ajv=new Ajv({strict:true});
ajv.addFormat('uuid',/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
ajv.addSchema(identitySchema,'identity');
export const uuid=(value:unknown): value is string=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const resources={memberships:['membership','membership'],teams:['team','team'],roles:['role','role'],'ai-agents':['ai_agent','agent'],principals:['principal','agent']} as const;
export type Resource=keyof typeof resources;
export function resource(value: string): Resource {
  if (!Object.hasOwn(resources,value)) throw new CommandError(404,'NOT_FOUND');
  return value as Resource;
}
type Body=Record<string,any>;
export function validateBody(route:Resource, operation:'create'|'patch', value:unknown): Body {
  const validator=ajv.getSchema(`identity#/definitions/${route}-${operation}`);
  if (!validator || !validator(value)) throw new CommandError(400,'INVALID_REQUEST');
  return value as Body;
}
export interface PageQuery {limit?:unknown;cursor?:unknown;status?:unknown}
interface Position {at:string;id:string}
export class IdentityAdmin {
  readonly uow: UnitOfWork;
  readonly authorization: IdentityAuthorization;
  constructor(private readonly source: DataSource, private readonly cursorSecret: string | Buffer, private readonly commands=new DurableCommands()) {
    this.uow=new UnitOfWork(source); this.authorization=new IdentityAuthorization(this.uow);
  }
  private page(query:PageQuery, binding:unknown) {
    const limit=query.limit===undefined ? 50 : Number(query.limit);
    if (!Number.isInteger(limit) || limit<1 || limit>100 || typeof query.limit==='object') throw new CommandError(400,'INVALID_REQUEST');
    let position:Position|undefined;
    if (query.cursor!==undefined) {
      if (typeof query.cursor!=='string' || query.cursor.length>4096) throw new CommandError(400,'INVALID_CURSOR');
      const [payload,signature,...extra]=query.cursor.split('.');
      const expected=createHmac('sha256',this.cursorSecret).update(payload ?? '').digest('base64url');
      if (!signature || extra.length || signature.length!==expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) throw new CommandError(400,'INVALID_CURSOR');
      try {
        const decoded=JSON.parse(Buffer.from(payload!,'base64url').toString());
        if (canonical(decoded.binding)!==canonical(binding) || !uuid(decoded.position.id) || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(decoded.position.at)) throw new Error();
        position=decoded.position;
      } catch {throw new CommandError(400,'INVALID_CURSOR');}
    }
    return {limit,position,next:(row: any)=>{
      const payload=Buffer.from(JSON.stringify({binding,position:{at:row.position,id:row.id}})).toString('base64url');
      return `${payload}.${createHmac('sha256',this.cursorSecret).update(payload).digest('base64url')}`;
    }};
  }
  async mine(accountId:string, query:PageQuery) {
    const page=this.page(query,{accountId,resource:'mine'});
    const params:unknown[]=[accountId];
    let after=''; if(page.position){after=' AND (m.created_at>? OR (m.created_at=? AND m.id>?))';params.push(page.position.at,page.position.at,page.position.id);}
    const rows=await this.source.query(`SELECT m.id,m.tenant_id,m.version,m.seat_code,p.id principal_id,t.name tenant_name,DATE_FORMAT(m.created_at,'%Y-%m-%d %H:%i:%s.%f') position FROM membership m JOIN tenant t ON t.id=m.tenant_id JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id AND p.kind='human' WHERE m.account_id=? AND m.status='active' AND t.status='active' AND p.status='active' ${after} ORDER BY m.created_at,m.id LIMIT ${page.limit+1}`,params);
    const hasMore=rows.length>page.limit; const visible=rows.slice(0,page.limit);
    return {data:visible.map(({position:_,...row}:any)=>({...row,version:String(row.version)})),next_cursor:hasMore?page.next(visible.at(-1)):null};
  }
  list(accountId:string,tenantId:string,route:Resource,query:PageQuery) {
    if(route==='principals') throw new CommandError(404,'NOT_FOUND');
    if(query.status!==undefined && (typeof query.status!=='string' || route!=='memberships' || !['invited','active','suspended'].includes(String(query.status)))) throw new CommandError(400,'INVALID_REQUEST');
    return this.authorization.runHuman(accountId,tenantId,async(scope,access)=>{
      if(!permits(access,resources[route][1],'read')) throw new CommandError(403,'FORBIDDEN');
      const page=this.page(query,{accountId,tenantId,resource:route,status:query.status??null});
      const params:unknown[]=[tenantId];let where='tenant_id=?';
      if(query.status!==undefined){where+=' AND status=?';params.push(query.status);}
      if(page.position){where+=' AND (created_at>? OR (created_at=? AND id>?))';params.push(page.position.at,page.position.at,page.position.id);}
      const rows=await scope.query(`SELECT id,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s.%f') position FROM \`${resources[route][0]}\` WHERE ${where} ORDER BY created_at,id LIMIT ${page.limit+1}`,params);
      const visible=rows.slice(0,page.limit),data=[];
      for(const row of visible) data.push(await this.entity(scope,route,row.id));
      return {data,next_cursor:rows.length>page.limit?page.next(visible.at(-1)):null};
    });
  }
  private async row(scope:TransactionScope,table:string,id:string) {
    const rows=await scope.query(`SELECT * FROM \`${table}\` WHERE tenant_id=? AND id=?`,[scope.context.tenantId,id]);
    if(!rows[0]) throw new CommandError(404,'NOT_FOUND'); return rows[0];
  }
  private async entity(scope:TransactionScope,route:Resource,id:string):Promise<Record<string,unknown>> {
    const row=await this.row(scope,resources[route][0],id);
    const fields:Record<Resource,string[]>={memberships:['account_id','status','seat_code'],teams:['name','purpose','active'],roles:['key','name','permissions'],'ai-agents':['name','policy_id','runtime_adapter','max_concurrency'],principals:['kind','status','availability','auth_revision']};
    const result:Record<string,unknown>={id:row.id,tenant_id:row.tenant_id,version:String(row.version)};
    for(const field of fields[route]) result[field]=field==='permissions'?parseGrants(row[field]):field==='active'?Boolean(row[field]):field==='auth_revision'?String(row[field]):row[field];
    if(route==='memberships'||route==='ai-agents'){
      const [principal]=await scope.query(`SELECT id,version,auth_revision FROM principal WHERE tenant_id=? AND ${route==='memberships'?'membership_id':'ai_agent_id'}=?`,[scope.context.tenantId,id]);
      if(!principal) throw new Error('Missing principal');
      Object.assign(result,{principal_id:principal.id,principal_version:String(principal.version),auth_revision:String(principal.auth_revision)});
      result.role_ids=(await scope.query('SELECT role_id FROM principal_role WHERE tenant_id=? AND principal_id=? ORDER BY role_id',[scope.context.tenantId,principal.id])).map((r:any)=>r.role_id);
      result.team_ids=(await scope.query('SELECT team_id FROM team_member WHERE tenant_id=? AND principal_id=? AND active=1 ORDER BY team_id',[scope.context.tenantId,principal.id])).map((r:any)=>r.team_id);
    }
    return result;
  }
  private async insert(scope:TransactionScope,table:string,id:string,fields:Body){
    const names=Object.keys(fields);
    await scope.query(`INSERT INTO \`${table}\` (id,tenant_id,${names.map(k=>`\`${k}\``).join(',')},created_at,updated_at) VALUES (?,?,${names.map(()=>'?').join(',')},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[id,scope.context.tenantId,...Object.values(fields)]);
  }
  private async update(scope:TransactionScope,table:string,id:string,version:string,fields:Body){
    const names=Object.keys(fields);
    const result=await scope.query(`UPDATE \`${table}\` SET ${names.map(k=>`\`${k}\`=?,`).join('')}version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND version=?`,[...Object.values(fields),scope.context.tenantId,id,version]);
    if(result.affectedRows!==1)throw new CommandError(409,'VERSION_CONFLICT');
  }
  private async assignments(scope:TransactionScope,principal:string,body:Body){
    for(const [field,table,junction,column] of [['role_ids','role','principal_role','role_id'],['team_ids','team','team_member','team_id']] as const){
      if(body[field]===undefined)continue;
      for(const ref of body[field]) await this.row(scope,table,ref);
      await scope.query(`DELETE FROM ${junction} WHERE tenant_id=? AND principal_id=?`,[scope.context.tenantId,principal]);
      for(const ref of body[field])await scope.query(`INSERT INTO ${junction}(tenant_id,principal_id,${column}) VALUES (?,?,?)`,[scope.context.tenantId,principal,ref]);
    }
  }
  private async lastAdmin(scope:TransactionScope){
    const candidates=await scope.query(`SELECT DISTINCT p.id FROM membership m JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id JOIN principal_role pr ON pr.tenant_id=p.tenant_id AND pr.principal_id=p.id JOIN \`role\` r ON r.tenant_id=pr.tenant_id AND r.id=pr.role_id WHERE m.tenant_id=? AND m.status='active' AND m.seat_code='admin' AND p.status='active' AND p.kind='human' AND r.\`key\`='tenant_admin'`,[scope.context.tenantId]);
    for(const candidate of candidates){
      const rows=await scope.query('SELECT r.permissions FROM principal_role pr JOIN `role` r ON r.tenant_id=pr.tenant_id AND r.id=pr.role_id WHERE pr.tenant_id=? AND pr.principal_id=?',[scope.context.tenantId,candidate.id]);
      const access={tenantId:scope.context.tenantId,principalId:candidate.id,revision:'1',capabilities:seatCapabilities('admin'),grants:rows.flatMap((r:any)=>parseGrants(r.permissions)),teamIds:[],fieldDenies:[]};
      if(['membership','role','team','agent'].every(r=>['read','create','update'].every(a=>permits(access,r,a)))) return;
    }
    throw new CommandError(409,'LAST_ADMIN_REQUIRED');
  }
  async mutate(accountId:string,tenantId:string,route:Resource,id:string|undefined,input:unknown,key:string,version:string|undefined,correlationId:string){
    const body=validateBody(route,id?'patch':'create',input);
    if(!uuid(tenantId)||id!==undefined&&!uuid(id)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    if(id && !version)throw new CommandError(428,'PRECONDITION_REQUIRED');
    if(version && !/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
    let actor:string|undefined;
    try{return await this.uow.run({tenantId},async scope=>{
      const access=await this.authorization.loadHuman(scope,accountId,undefined,true);actor=access.principalId;
      const required=id?'update':'create';
      const mayManage=(permission:string)=>permits(access,permission,required)&&permits(access,permission,'read');
      if(route==='principals' ? !mayManage('membership')&&!mayManage('agent') : !mayManage(resources[route][1]))throw new CommandError(403,'FORBIDDEN');
      const existing=id?await this.row(scope,resources[route][0],id):undefined;
      const permission=route==='principals'&&existing.kind==='human'?'membership':resources[route][1];
      if(!permits(access,permission,id?'update':'create')||!permits(access,permission,'read'))throw new CommandError(403,'FORBIDDEN');
      const command={actorId:actor,correlationId,route:`${id?'PATCH':'POST'} /api/v1/admin/${route}${id?'/'+id:''}`,key,body,version};
      const replay=await this.commands.replay(scope,command,async response=>{
        if(!permits(access,permission,'read'))throw new CommandError(403,'FORBIDDEN');
        if(response.body.data.tenant_id!==tenantId)throw new CommandError(403,'FORBIDDEN');
        await this.entity(scope,route,String(response.body.data.id));
      });if(replay)return replay;
      if(existing && String(existing.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');
      if(route==='principals'&&existing.kind==='human'&&body.status!==undefined)throw new CommandError(400,'INVALID_REQUEST');
      const target=id??randomUUID(),fields={...body};delete fields.role_ids;delete fields.team_ids;
      if(route==='roles')fields.permissions=body.permissions===undefined?undefined:JSON.stringify(body.permissions);
      if(fields.permissions===undefined)delete fields.permissions;
      if(route==='memberships'&&!id){
        if(!(await scope.query('SELECT id FROM account WHERE id=?',[body.account_id]))[0])throw new CommandError(404,'NOT_FOUND');
        fields.status='active';
      }
      if(body.policy_id)await this.row(scope,'agent_policy',body.policy_id);
      if(id)await this.update(scope,resources[route][0],target,version!,fields);
      else await this.insert(scope,resources[route][0],target,fields);
      const affected=new Set<string>();
      if(route==='memberships'||route==='ai-agents'){
        let principal:string;
        if(!id){principal=randomUUID();await this.insert(scope,'principal',principal,{kind:route==='memberships'?'human':'ai',[route==='memberships'?'membership_id':'ai_agent_id']:target,status:'active'});}
        else principal=(await scope.query(`SELECT id FROM principal WHERE tenant_id=? AND ${route==='memberships'?'membership_id':'ai_agent_id'}=?`,[tenantId,target]))[0].id;
        await this.assignments(scope,principal,body);affected.add(principal);
        if(route==='memberships'&&body.status)await scope.query('UPDATE principal SET status=? WHERE tenant_id=? AND id=?',[body.status,tenantId,principal]);
      }else if(route==='principals')affected.add(target);
      else {
        const junction=route==='roles'?'principal_role':'team_member',column=route==='roles'?'role_id':'team_id';
        for(const row of await scope.query(`SELECT principal_id FROM ${junction} WHERE tenant_id=? AND ${column}=?`,[tenantId,target]))affected.add(row.principal_id);
        if(route==='roles')await scope.query('UPDATE service_actor SET auth_revision=auth_revision+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND role_id=?',[tenantId,target]);
      }
      await this.lastAdmin(scope);
      for(const principal of affected){
        // A new principal starts revision 1; existing mutations advance it once.
        if(id || route==='roles'||route==='teams')await scope.query(`UPDATE principal SET auth_revision=auth_revision+1,version=version+${route==='principals'?'0':'1'},updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,[tenantId,principal]);
        await scope.query('UPDATE membership m JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id SET m.auth_revision=p.auth_revision,m.updated_at=UTC_TIMESTAMP(6) WHERE p.tenant_id=? AND p.id=?',[tenantId,principal]);
        const current=await this.row(scope,'principal',principal);
        await this.commands.accessChanged(scope,actor,correlationId,current);
      }
      const response={status:id?200:201,body:{data:await this.entity(scope,route,target),meta:{correlation_id:correlationId}}};
      await this.commands.audit(scope,actor,correlationId,resources[route][0],target,id?'update':'create',Object.keys(body));
      await this.commands.complete(scope,command,response);return response;
    });}catch(error){
      if(actor && error instanceof CommandError && [403,409].includes(error.status))await this.uow.run({tenantId},scope=>this.commands.audit(scope,actor!,correlationId,resources[route][0],id??null,id?'update':'create',[],'denied',error.code));
      if((error as {code?:string}).code==='ER_DUP_ENTRY')throw new CommandError(409,'ALREADY_EXISTS');
      throw error;
    }
  }
}
