import {stageCatalog} from './stage-catalog.js';
import { createPool,type PoolConnection,type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { canonical } from './registry.js';
import {operationsCatalog} from './operations-catalog.js';
import { catalogV1 } from './catalog.js';
import { assertAdmission,hash,StorageError,validateOperation,type Admission,type Operation } from './storage-security.js';

type Row=RowDataPacket&Record<string,any>;
async function rows(c:PoolConnection,sql:string,args:(string|number|boolean)[]=[]):Promise<Row[]>{const [r]=await c.execute<Row[]>(sql,args);return r;}
function parsed(v:unknown):any{return typeof v==='string'?JSON.parse(v):v;}
const catalog=canonical(catalogV1),catalogHash=hash(catalog);
function commandId(a:Admission,key:string){const h=hash(JSON.stringify([a.tenantId,a.principalId,key]));return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
function next(value:string){const n=BigInt(value)+1n;if(n>9999999999999999n)throw new StorageError(409,'VERSION_EXHAUSTED');return String(n);}
export class ReportingStore {
 readonly pool;
 constructor(env:NodeJS.ProcessEnv){
  for(const key of ['REPORTING_DB_HOST','REPORTING_DB_PORT','REPORTING_DB_NAME','REPORTING_RUNTIME_USER','REPORTING_RUNTIME_PASSWORD'])if(!env[key])throw new Error('REPORTING_DATABASE_CONFIG_REQUIRED');
  if(!['crm_reporting','test_crm_reporting'].includes(env.REPORTING_DB_NAME!))throw new Error('REPORTING_DATABASE_DENIED');
  this.pool=createPool({host:env.REPORTING_DB_HOST,port:Number(env.REPORTING_DB_PORT),database:env.REPORTING_DB_NAME,user:env.REPORTING_RUNTIME_USER,password:env.REPORTING_RUNTIME_PASSWORD,connectionLimit:8,supportBigNumbers:true,bigNumberStrings:true,dateStrings:true,timezone:'Z',multipleStatements:false});
 }
 private permission(a:Admission,row:Row,mutation=false){const scope=mutation?a.designScope:a.readScope;if(scope==='none'||scope==='own'&&row.owner_principal_id!==a.principalId)throw new StorageError(404,'NOT_FOUND');}
 private async head(c:PoolConnection,a:Admission,id:string,lock=false){const [r]=await rows(c,`SELECT * FROM report_definition WHERE tenant_id=? AND id=? ${lock?'FOR UPDATE':''}`,[a.tenantId,id]);if(!r)throw new StorageError(404,'NOT_FOUND');return r;}
 private async view(c:PoolConnection,a:Admission,row:Row,version=String(row.latest_version)){
  this.permission(a,row);const [v]=await rows(c,'SELECT * FROM report_version WHERE tenant_id=? AND report_id=? AND version=?',[a.tenantId,row.id,version]);if(!v)throw new StorageError(404,'NOT_FOUND');
  return {id:row.id,owner_principal_id:row.owner_principal_id,name:v.name,revision:String(row.revision),latest_version:String(row.latest_version),version:String(v.version),archived:Boolean(row.archived),definition:parsed(v.definition),catalog_hash:v.catalog_hash,validation_state:'unvalidated',execution_enabled:false};
 }
 async execute(a:Admission,input:unknown,raw=JSON.stringify(input)){
  assertAdmission(a);const op=validateOperation(input);if(a.bodyHash!==hash(raw)||JSON.stringify(JSON.parse(raw))!==JSON.stringify(input))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');
  const mutation=['create','update','archive'].includes(op.kind);if(a.readScope==='none'||mutation&&a.designScope==='none')throw new StorageError(403,'FORBIDDEN');
  const c=await this.pool.getConnection();
  try{
   await c.query("SET SESSION time_zone='+00:00'");await c.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");await c.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
   let result:unknown;
   if(mutation)result=await this.mutate(c,a,op);
   else if(op.kind==='list'){
    const limit=op.limit??50;const args:(string|number)[]=[a.tenantId,op.after??''];if(a.readScope==='own')args.push(a.principalId);
    const data=await rows(c,`SELECT id,name,owner_principal_id,revision,latest_version,archived FROM report_definition WHERE tenant_id=? AND id>? ${a.readScope==='own'?'AND owner_principal_id=?':''} ORDER BY id LIMIT ${limit+1}`,args);
    result={items:data.slice(0,limit).map(r=>({...r,revision:String(r.revision),latest_version:String(r.latest_version),archived:Boolean(r.archived)})),next_after:data.length>limit?data[limit-1]!.id:null};
   }else result=await this.view(c,a,await this.head(c,a,op.id!),op.kind==='version'?op.version:undefined);
   assertAdmission(a);await c.commit();return result;
  }catch(e){await c.rollback();if(e instanceof StorageError)throw e;const code=(e as {code?:string}).code;if(code==='ER_DUP_ENTRY')throw new StorageError(409,'IDEMPOTENCY_CONFLICT');throw new StorageError(503,'STORAGE_UNAVAILABLE');}
  finally{c.release();}
 }
 async mutate(c:PoolConnection,a:Admission,op:Operation){
  const id=op.kind==='create'?commandId(a,op.key!):op.id!,requestHash=hash(canonical(op));
  if(op.kind==='create')await c.execute('INSERT INTO report_definition (tenant_id,id,owner_principal_id,name,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[a.tenantId,id,a.principalId,op.body!.name!]);
  const head=await this.head(c,a,id,true);this.permission(a,head,true);this.permission(a,head);
  const [old]=await rows(c,'SELECT request_hash,result FROM report_command_receipt WHERE tenant_id=? AND principal_id=? AND command_id=?',[a.tenantId,a.principalId,op.key!]);
  if(old){if(old.request_hash!==requestHash)throw new StorageError(409,'IDEMPOTENCY_CONFLICT');return parsed(old.result);}
  if(op.kind!=='create'&&String(head.revision)!==op.expectedRevision)throw new StorageError(409,'VERSION_CONFLICT');
  if(op.kind==='update'&&head.archived)throw new StorageError(409,'REPORT_ARCHIVED');
  let revision=String(head.revision),version=String(head.latest_version);
  if(op.kind!=='create'){revision=next(revision);if(op.kind==='update')version=next(version);}
  if(op.kind!=='archive'){
   const selected=operationsCatalog().catalog,stage=stageCatalog();const definition=op.body!.definition as any;const catalog=canonical(stage.models.some(m=>m.id===definition?.model?.id)?stage:selected.models.some(m=>m.id===definition?.model?.id)?selected:catalogV1),catalogHash=hash(catalog);
   await c.execute('INSERT IGNORE INTO report_catalog_version (tenant_id,hash,payload,created_at) VALUES (?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,catalogHash,catalog]);
   await c.execute('INSERT INTO report_version (tenant_id,report_id,version,name,definition,catalog_hash,created_by,created_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,id,version,op.body!.name!,JSON.stringify(op.body!.definition),catalogHash,a.principalId]);
  }
  await c.execute('UPDATE report_definition SET name=?,revision=?,latest_version=?,archived=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[op.body!.name??head.name,revision,version,op.kind==='archive'?op.body!.archived:head.archived,a.tenantId,id]);
  const eventId=randomUUID();await c.execute('INSERT INTO report_audit_entry (tenant_id,id,report_id,actor_id,action,revision,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,eventId,id,a.principalId,op.kind,revision]);
  await c.execute('INSERT INTO report_outbox_event (tenant_id,id,report_id,event_type,aggregate_revision,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,eventId,id,'report.definition.'+op.kind+'.v1',revision]);
  const result=await this.view(c,a,await this.head(c,a,id));
  await c.execute('INSERT INTO report_command_receipt (tenant_id,principal_id,command_id,request_hash,report_id,result,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,a.principalId,op.key!,requestHash,id,JSON.stringify(result)]);
  return result;
 }
 async close(){await this.pool.end();}
}
