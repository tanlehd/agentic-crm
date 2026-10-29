import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { Ajv, type ValidateFunction } from 'ajv';
import { default as formatsImport } from 'ajv-formats';
import { chatDispatchV1Schema, chatExchangeV1Schema, type DispatchRequest, type ExchangeRequest, type ExchangeReply } from '@agentic-crm/contracts';
import { canonical, hash } from './validation.js';
import { businessTenant, lockDispatchGuard, storageError as fail } from './dispatch-guard.js';
import { assertStoredPayload } from './payload-store.js';

type Prepare=Extract<DispatchRequest,{operation:'connector-prepare'}>;
type Cancel=Extract<ExchangeRequest,{operation:'connector-cancel'}>;
type ProofRequest=Extract<ExchangeRequest,{operation:'cancellation-read'}>;
type ProofReply=Extract<ExchangeReply,{state:'cancelled'}>;
const ajv=new Ajv({strict:true});
(formatsImport as unknown as (a:Ajv)=>void)(ajv);
// Distinct Ajv instances/schema ids would be needed if registering roots; inline refs are compiled separately here.
const prepareValid=ajv.compile({...chatDispatchV1Schema,$ref:'#/definitions/ConnectorPrepare'});
const cancelValid=new Ajv({strict:true});
(formatsImport as unknown as (a:Ajv)=>void)(cancelValid);
const cancelSchema=cancelValid.compile({...chatExchangeV1Schema,$ref:'#/definitions/ExchangeCancel'});
const proofRequestSchema=ajv.compile({...chatExchangeV1Schema,$id:'urn:connector:proof-request',$ref:'#/definitions/ExchangeCancelRead'});
const proofReplySchema=ajv.compile({...chatExchangeV1Schema,$id:'urn:connector:proof-reply',$ref:'#/definitions/ExchangeCancellationReply'});
function validated<T>(value:unknown,validate:ValidateFunction):T {
 if(!validate(value) || Buffer.byteLength(JSON.stringify(value))>16384) fail('INVALID_REQUEST');
 return structuredClone(value) as T;
}

/** Storage port only. Every call/replay requires current native owner authority before entry. */
export class PreparationStore {
 constructor(private readonly pool:Pool) {}
 private async transaction<T>(fn:(c:PoolConnection)=>Promise<T>) {
  const c=await this.pool.getConnection();
  try {await c.beginTransaction();const result=await fn(c);await c.commit();return result;}
  catch(e) {try {await c.rollback();} catch { /* Keep original failure; connection may be gone. */ } throw e;}
  finally {c.release();}
 }
 private async receipt(c:PoolConnection,r:Prepare|Cancel) {
  const digest=hash(canonical(r));
  try {await c.execute('INSERT INTO connector_dispatch_request(tenant_id,operation,request_id,intent_id,request_digest,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',
   [r.binding.tenant_id,r.operation,r.request_id,r.binding.intent_id,digest]);}
  catch(e) {if((e as {code?:string}).code!=='ER_DUP_ENTRY')throw e;}
  const [rows]=await c.query<any[]>('SELECT intent_id,request_digest FROM connector_dispatch_request WHERE tenant_id=? AND operation=? AND request_id=? FOR SHARE',[r.binding.tenant_id,r.operation,r.request_id]);
  if(rows[0]?.intent_id!==r.binding.intent_id || rows[0]?.request_digest!==digest) fail('CONFLICT');
 }
 async prepareAuthorized(tenantId:string,input:unknown) {
  const r=validated<Prepare>(input,prepareValid),b=r.binding;businessTenant(tenantId,b);
  return this.transaction(async c=>{
   const row=await lockDispatchGuard(c,b);
   if(row.state==='cancelled')fail('INVALID_TRANSITION');
   await assertStoredPayload(c,b,r.grant_id);
   if(row.state==='staged') {
    const [updated]=await c.execute<ResultSetHeader>("UPDATE connector_dispatch_guard SET state='prepared',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=? AND state='staged'",[tenantId,b.intent_id,row.version]);
    if(updated.affectedRows!==1)fail('CONFLICT');
   }
   await this.receipt(c,r);
   return {schema_version:1 as const,request_id:r.request_id,receipt_id:b.attempt_id,state:'prepared' as const};
  });
 }
 async cancelAuthorized(tenantId:string,input:unknown,proofRequest:unknown,proofReply:unknown) {
  const r=validated<Cancel>(input,cancelSchema),b=r.binding;businessTenant(tenantId,b);
  const asked=validated<ProofRequest>(proofRequest,proofRequestSchema),proof=validated<ProofReply>(proofReply,proofReplySchema);
  if(canonical(asked.binding)!==canonical(b) || asked.cancellation_id!==r.cancellation_id ||
    proof.request_id!==asked.request_id || proof.receipt_id!==b.intent_id || proof.cancellation_id!==r.cancellation_id || proof.reason!==r.reason)fail('CONFLICT');
  return this.transaction(async c=>{
   const row=await lockDispatchGuard(c,b);
   if(row.state==='cancelled') {
    if(row.cancellation_id!==r.cancellation_id || row.cancellation_reason!==r.reason)fail('CONFLICT');
   } else if(row.state==='staged' || row.state==='prepared') {
    const [updated]=await c.execute<ResultSetHeader>("UPDATE connector_dispatch_guard SET state='cancelled',cancellation_id=?,cancellation_reason=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND version=? AND state IN ('staged','prepared')",[r.cancellation_id,r.reason,tenantId,b.intent_id,row.version]);
    if(updated.affectedRows!==1)fail('CONFLICT');
   } else fail('INVALID_TRANSITION');
   await this.receipt(c,r);
   return {schema_version:1 as const,request_id:r.request_id,receipt_id:b.intent_id,state:'cancelled' as const,cancellation_id:r.cancellation_id,reason:r.reason};
  });
 }
}
