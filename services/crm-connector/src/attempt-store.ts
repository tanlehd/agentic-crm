import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import type {Pool,PoolConnection,ResultSetHeader} from 'mysql2/promise';
import {Ajv,type ValidateFunction} from 'ajv';
import {default as formatsImport} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchBinding,type DispatchRequest} from '@agentic-crm/contracts';
import {canonical,hash,uuid} from './validation.js';
import {businessTenant,lockDispatchGuard,storageError as fail,type GuardRow} from './dispatch-guard.js';
import {assertStoredPayload} from './payload-store.js';

export type Begin=Extract<DispatchRequest,{operation:'connector-begin'}>;
type Result=Extract<DispatchRequest,{operation:'connector-result'}>;
type Read=Extract<DispatchRequest,{operation:'receipt-read'}>;
function validator(def:string){const ajv=new Ajv({strict:true});(formatsImport as unknown as (a:Ajv)=>void)(ajv);return ajv.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+def});}
const beginValid=validator('ConnectorBegin'),resultValid=validator('ConnectorResult'),readValid=validator('ReceiptRead');
function parsed<T>(input:unknown,valid:ValidateFunction):T{if(!valid(input)||Buffer.byteLength(JSON.stringify(input))>16384)fail('INVALID_REQUEST');return structuredClone(input) as T;}
export const parseBegin=(input:unknown):Begin=>parsed<Begin>(input,beginValid);
interface Live {request:Begin;fence:string;until:number}
const reply=(r:{request_id:string;binding:DispatchBinding},row:GuardRow)=>({schema_version:1 as const,request_id:r.request_id,receipt_id:r.binding.attempt_id,state:row.state,...(row.state==='sent'?{provider_message_id:String(row.provider_message_id)}:{})});

/** Native persistence; live continuations exist only in this process, never in SQL receipts. */
export class AttemptStore {
 private readonly admissions=new WeakMap<object,Live>();
 private readonly sends=new WeakMap<object,Live>();
 constructor(private readonly pool:Pool,private readonly now:()=>number=()=>performance.now(),private readonly connectionGate?:(c:PoolConnection,b:DispatchBinding)=>Promise<boolean>){}
 private async transaction<T>(fn:(c:PoolConnection)=>Promise<T>){const c=await this.pool.getConnection();try{await c.beginTransaction();const r=await fn(c);await c.commit();return r;}catch(e){try{await c.rollback();}catch{/* Connection loss forfeits continuation. */}throw e;}finally{c.release();}}
 private async request(c:PoolConnection,r:Begin|Result,operation:string,fence?:string){
  const digest=hash(canonical(fence?{request:r,fence_id:fence}:r));
  try{await c.execute('INSERT INTO connector_dispatch_request(tenant_id,operation,request_id,intent_id,request_digest,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[r.binding.tenant_id,operation,r.request_id,r.binding.intent_id,digest]);}
  catch(e){if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
  const [[old]]=await c.query<any[]>('SELECT intent_id,request_digest FROM connector_dispatch_request WHERE tenant_id=? AND operation=? AND request_id=? FOR SHARE',[r.binding.tenant_id,operation,r.request_id]);
  if(old?.intent_id!==r.binding.intent_id || old?.request_digest!==digest)fail('CONFLICT');
 }
 private async event(c:PoolConnection,b:Pick<DispatchBinding,'tenant_id'|'intent_id'>,version:string,state:string,fence:string,provider:string|null=null){
  await c.execute('INSERT INTO connector_attempt_event(tenant_id,intent_id,version,state,fence_id,provider_message_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[b.tenant_id,b.intent_id,version,state,fence,provider]);
 }
 private checkFence(row:GuardRow,info:Live){if(row.fence_id!==info.fence || row.grant_id!==info.request.grant_id || row.claim_id!==info.request.claim_id)fail('CONFLICT');}
 async beginAuthorized(tenantId:string,input:unknown){
  const r=parseBegin(input),b=r.binding;businessTenant(tenantId,b);const until=this.now()+5000;
  const result=await this.transaction(async c=>{
   const active=this.connectionGate?await this.connectionGate(c,b):true;
   const row=await lockDispatchGuard(c,b);if(['staged','cancelled'].includes(row.state))fail('INVALID_TRANSITION');
   await assertStoredPayload(c,b,r.grant_id);
   let fresh=false,fence=String(row.fence_id);
   if(row.state==='prepared'){
    if(!active)fail('FORBIDDEN');
    fresh=true;fence=randomUUID();const version=String(BigInt(row.version)+1n);
    const [changed]=await c.execute<ResultSetHeader>("UPDATE connector_dispatch_guard SET state='admitting',grant_id=?,claim_id=?,fence_id=?,deadline_at=TIMESTAMPADD(SECOND,5,UTC_TIMESTAMP(6)),version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=? AND state='prepared'",[r.grant_id,r.claim_id,fence,version,tenantId,b.intent_id,row.version]);
    if(changed.affectedRows!==1)fail('CONFLICT');await this.event(c,b,version,'admitting',fence);row.state='admitting';
   }else if(row.grant_id!==r.grant_id || row.claim_id!==r.claim_id)fail('CONFLICT');
   await this.request(c,r,'connector-begin');return {receipt:reply(r,row),fresh,fence};
  });
  if(!result.fresh)return {receipt:result.receipt};
  const live=Object.freeze({});this.admissions.set(live,{request:r,fence:result.fence,until});return {receipt:result.receipt,live};
 }
 admissionInfo(live:object){const info=this.admissions.get(live);if(!info)fail('INVALID_TRANSITION');return structuredClone(info);}
 async startLive(live:object){
  const info=this.admissions.get(live);this.admissions.delete(live);if(!info)fail('INVALID_TRANSITION');
  if(this.now()>=info.until)fail('EXPIRED');
  await this.transaction(async c=>{
   const b=info.request.binding;if(this.connectionGate&&!await this.connectionGate(c,b))fail('FORBIDDEN');
   const row=await lockDispatchGuard(c,b);this.checkFence(row,info);
   if(row.state!=='admitting')fail('INVALID_TRANSITION');await assertStoredPayload(c,b,info.request.grant_id);
   const version=String(BigInt(row.version)+1n);
   const [changed]=await c.execute<ResultSetHeader>("UPDATE connector_dispatch_guard SET state='started',version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=? AND state='admitting' AND deadline_at>UTC_TIMESTAMP(6)",[version,b.tenant_id,b.intent_id,row.version]);
   if(changed.affectedRows!==1)fail('EXPIRED');await this.event(c,b,version,'started',info.fence);
  });
  const permit=Object.freeze({});this.sends.set(permit,info);return permit;
 }
 async takeLivePayload(permit:object){
  const info=this.sends.get(permit);this.sends.delete(permit);if(!info)fail('INVALID_TRANSITION');if(this.now()>=info.until)fail('EXPIRED');
  const payload=await this.transaction(async c=>{
   const b=info.request.binding;if(this.connectionGate&&!await this.connectionGate(c,b))fail('FORBIDDEN');
   const row=await lockDispatchGuard(c,b);this.checkFence(row,info);if(row.state!=='started')fail('INVALID_TRANSITION');
   const [[time]]=await c.query<any[]>('SELECT deadline_at>UTC_TIMESTAMP(6) valid FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[b.tenant_id,b.intent_id]);if(!time?.valid)fail('EXPIRED');
   return assertStoredPayload(c,b,info.request.grant_id);
  });
  if(this.now()>=info.until)fail('EXPIRED');return payload;
 }
 async recordResultAuthorized(tenantId:string,input:unknown,fence:string){
  const r=parsed<Result>(input,resultValid),b=r.binding;businessTenant(tenantId,b);if(!uuid(fence)||fence!==fence.toLowerCase())fail('INVALID_REQUEST');
  return this.transaction(async c=>{
   const row=await lockDispatchGuard(c,b);if(row.fence_id!==fence)fail('CONFLICT');
   if(!['admitting','started','unknown','sent'].includes(row.state) || (row.state==='admitting'&&r.outcome==='sent'))fail('INVALID_TRANSITION');
   if(row.state==='sent'&&r.outcome==='sent'&&row.provider_message_id!==r.provider_message_id)fail('CONFLICT');
   const next=row.state==='sent'?'sent':r.outcome;
   if(row.state!==next){const version=String(BigInt(row.version)+1n),provider=r.outcome==='sent'?r.provider_message_id:null;
    const [changed]=await c.execute<ResultSetHeader>('UPDATE connector_dispatch_guard SET state=?,provider_message_id=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=? AND fence_id=?',[next,provider,version,tenantId,b.intent_id,row.version,fence]);
    if(changed.affectedRows!==1)fail('CONFLICT');await this.event(c,b,version,next,fence,provider);row.state=next;row.provider_message_id=provider;
   }
   await this.request(c,r,'attempt-result',fence);return reply(r,row);
  });
 }
 async readAuthorized(tenantId:string,input:unknown){
  const r=parsed<Read>(input,readValid),b=r.binding;businessTenant(tenantId,b);if(r.receipt_id!==b.attempt_id)fail('CONFLICT');
  return this.transaction(async c=>{const row=await lockDispatchGuard(c,b);if(row.state==='staged')fail('INVALID_TRANSITION');return reply(r,row);});
 }
 async recoverExpired(tenantId:string,limit=100){
  businessTenant(tenantId,{tenant_id:tenantId} as DispatchBinding);if(!Number.isInteger(limit)||limit<1||limit>100)fail('INVALID_REQUEST');
  return this.transaction(async c=>{
   const [rows]=await c.query<any[]>("SELECT * FROM connector_dispatch_guard WHERE tenant_id=? AND state IN ('admitting','started') AND deadline_at<=UTC_TIMESTAMP(6) ORDER BY deadline_at,intent_id LIMIT ? FOR UPDATE SKIP LOCKED",[tenantId,limit]);
   for(const row of rows){const version=String(BigInt(row.version)+1n);
    await c.execute("UPDATE connector_dispatch_guard SET state='unknown',version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=?",[version,tenantId,row.intent_id,row.version]);
    await this.event(c,{tenant_id:tenantId,intent_id:row.intent_id},version,'unknown',row.fence_id);
   }
   return rows.length;
  });
 }
 async recoverAuthorized(tenantId:string,input:unknown){
  const r=parsed<Read>(input,readValid),b=r.binding;businessTenant(tenantId,b);if(r.receipt_id!==b.attempt_id)fail('CONFLICT');
  return this.transaction(async c=>{
   const row=await lockDispatchGuard(c,b);
   if(['admitting','started'].includes(row.state)){
    const [[time]]=await c.query<any[]>('SELECT deadline_at<=UTC_TIMESTAMP(6) expired FROM connector_dispatch_guard WHERE tenant_id=? AND intent_id=?',[tenantId,b.intent_id]);
    if(time?.expired){
     const version=String(BigInt(row.version)+1n);
     await c.execute("UPDATE connector_dispatch_guard SET state='unknown',version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=?",[version,tenantId,b.intent_id,row.version]);
     await this.event(c,b,version,'unknown',String(row.fence_id));row.state='unknown';
    }
   }
   return reply(r,row);
  });
 }
}
