import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import type {DataSource} from 'typeorm';
import {UnitOfWork,type TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import {IdentityAuthorization,requireActiveTenant} from './authorization.js';
import {uuid} from './admin.js';
import type {ExternalObject} from '../crm/external-port.js';
import {PLATFORM_TENANT_ID} from '../../kernel/database/system-scope.js';
import type {IdentityPolicyDrain} from './owner-policy-drain.js';

export interface AppGrant {object:string;scope:string;properties:string[];record_scope:'all'|'teams';team_ids:string[]}
export interface AppConfig {name:string;description:string;grants:AppGrant[];status:'active'|'disabled'}
export const tokenDigest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function parseAppToken(header:unknown){
  if(typeof header!=='string')throw new CommandError(401,'INVALID_TOKEN');
  const m=/^Bearer (eapi_([0-9a-f-]{36})_([0-9a-f-]{36})_([A-Za-z0-9_-]{43}))$/.exec(header);
  if(!m||!uuid(m[2])||!uuid(m[3])||m[2]===PLATFORM_TENANT_ID||m[2]==='00000000-0000-0000-0000-000000000000')throw new CommandError(401,'INVALID_TOKEN');
  return {token:m[1]!,tenant:m[2]!,id:m[3]!};
}
export function exactObject(value:unknown,keys:string[]):Record<string,any>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new CommandError(400,'INVALID_REQUEST');
  return value as Record<string,any>;
}
export function validateAppConfig(input:unknown,catalog:ExternalObject[],teams:string[]):AppConfig{
  const b=exactObject(input,['name','description','grants','status']);
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120||typeof b.description!=='string'||b.description.length>1000||!['active','disabled'].includes(b.status)||!Array.isArray(b.grants)||!b.grants.length||b.grants.length>20)throw new CommandError(400,'INVALID_REQUEST');
  const grants:AppGrant[]=b.grants.map((value:unknown)=>{
    const g=exactObject(value,['object','scope','properties','record_scope','team_ids']),definition=catalog.find(x=>x.key===g.object);
    if(!definition||g.scope!==definition.scope||!Array.isArray(g.properties)||!g.properties.length||g.properties.length>100||new Set(g.properties).size!==g.properties.length||g.properties.some((p:unknown)=>typeof p!=='string'||!definition.properties.some(x=>x.key===p))||!['all','teams'].includes(g.record_scope)||!Array.isArray(g.team_ids)||new Set(g.team_ids).size!==g.team_ids.length||g.team_ids.length>20||g.team_ids.some((t:unknown)=>typeof t!=='string'||!teams.includes(t))||g.record_scope==='all'&&g.team_ids.length||g.record_scope==='teams'&&!g.team_ids.length)throw new CommandError(400,'INVALID_GRANT');
    return {object:g.object,scope:g.scope,properties:g.properties,record_scope:g.record_scope,team_ids:g.team_ids};
  });
  if(new Set(grants.map(g=>g.object)).size!==grants.length)throw new CommandError(400,'INVALID_GRANT');
  if(grants.some(g=>g.scope==='conversations.messages.read')&&!grants.some(g=>g.object==='conversation'&&g.scope==='conversations.read'))throw new CommandError(400,'MISSING_PARENT_GRANT');
  return {name:b.name.trim(),description:b.description,grants,status:b.status};
}
const parseGrants=(v:unknown):AppGrant[]=>typeof v==='string'?JSON.parse(v):v as AppGrant[];
const timestamp=(v:any)=>v===null?null:new Date(v).toISOString();
export function appOutput(row:any){return {id:row.id,name:row.name,description:row.description,grants:parseGrants(row.grants),status:row.status,version:String(row.version),has_token:!!row.token_hash,token_expires_at:timestamp(row.token_expires_at),created_at:timestamp(row.created_at),updated_at:timestamp(row.updated_at)};}

export class ExternalApps {
  readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;
  constructor(source:DataSource,readonly catalog:(scope:TransactionScope)=>Promise<ExternalObject[]>,private readonly ownerDrain?:IdentityPolicyDrain){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  private admin<T>(account:string,tenant:string,work:(s:TransactionScope,actor:string)=>Promise<T>){return this.uow.run({tenantId:tenant},async s=>{const a=await this.auth.loadHuman(s,account,undefined,true);if(!a.superAdmin)throw new CommandError(403,'FORBIDDEN');return work(s,a.principalId);});}
  list(account:string,tenant:string){return this.admin(account,tenant,async s=>({data:(await s.query('SELECT * FROM external_app WHERE tenant_id=? ORDER BY created_at,id LIMIT 100',[tenant])).map(appOutput)}));}
  discover(account:string,tenant:string){return this.admin(account,tenant,async s=>({data:await this.catalog(s),teams:await s.query('SELECT id,name FROM team WHERE tenant_id=? AND active=1 ORDER BY name,id LIMIT 200',[tenant])}));}
  change(account:string,tenant:string,action:'create'|'update'|'token'|'revoke',id:string,input:unknown,version:string|undefined,correlation:string){
    if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');
    if(action!=='create'&&!version)throw new CommandError(428,'PRECONDITION_REQUIRED');
    exactObject(input,action==='token'?['expires_in_days']:action==='revoke'?[]:['name','description','grants','status']);
    const authorize=async(s:TransactionScope)=>{const a=await this.auth.loadHuman(s,account,undefined,true);if(!a.superAdmin)throw new CommandError(403,'FORBIDDEN');return a.principalId;};
    const write=async(s:TransactionScope)=>{
      const actor=await authorize(s);
      const [old]=await s.query('SELECT * FROM external_app WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
      if(action==='create'&&old)throw new CommandError(409,'ALREADY_EXISTS');
      if(action!=='create'&&!old)throw new CommandError(404,'NOT_FOUND');
      if(old&&(String(old.version)!==version||old.status==='revoked'))throw new CommandError(409,'VERSION_CONFLICT');
      let token:string|undefined;
      if(action==='create'||action==='update'){
        const teams=(await s.query('SELECT id FROM team WHERE tenant_id=? AND active=1',[tenant])).map((t:any)=>t.id);
        const config=validateAppConfig(input,await this.catalog(s),teams);
        if(action==='create'){
          const [count]=await s.query('SELECT COUNT(*) n FROM external_app WHERE tenant_id=?',[tenant]);if(Number(count.n)>=100)throw new CommandError(409,'APP_LIMIT');
          await s.query('INSERT INTO external_app(tenant_id,id,name,description,grants,status,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id,config.name,config.description,JSON.stringify(config.grants),config.status]);
        }else await s.query('UPDATE external_app SET name=?,description=?,grants=?,status=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[config.name,config.description,JSON.stringify(config.grants),config.status,tenant,id]);
      }else if(action==='token'){
        const b=exactObject(input,['expires_in_days']),days=b.expires_in_days??90;
        if(!Number.isInteger(days)||days<1||days>365)throw new CommandError(400,'INVALID_REQUEST');
        if(old.status!=='active')throw new CommandError(409,'APP_DISABLED');
        token=`eapi_${tenant}_${id}_${randomBytes(32).toString('base64url')}`;
        await s.query('UPDATE external_app SET token_hash=?,token_expires_at=TIMESTAMPADD(DAY,?,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tokenDigest(token),days,tenant,id]);
      }else{
        exactObject(input,[]);await s.query("UPDATE external_app SET status='revoked',token_hash=NULL,token_expires_at=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[tenant,id]);
      }
      await new DurableCommands().audit(s,actor,correlation,'external_app',id,`external_app.${action}`,action==='token'?['credential']:action==='revoke'?['status','credential']:['name','description','grants','status']);
      const [row]=await s.query('SELECT * FROM external_app WHERE tenant_id=? AND id=?',[tenant,id]);
      return {data:appOutput(row),...(token?{token}: {})};
    };
    // Existing public API deliberately has CAS without response replay. A completed
    // barrier retry reaches the same version conflict, never reissues a token.
    return this.ownerDrain&&action!=='create'
      ? this.ownerDrain.run(tenant,account,`external-app.${action}`,`${id}:${version}`,{id,action,version:version!,input},async s=>{await authorize(s);},write)
      : this.uow.run({tenantId:tenant},write);
  }
  async verify(s:TransactionScope,credential:ReturnType<typeof parseAppToken>){
    await requireActiveTenant(s);
    if(s.context.tenantId!==credential.tenant)throw new CommandError(401,'INVALID_TOKEN');
    const [row]=await s.query('SELECT *,token_expires_at>UTC_TIMESTAMP(6) valid_token FROM external_app WHERE tenant_id=? AND id=? FOR UPDATE',[credential.tenant,credential.id]);
    const expected=typeof row?.token_hash==='string'&&/^[a-f0-9]{64}$/.test(row.token_hash)?row.token_hash:'0'.repeat(64);
    const matches=timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(tokenDigest(credential.token),'hex'));
    if(!matches||!row||row.status!=='active'||Number(row.valid_token)!==1)throw new CommandError(401,'INVALID_TOKEN');
    return row;
  }
  async admit(credential:ReturnType<typeof parseAppToken>){
    return this.uow.run({tenantId:credential.tenant},async s=>{
      const row=await this.verify(s,credential),[clock]=await s.query('SELECT FLOOR(UNIX_TIMESTAMP()/60) minute');
      const minute=Number(clock.minute),count=Number(row.quota_minute)===minute?Number(row.quota_count):0;
      if(count>=120)throw new CommandError(429,'RATE_LIMITED');
      await s.query('UPDATE external_app SET quota_minute=?,quota_count=? WHERE tenant_id=? AND id=?',[minute,count+1,credential.tenant,credential.id]);
    });
  }
}
