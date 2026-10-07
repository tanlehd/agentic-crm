import { createHmac,timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { canonical,CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { fieldAllowed,type Access } from '../identity/domain/authorization.js';
import { uuid } from '../identity/admin.js';
import { RecordRegistry,type RegistryRecord,type SubtypeAdapter } from './registry.js';
import { allows,withFieldPolicies } from './access.js';
import { standardFields,type ArchiveGuard } from './core.js';
import { registryId } from './ids.js';
import { object,validKey,properties,propertyInput,mergeValues,project,json,checkField,queryPlan,column,sqlValue,type Property } from './properties.js';
import { notifyConversationNote } from './activity-port.js';
export interface RecordDomain {
  genericCreate?:boolean;
  allowCustomValues?:boolean;
  updateAction?:string;
  adapter:SubtypeAdapter;
  read(scope:TransactionScope,record:RegistryRecord):Promise<Record<string,unknown>>;
  update(scope:TransactionScope,record:RegistryRecord,fields:Record<string,unknown>,access:Access):Promise<void>;
  archive(scope:TransactionScope,record:RegistryRecord):Promise<void>;
}
export type RecordRoute={object:string;kind:'properties'|'forms'|'views'|'records'|'archive';id?:string};
export class CrmRecords {
  readonly uow:UnitOfWork;readonly authorization:IdentityAuthorization;
  constructor(source:DataSource,private readonly secret:string|Buffer,private readonly domains:ReadonlyMap<string,RecordDomain>=new Map(),private readonly commands=new DurableCommands(),private readonly archiveGuards:readonly ArchiveGuard[]=[]){
    this.uow=new UnitOfWork(source);this.authorization=new IdentityAuthorization(this.uow);
  }
  registry(key:string,custom:boolean){
    const adapter:SubtypeAdapter={insert:async(s,id,input)=>{if(Object.keys(object(input)).length)throw new CommandError(422,'VALIDATION_FAILED');await s.query('INSERT INTO custom_record VALUES (?,?)',[s.context.tenantId,id]);},exists:async(s,id)=>!!(await s.query('SELECT record_id FROM custom_record WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]))[0],eligible:async()=>{},assigned:async()=>{}};
    return new RecordRegistry(new Map(custom?[[key,adapter]]:this.domains.has(key)?[[key,this.domains.get(key)!.adapter]]:[]));
  }
  async type(scope:TransactionScope,key:string){if(!validKey(key))throw new CommandError(400,'INVALID_REQUEST');const [t]=await scope.query('SELECT * FROM object_type WHERE tenant_id=? AND `key`=? AND archived_at IS NULL',[scope.context.tenantId,key]);if(!t)throw new CommandError(404,'NOT_FOUND');return t;}
  private authorizeSchema(access:Access,write=false){if(!allows(access,'schema','read')||write&&!allows(access,'schema','update'))throw new CommandError(403,'FORBIDDEN');}
  async output(scope:TransactionScope,access:Access,record:RegistryRecord){
    new RecordRegistry().read(access,record);
    const [row]=await scope.query('SELECT custom_values FROM crm_record WHERE tenant_id=? AND id=?',[scope.context.tenantId,record.id]);
    const redact=(values:Record<string,unknown>)=>Object.fromEntries(Object.entries(values).filter(([k])=>fieldAllowed(access,record.objectKey,k,'read')));
    const fields=record.kind==='custom'?{}:await this.domains.get(record.objectKey)?.read(scope,record);
    if(!fields)throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');
    return {id:record.id,tenant_id:record.tenantId,object_key:record.objectKey,version:record.version,owner_revision:record.ownerRevision,owner_principal_id:record.ownerPrincipalId,team_id:record.teamId,archived:record.archived,fields:redact(fields),custom_values:redact(json(row.custom_values))};
  }
  private async record(scope:TransactionScope,access:Access,key:string,id:string,lock=false){if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');const r=await new RecordRegistry().get(scope,id,lock);if(r.objectKey!==key)throw new CommandError(404,'NOT_FOUND');new RecordRegistry().read(access,r);return r;}
  read(account:string,tenant:string,route:RecordRoute,query:Record<string,unknown>={}){return this.authorization.runHuman(account,tenant,async(scope,raw)=>{
    const access=await withFieldPolicies(scope,raw),type=await this.type(scope,route.object),defs=await properties(scope,type.id);
    if(route.kind==='records'){
      if(route.id)return {data:await this.output(scope,access,await this.record(scope,access,route.object,route.id))};
      return this.list(scope,access,type,[...(standardFields[route.object]??[]),...defs],account,query);
    }
    this.authorizeSchema(access);
    if(route.kind==='properties')return {data:defs.filter(p=>fieldAllowed(access,route.object,p.key,'read')),next_cursor:null};
    if(route.kind==='forms'||route.kind==='views'){
      if(!validKey(route.id))throw new CommandError(400,'INVALID_REQUEST');
      const table=route.kind==='forms'?'form_definition':'view_definition';
      const [row]=await scope.query(`SELECT * FROM ${table} WHERE tenant_id=? AND object_type_id=? AND \`key\`=?`,[tenant,type.id,route.id]);if(!row)throw new CommandError(404,'NOT_FOUND');
      return {data:this.configOutput(route.kind,row,[...(standardFields[route.object]??[]),...defs],access,route.object)};
    }
    throw new CommandError(400,'INVALID_REQUEST');
  });}
  private configOutput(kind:'forms'|'views',row:any,defs:Property[],access:Access,key:string){
    const fields=(json(kind==='forms'?row.fields:row.columns) as string[]).filter(k=>fieldAllowed(access,key,k,'read'));
    return {id:row.id,key:row.key,version:String(row.version),...(kind==='forms'?{fields}:{columns:fields,filter:queryPlan(defs,access,key,json(row.filter),row.sort===null?null:json(row.sort)).predicates,sort:row.sort===null?null:json(row.sort)})};
  }
  async mutate(account:string,tenant:string,route:RecordRoute,input:unknown,key:string,version:string|undefined,correlation:string,domainCreate=false){
    if(!key||key.length>128||!/^[\x21-\x7e]+$/.test(key)||version!==undefined&&!/^[1-9][0-9]{0,19}$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
    const body=object(input);let actor:string|undefined;
    const method=route.kind==='forms'||route.kind==='views'?'PUT':route.id&&route.kind!=='archive'?'PATCH':'POST';
    try{return await this.uow.run({tenantId:tenant},async scope=>{
      const access=await withFieldPolicies(scope,await this.authorization.loadHuman(scope,account,undefined,true));actor=access.principalId;
      const type=await this.type(scope,route.object),defs=await properties(scope,type.id);
      if(route.kind!=='records'&&route.kind!=='archive')this.authorizeSchema(access,true);
      const queryDefs=[...(standardFields[route.object]??[]),...defs];
      const command={actorId:access.principalId,correlationId:correlation,route:domainCreate?'POST /api/v1/leads':`${method} /api/v1/${route.kind==='records'||route.kind==='archive'?'objects':'object-types'}/${route.object}/${route.kind==='archive'?'records':route.kind}${route.id?'/'+route.id:''}${route.kind==='archive'?'/archive':''}`,key,body,version};
      const replay=await this.commands.replay(scope,command,async response=>{
        if(route.kind==='records'||route.kind==='archive'){
          await this.record(scope,access,route.object,String(response.body.data.id));
          for(const k of [...Object.keys(object(response.body.data.fields)),...Object.keys(object(response.body.data.custom_values))])checkField(access,route.object,k,'read');
        }else if(route.kind==='properties'){checkField(access,route.object,String(response.body.data.key),'read');}
        else {
          const data=response.body.data;
          for(const k of (data.fields??data.columns) as string[])checkField(access,route.object,k,'read');
          if(route.kind==='views')queryPlan(queryDefs,access,route.object,data.filter,data.sort);
        }
      });if(replay)return replay;
      let data:Record<string,unknown>;let status=200;
      const needVersion=()=>{if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');};
      if(route.kind==='properties'){
        needVersion();
        if(route.id){
          const b=object(body,['label']);if(typeof b.label!=='string'||!b.label.trim()||b.label.length>255)throw new CommandError(400,'INVALID_REQUEST');
          const p=defs.find(p=>p.key===route.id);if(!p)throw new CommandError(404,'NOT_FOUND');checkField(access,route.object,p.key,'write');checkField(access,route.object,p.key,'read');
          const result=await scope.query('UPDATE property_definition SET label=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=? AND version=?',[b.label,tenant,p.id,version]);if(result.affectedRows!==1)throw new CommandError(409,'VERSION_CONFLICT');
          data={...p,label:b.label,version:String(BigInt(p.version)+1n)};
        }else{
          const p=propertyInput(body);checkField(access,route.object,p.key,'write');checkField(access,route.object,p.key,'read');
          if(String(type.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');
          if(p.required&&(await scope.query('SELECT id FROM crm_record WHERE tenant_id=? AND object_type_id=? LIMIT 1',[tenant,type.id])).length)throw new CommandError(422,'REQUIRED_PROPERTY_REQUIRES_EMPTY_OBJECT');
          const id=registryId();await scope.query('INSERT INTO property_definition(id,tenant_id,object_type_id,`key`,label,type,required,default_value,options,indexed,`sensitive`,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id,tenant,type.id,p.key,p.label,p.type,p.required,p.default_value===null?null:JSON.stringify(p.default_value),p.options===null?null:JSON.stringify(p.options),p.indexed,p.sensitive]);
          data={...p,id,version:'1'};status=201;
        }
        await scope.query('UPDATE object_type SET version=version+1,schema_version=schema_version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,type.id]);
      }else if(route.kind==='forms'||route.kind==='views'){
        if(!validKey(route.id))throw new CommandError(400,'INVALID_REQUEST');
        const form=route.kind==='forms',b=object(body,form?['fields']:['columns','filter','sort']),keys=b[form?'fields':'columns'];
        if(!Array.isArray(keys)||keys.length>100||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!queryDefs.some(p=>p.key===k)))throw new CommandError(422,'VALIDATION_FAILED');
        for(const k of keys)checkField(access,route.object,k,'read');
        if(!form&&(!Object.hasOwn(b,'filter')||!Object.hasOwn(b,'sort')))throw new CommandError(400,'INVALID_REQUEST');
        const plan=form?null:queryPlan(queryDefs,access,route.object,b.filter,b.sort);
        const table=form?'form_definition':'view_definition';
        const [old]=await scope.query(`SELECT * FROM ${table} WHERE tenant_id=? AND object_type_id=? AND \`key\`=?`,[tenant,type.id,route.id]);
        if(old){needVersion();if(String(old.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');
          await scope.query(`UPDATE ${table} SET ${form?'fields=?':'columns=?,filter=?,sort=?'},version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,[JSON.stringify(keys),...(form?[]:[JSON.stringify(plan!.predicates),JSON.stringify(plan!.order)]),tenant,old.id]);
        }else{
          if(version)throw new CommandError(409,'VERSION_CONFLICT');status=201;
          await scope.query(`INSERT INTO ${table}(id,tenant_id,object_type_id,\`key\`,${form?'fields':'columns,filter,sort'},created_at,updated_at) VALUES (?,?,?,?,${form?'?':'?,?,?'},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[registryId(),tenant,type.id,route.id,JSON.stringify(keys),...(form?[]:[JSON.stringify(plan!.predicates),JSON.stringify(plan!.order)])]);
        }
        const [row]=await scope.query(`SELECT * FROM ${table} WHERE tenant_id=? AND object_type_id=? AND \`key\`=?`,[tenant,type.id,route.id]);data=this.configOutput(route.kind,row,[...(standardFields[route.object]??[]),...defs],access,route.object);
      }else{
        if(type.kind!=='custom'&&!this.domains.has(route.object))throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');
        const domain=this.domains.get(route.object);
        if(domain?.allowCustomValues===false&&Object.hasOwn(body,'custom_values'))throw new CommandError(400,'INVALID_REQUEST');
        const registry=this.registry(route.object,type.kind==='custom');let record:RegistryRecord;
        if(!route.id){
          if(domain?.genericCreate===false&&!domainCreate)throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');
          const b=object(body,['fields','custom_values','team_id']);if(b.team_id!==undefined&&b.team_id!==null&&!uuid(b.team_id))throw new CommandError(400,'INVALID_REQUEST');
          const fields=object(b.fields??{});for(const k of Object.keys(fields))checkField(access,route.object,k,'write');
          const values=mergeValues(defs,{},b.custom_values??{},access,route.object,true);
          record=await registry.create(scope,access,route.object,fields,b.team_id??null,correlation);
          await scope.query('UPDATE crm_record SET custom_values=? WHERE tenant_id=? AND id=?',[JSON.stringify(values),tenant,record.id]);await project(scope,record.id,defs,values);status=201;
        }else{
          needVersion();record=await this.record(scope,access,route.object,route.id,true);
          const action=route.kind==='archive'?'archive':domain?.updateAction??'update';if(!allows(access,route.object,action,record))throw new CommandError(403,'FORBIDDEN');if(record.archived)throw new CommandError(409,'INVALID_TRANSITION');
          if(route.kind==='archive'){
            const b=object(body,['reason']);if(typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>1000)throw new CommandError(400,'INVALID_REQUEST');
            await this.domains.get(route.object)?.archive(scope,record);
            for(const guard of this.archiveGuards)await guard(scope,record);
            await registry.bump(scope,record,version!);await scope.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,record.id]);
          }else{
            const b=object(body,['fields','custom_values']);if(!Object.keys(b).length)throw new CommandError(400,'INVALID_REQUEST');
            const fields=object(b.fields??{});for(const k of Object.keys(fields))checkField(access,route.object,k,'write');
            const [row]=await scope.query('SELECT custom_values FROM crm_record WHERE tenant_id=? AND id=?',[tenant,record.id]);const values=mergeValues(defs,json(row.custom_values),b.custom_values??{},access,route.object);
            await registry.update(scope,access,record.id,version!,async s=>{
              if(type.kind==='custom'&&Object.keys(fields).length)throw new CommandError(422,'VALIDATION_FAILED');
              if(type.kind!=='custom')await this.domains.get(route.object)!.update(s,record,fields,access);
              await s.query('UPDATE crm_record SET custom_values=? WHERE tenant_id=? AND id=?',[JSON.stringify(values),tenant,record.id]);await project(s,record.id,defs,values);
            },action);
          }
          record=await registry.get(scope,record.id);
        }
        if(route.object==='activity')await notifyConversationNote(scope,record.id,route.kind==='archive'?'archived':route.id?'updated':'created',{kind:'human',id:access.principalId});
        data=await this.output(scope,access,record);
      }
      await this.commands.audit(scope,access.principalId,correlation,route.object,String(data.id),`${route.kind}.${method.toLowerCase()}`,Object.keys(body));
      const response={status,body:{data,meta:{correlation_id:correlation}}};await this.commands.complete(scope,command,response);return response;
    });}catch(error){
      if(actor&&error instanceof CommandError&&[403,409].includes(error.status))await this.uow.run({tenantId:tenant},scope=>this.commands.audit(scope,actor!,correlation,route.object,null,route.kind,[],'denied',error.code));
      if((error as {code?:string}).code==='ER_DUP_ENTRY')throw new CommandError(409,'ALREADY_EXISTS');throw error;
    }
  }
  private async list(scope:TransactionScope,access:Access,type:any,defs:Property[],account:string,query:Record<string,unknown>){
    if(Object.keys(query).some(k=>!['limit','cursor','filter','sort','owner','team'].includes(k)))throw new CommandError(400,'INVALID_REQUEST');
    if(!access.capabilities.includes('read')||!access.grants.some(g=>g.resource===type.key&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
    const parse=(v:unknown,fallback:unknown)=>{if(v===undefined)return fallback;if(typeof v!=='string')throw new CommandError(400,'INVALID_REQUEST');try{return JSON.parse(v);}catch{throw new CommandError(400,'INVALID_REQUEST');}};
    const plan=queryPlan(defs,access,type.key,parse(query.filter,[]),parse(query.sort,null));
    const limit=query.limit===undefined?50:Number(query.limit);if(!Number.isInteger(limit)||limit<1||limit>100||typeof query.limit==='object')throw new CommandError(400,'INVALID_REQUEST');
    for(const key of ['owner','team'])if(query[key]!==undefined&&query[key]!=='unassigned'&&!uuid(query[key]))throw new CommandError(400,'INVALID_REQUEST');
    const binding={account,tenant:scope.context.tenantId,object:type.key,filter:plan.predicates,sort:plan.order,owner:query.owner??null,team:query.team??null};
    let position:{id:string;value:unknown}|undefined;
    if(query.cursor!==undefined){
      if(typeof query.cursor!=='string'||query.cursor.length>8192)throw new CommandError(400,'INVALID_CURSOR');
      const [payload,sig,...extra]=query.cursor.split('.'),expected=createHmac('sha256',this.secret).update(payload??'').digest('base64url');
      if(!sig||extra.length||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new CommandError(400,'INVALID_CURSOR');
      try{const decoded=JSON.parse(Buffer.from(payload!,'base64url').toString());if(canonical(decoded.binding)!==canonical(binding)||!uuid(decoded.position.id)||!Object.hasOwn(decoded.position,'value'))throw new Error();position=decoded.position;}catch{throw new CommandError(400,'INVALID_CURSOR');}
    }
    const sortProp=plan.order?plan.find(plan.order.field):null,sortExpr=sortProp?sortProp.id.startsWith('standard:')?`standard_sort.\`${sortProp.key}\``:`sort_value.${column(sortProp)}`:'r.created_at',direction=plan.order?.direction==='desc'?'DESC':'ASC',cmp=direction==='DESC'?'<':'>';
    const baseParams:unknown[]=[];
    const join=sortProp?sortProp.id.startsWith('standard:')?` LEFT JOIN \`${type.key}\` standard_sort ON standard_sort.tenant_id=r.tenant_id AND standard_sort.record_id=r.id`:' LEFT JOIN property_index_value sort_value ON sort_value.tenant_id=r.tenant_id AND sort_value.record_id=r.id AND sort_value.property_id=?':'';
    if(sortProp&&!sortProp.id.startsWith('standard:'))baseParams.push(sortProp.id);baseParams.push(scope.context.tenantId,type.id);
    let predicates='';
    for(const key of ['owner','team'])if(query[key]!==undefined){const col=key==='owner'?'owner_principal_id':'team_id';if(query[key]==='unassigned')predicates+=` AND r.${col} IS NULL`;else {predicates+=` AND r.${col}=?`;baseParams.push(query[key]);}}
    for(const f of plan.predicates){const p=plan.find(f.field),standard=p.id.startsWith('standard:');const vals=f.op==='in'?f.value as unknown[]:[f.value];predicates+=` AND EXISTS (SELECT 1 FROM ${standard?'`'+type.key+'`':'property_index_value'} i WHERE i.tenant_id=r.tenant_id AND i.${standard?'record_id':'record_id'}=r.id${standard?'':' AND i.property_id=?'} AND i.${standard?'`'+p.key+'`':column(p)} ${f.op==='in'?`IN (${vals.map(()=>'?').join(',')})`:`${{eq:'=',gte:'>=',lte:'<='}[f.op]} ?`})`;baseParams.push(...(standard?[]:[p.id]),...vals.map(v=>sqlValue(p,v)));}
    const visible:any[]=[];
    while(visible.length<=limit){
      const params=[...baseParams];let after='';
      if(position){
        if(position.value===null){after=direction==='ASC'?` AND ((${sortExpr} IS NULL AND r.id>?) OR ${sortExpr} IS NOT NULL)`:` AND ${sortExpr} IS NULL AND r.id<?`;params.push(position.id);}
        else {after=` AND (${sortExpr}${cmp}? OR (${sortExpr}=? AND r.id${cmp}?)${direction==='DESC'?` OR ${sortExpr} IS NULL`:''})`;params.push(position.value,position.value,position.id);}
      }
      const select=sortProp&&['datetime','date'].includes(sortProp.type)?`DATE_FORMAT(${sortExpr},'${sortProp.type==='date'?'%Y-%m-%d':'%Y-%m-%d %H:%i:%s.%f'}')`:sortProp?sortExpr:`DATE_FORMAT(${sortExpr},'%Y-%m-%d %H:%i:%s.%f')`;
      const rows=await scope.query(`SELECT r.id,${select} sort_position FROM crm_record r${join} WHERE r.tenant_id=? AND r.object_type_id=? AND r.archived_at IS NULL${predicates}${after} ORDER BY ${sortExpr} ${direction},r.id ${direction} LIMIT 100`,params);
      for(const row of rows){const record=await new RecordRegistry().get(scope,row.id);if(allows(access,type.key,'read',record))visible.push({data:await this.output(scope,access,record),position:{id:row.id,value:row.sort_position}});if(visible.length>limit)break;}
      if(rows.length<100||visible.length>limit)break;const last=rows.at(-1);position={id:last.id,value:last.sort_position};
    }
    let cursor:string|null=null;if(visible.length>limit){const payload=Buffer.from(JSON.stringify({binding,position:visible[limit-1].position})).toString('base64url');cursor=`${payload}.${createHmac('sha256',this.secret).update(payload).digest('base64url')}`;}
    return {data:visible.slice(0,limit).map(v=>v.data),next_cursor:cursor};
  }
}
