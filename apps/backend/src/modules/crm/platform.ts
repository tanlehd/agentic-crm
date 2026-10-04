import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import type { Access } from '../identity/domain/authorization.js';
import { uuid,type PageQuery } from '../identity/admin.js';
import { RecordRegistry } from './registry.js';
import { allows,withFieldPolicies } from './access.js';
import { registryId } from './ids.js';
import { page } from './page.js';
export const standardKeys=['contact','company','lead','deal','ticket','conversation','activity'] as const;
export type MetadataRoute='object-types'|'association-types';
const tables={'object-types':'object_type','association-types':'association_type'} as const;
const reservedKeys=new Set<string>([...standardKeys,'schema','association','membership','role','team','agent','automation','integration','audit']);
const isKey=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(v);
export function validateRegistryInput(route:MetadataRoute|'associations',input:unknown):Record<string,any>{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new CommandError(400,'INVALID_REQUEST');
  const body=input as Record<string,unknown>;
  const keys=route==='object-types'?['key','label']:route==='association-types'?['key','label','source_type','target_type','cardinality']:['type_key','source_record_id','target_record_id'];
  if(Object.keys(body).length!==keys.length||keys.some(k=>!Object.hasOwn(body,k)))throw new CommandError(400,'INVALID_REQUEST');
  for(const [k,v] of Object.entries(body)){
    const valid=k==='label'?typeof v==='string'&&v.trim().length>0&&v.length<=255:k.endsWith('_id')?uuid(v):k==='cardinality'?['many_to_many','one_to_many','one_to_one'].includes(String(v)):isKey(v);
    if(!valid)throw new CommandError(400,'INVALID_REQUEST');
  }
  return body;
}
export class CrmPlatform {
  readonly uow:UnitOfWork;readonly authorization:IdentityAuthorization;readonly registry=new RecordRegistry();
  constructor(source:DataSource,private readonly secret:string|Buffer,private readonly commands=new DurableCommands()) {this.uow=new UnitOfWork(source);this.authorization=new IdentityAuthorization(this.uow);}
  private async type(scope:TransactionScope,key:string){
    const [type]=await scope.query('SELECT * FROM object_type WHERE tenant_id=? AND `key`=? AND archived_at IS NULL',[scope.context.tenantId,key]);
    if(!type)throw new CommandError(404,'NOT_FOUND');return type;
  }
  private entity(route:MetadataRoute,row:any):Record<string,unknown>{
    const common={id:row.id,tenant_id:row.tenant_id,key:row.key,label:row.label,version:String(row.version)};
    return route==='object-types'?{...common,kind:row.kind,schema_version:String(row.schema_version)}:{...common,source_object_type_id:row.source_object_type_id,target_object_type_id:row.target_object_type_id,cardinality:row.cardinality};
  }
  list(account:string,tenant:string,route:MetadataRoute,query:PageQuery){return this.authorization.runHuman(account,tenant,async(scope,access)=>{
    if(!allows(access,'schema','read'))throw new CommandError(403,'FORBIDDEN');
    const p=page(query,{account,tenant,route},this.secret),params:unknown[]=[tenant];let after='';
    if(p.position){after=' AND (created_at>? OR (created_at=? AND id>?))';params.push(p.position.at,p.position.at,p.position.id);}
    const rows=await scope.query(`SELECT *,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s.%f') position FROM ${tables[route]} WHERE tenant_id=?${route==='object-types'?' AND archived_at IS NULL':''}${after} ORDER BY created_at,id LIMIT ${p.limit+1}`,params);
    const visible=rows.slice(0,p.limit);return {data:visible.map((r:any)=>this.entity(route,r)),next_cursor:rows.length>p.limit?p.next(visible.at(-1)):null};
  });}
  async mutate(account:string,tenant:string,route:MetadataRoute|'associations',input:unknown,key:string,version:string|undefined,correlation:string){
    const body=validateRegistryInput(route,input);
    if(!uuid(tenant)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    if(route==='associations'&&!version)throw new CommandError(428,'PRECONDITION_REQUIRED');
    if(version&&!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
    let actor:string|undefined;
    try{return await this.uow.run({tenantId:tenant},async scope=>{
      // M1 mutations serialize with config/receipt writes under the tenant lock;
      // ordered endpoint locks also protect application-port cardinality callers.
      const access=await withFieldPolicies(scope,await this.authorization.loadHuman(scope,account,undefined,true));actor=access.principalId;
      if(route==='associations'){
        if(!allows(access,'association','create')||!allows(access,'association','read'))throw new CommandError(403,'FORBIDDEN');
      }else if(!allows(access,'schema',route==='object-types'?'create':'update')||!allows(access,'schema','read'))throw new CommandError(403,'FORBIDDEN');
      // Serialize equal receipt keys before replay SELECT without upgrading the
      // tenant lock; deterministic source lock also prevents pending-key races.
      if(route==='associations')for(const id of [...new Set<string>([body.source_record_id,body.target_record_id])].sort())await this.registry.get(scope,id,true);
      const command={actorId:access.principalId,correlationId:correlation,route:`POST /api/v1/${route}`,key,body,version};
      const replay=await this.commands.replay(scope,command,async response=>{
        if(response.body.data.tenant_id!==tenant)throw new CommandError(403,'FORBIDDEN');
        if(route==='associations')await this.checkEnds(scope,access,String(response.body.data.source_record_id),String(response.body.data.target_record_id),false);
        else if(!(await scope.query(`SELECT id FROM ${tables[route]} WHERE tenant_id=? AND id=?`,[tenant,response.body.data.id]))[0])throw new CommandError(404,'NOT_FOUND');
      });if(replay)return replay;
      const id=registryId();let data:Record<string,unknown>;
      if(route==='object-types'){
        if(reservedKeys.has(body.key))throw new CommandError(422,'RESERVED_OBJECT_TYPE');
        await scope.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'custom',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,tenant,body.key,body.label]);
        data=this.entity(route,(await scope.query('SELECT * FROM object_type WHERE tenant_id=? AND id=?',[tenant,id]))[0]);
      }else if(route==='association-types'){
        const source=await this.type(scope,body.source_type),target=await this.type(scope,body.target_type);
        await scope.query('INSERT INTO association_type(id,tenant_id,`key`,label,source_object_type_id,target_object_type_id,cardinality,created_at,updated_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,body.key,body.label,source.id,target.id,body.cardinality]);
        data=this.entity(route,(await scope.query('SELECT * FROM association_type WHERE tenant_id=? AND id=?',[tenant,id]))[0]);
      }else{
        const [source,target]=await this.checkEnds(scope,access,body.source_record_id,body.target_record_id,true);
        if(source.archived||target.archived)throw new CommandError(409,'INVALID_TRANSITION');
        const [type]=await scope.query('SELECT * FROM association_type WHERE tenant_id=? AND `key`=?',[tenant,body.type_key]);
        if(!type)throw new CommandError(404,'NOT_FOUND');
        if(type.source_object_type_id!==source.objectTypeId||type.target_object_type_id!==target.objectTypeId)throw new CommandError(422,'ASSOCIATION_TYPE_MISMATCH');
        if((await scope.query('SELECT id FROM association WHERE tenant_id=? AND association_type_id=? AND source_record_id=? AND target_record_id=?',[tenant,type.id,source.id,target.id]))[0])throw new CommandError(409,'ALREADY_EXISTS');
        if(type.cardinality!=='many_to_many'){
          const links=await scope.query(`SELECT id FROM association WHERE tenant_id=? AND association_type_id=? AND (target_record_id=?${type.cardinality==='one_to_one'?' OR source_record_id=?':''}) LIMIT 1`,[tenant,type.id,target.id,...(type.cardinality==='one_to_one'?[source.id]:[])]);
          if(links.length)throw new CommandError(409,'CARDINALITY_CONFLICT');
        }
        await this.registry.bump(scope,source,version!);
        await scope.query('INSERT INTO association(id,tenant_id,association_type_id,source_record_id,target_record_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[id,tenant,type.id,source.id,target.id]);
        data={id,tenant_id:tenant,association_type_id:type.id,source_record_id:source.id,target_record_id:target.id,source_version:String(BigInt(source.version)+1n)};
      }
      const response={status:201,body:{data,meta:{correlation_id:correlation}}};
      await this.commands.audit(scope,access.principalId,correlation,route,id,'create',Object.keys(body));
      await this.commands.complete(scope,command,response);return response;
    });}catch(error){
      if(actor&&error instanceof CommandError&&[403,409].includes(error.status))await this.uow.run({tenantId:tenant},scope=>this.commands.audit(scope,actor!,correlation,route,null,'create',[],'denied',error.code));
      if((error as {code?:string}).code==='ER_DUP_ENTRY')throw new CommandError(409,'ALREADY_EXISTS');
      throw error;
    }
  }
  private async checkEnds(scope:TransactionScope,access:Access,sourceId:string,targetId:string,update:boolean){
    const source=await this.registry.get(scope,sourceId),target=sourceId===targetId?source:await this.registry.get(scope,targetId);
    this.registry.read(access,source);this.registry.read(access,target);
    if(update&&!allows(access,source.objectKey,'update',source))throw new CommandError(403,'FORBIDDEN');
    return [source,target] as const;
  }
  associations(account:string,tenant:string,id:string,query:PageQuery){return this.authorization.runHuman(account,tenant,async(scope,access)=>{
    if(!allows(access,'association','read'))throw new CommandError(403,'FORBIDDEN');
    this.registry.read(access,await this.registry.get(scope,id));
    const p=page(query,{account,tenant,route:'associations',id},this.secret),visible:any[]=[];let position=p.position;
    // Scan bounded batches until enough authorized results; never emit a cursor
    // derived from hidden rows or report their count.
    while(visible.length<=p.limit){
      const params:unknown[]=[tenant,id,id];let after='';
      if(position){after=' AND (created_at>? OR (created_at=? AND id>?))';params.push(position.at,position.at,position.id);}
      const rows=await scope.query(`SELECT *,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s.%f') position FROM association WHERE tenant_id=? AND (source_record_id=? OR target_record_id=?)${after} ORDER BY created_at,id LIMIT 100`,params);
      for(const row of rows){
        const source=await this.registry.get(scope,row.source_record_id),target=await this.registry.get(scope,row.target_record_id);
        if(allows(access,source.objectKey,'read',source)&&allows(access,target.objectKey,'read',target))visible.push(row);
        if(visible.length>p.limit)break;
      }
      if(rows.length<100||visible.length>p.limit)break;
      const last=rows.at(-1);position={at:last.position,id:last.id};
    }
    return {data:visible.slice(0,p.limit).map(r=>({id:r.id,tenant_id:tenant,association_type_id:r.association_type_id,source_record_id:r.source_record_id,target_record_id:r.target_record_id})),next_cursor:visible.length>p.limit?p.next(visible[p.limit-1]):null};
  });}
}
