import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {assertRunAdmission,type RunAdmission} from './runs-security.js';
import {StorageError} from './storage-security.js';
import {digest} from './registry.js';
import type {QueryResult} from './query.js';
export const executorVersion='mock-query-v1';
type Row=RowDataPacket&Record<string,any>;
const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const select=async(c:PoolConnection,sql:string,args:(string|number)[])=> (await c.execute<Row[]>(sql,args))[0];
export function runId(a:RunAdmission,key:string){const h=digest([a.tenantId,a.principalId,key]);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export class ReportingRunStore{
 constructor(private readonly pool:Pool){}
 private async transaction<T>(a:RunAdmission,work:(c:PoolConnection)=>Promise<T>):Promise<T>{assertRunAdmission(a);const c=await this.pool.getConnection();try{await c.query("SET SESSION time_zone='+00:00'");await c.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();assertRunAdmission(a);const result=await work(c);assertRunAdmission(a);await c.commit();return result;}catch(e){await c.rollback();if(e instanceof StorageError)throw e;throw new StorageError(503,'RUN_STORAGE_UNAVAILABLE');}finally{c.release();}}
 private async row(c:PoolConnection,a:RunAdmission,id:string,optional=false){const [r]=await select(c,'SELECT * FROM report_query_run WHERE tenant_id=? AND id=? AND owner_principal_id=? FOR UPDATE',[a.tenantId,id,a.principalId]);assertRunAdmission(a);if(!r){if(optional)return undefined;throw new StorageError(404,'RUN_NOT_FOUND');}const [clock]=await select(c,'SELECT expires_at<=UTC_TIMESTAMP(6) expired,lease_until<=UTC_TIMESTAMP(6) lease_expired FROM report_query_run WHERE tenant_id=? AND id=?',[a.tenantId,id]);if(Number(clock!.expired)===1)throw new StorageError(410,'RUN_EXPIRED');r.lease_expired=Number(clock!.lease_expired)===1;return r;}
 view(r:Row){return {environment:'mock' as const,id:r.id,owner_principal_id:r.owner_principal_id,binding_id:r.binding_id,generation_id:r.generation_id,executor_version:r.executor_version,state:r.state,version:String(r.version),attempt:Number(r.attempt),error_code:r.error_code??null,created_at:r.created_at,updated_at:r.updated_at,expires_at:r.expires_at};}
 private async event(c:PoolConnection,a:RunAdmission,r:Row){await c.execute('INSERT INTO report_query_run_event VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,r.id,r.version,r.state,r.attempt]);}
 async lookup(a:RunAdmission,key:string,requestHash:string){return this.transaction(a,async c=>{const r=await this.row(c,a,runId(a,key),true);if(r&&r.request_hash!==requestHash)throw new StorageError(409,'IDEMPOTENCY_CONFLICT');return r?this.view(r):undefined;});}
 async create(a:RunAdmission,key:string,requestHash:string,definition:Record<string,unknown>&{bindingId:string},generation:string){return this.transaction(a,async c=>{
  const id=runId(a,key);await c.execute("INSERT INTO report_query_run (tenant_id,id,owner_principal_id,request_key,request_hash,binding_id,generation_id,executor_version,definition,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 24 HOUR)) ON DUPLICATE KEY UPDATE id=id",[a.tenantId,id,a.principalId,key,requestHash,definition.bindingId,generation,executorVersion,JSON.stringify(definition)]);
  const r=(await this.row(c,a,id))!;if(r.request_hash!==requestHash)throw new StorageError(409,'IDEMPOTENCY_CONFLICT');const [event]=await select(c,'SELECT version FROM report_query_run_event WHERE tenant_id=? AND run_id=? LIMIT 1',[a.tenantId,id]);if(!event)await this.event(c,a,r);return this.view(r);
 });}
 async read(a:RunAdmission,id:string){return this.transaction(a,async c=>{const r=(await this.row(c,a,id))!;return {meta:this.view(r),definition:parse(r.definition) as Record<string,unknown>&{bindingId:string},result:parse(r.result) as QueryResult|null};});}
 async claim(a:RunAdmission,id:string){return this.transaction(a,async c=>{
  let r=(await this.row(c,a,id))!;if(['completed','failed','cancelled'].includes(r.state))return {meta:this.view(r),claimed:false};if(r.executor_version!==executorVersion)throw new StorageError(409,'EXECUTOR_VERSION_UNSUPPORTED');if(r.state==='running'&&!r.lease_expired)throw new StorageError(409,'RUN_BUSY');
  await c.execute("UPDATE report_query_run SET state='running',version=version+1,attempt=attempt+1,lease_until=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 15 SECOND),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[a.tenantId,id]);r=(await this.row(c,a,id))!;await this.event(c,a,r);return {meta:this.view(r),claimed:true};
 });}
 async finish(a:RunAdmission,id:string,attempt:number,result:QueryResult|null,error:string|null=null){return this.transaction(a,async c=>{
  const r=(await this.row(c,a,id))!;if(r.state!=='running'||Number(r.attempt)!==attempt||r.lease_expired)throw new StorageError(409,'RUN_FENCE_LOST');
  if(result){if(Buffer.byteLength(JSON.stringify(result))>2097152||result.snapshotId!==r.generation_id)throw new StorageError(400,'RUN_RESULT_INVALID');}else if(!error||!/^[A-Z_]{1,64}$/.test(error))throw new StorageError(400,'RUN_RESULT_INVALID');
  await c.execute('UPDATE report_query_run SET state=?,result=?,error_code=?,lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[result?'completed':'failed',result?JSON.stringify(result):null,result?null:error,a.tenantId,id]);const next=(await this.row(c,a,id))!;await this.event(c,a,next);return this.view(next);
 });}
 async cancel(a:RunAdmission,id:string){return this.transaction(a,async c=>{const r=(await this.row(c,a,id))!;if(r.state==='cancelled')return this.view(r);if(!['queued','running'].includes(r.state))throw new StorageError(409,'RUN_TERMINAL');await c.execute("UPDATE report_query_run SET state='cancelled',lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[a.tenantId,id]);const next=(await this.row(c,a,id))!;await this.event(c,a,next);return this.view(next);});}
}
