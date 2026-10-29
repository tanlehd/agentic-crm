import type { Pool, PoolConnection } from 'mysql2/promise';
import { Ajv } from 'ajv';
import { default as formatsImport } from 'ajv-formats';
import { chatExchangeV1Schema, type DispatchBinding, type ExchangePayload, type ExchangeRequest } from '@agentic-crm/contracts';
import { lockDispatchGuard, bindingFromRow } from './dispatch-guard.js';
import { BridgeError, canonical, hash, uuid } from './validation.js';

type PayloadPut = Extract<ExchangeRequest, {operation:'payload-put'}>;
const ajv = new Ajv({ strict: true });
(formatsImport as unknown as (a:Ajv)=>void)(ajv);
const valid = ajv.compile({ ...chatExchangeV1Schema, $ref:'#/definitions/ExchangePayloadPut' });
const platformTenant = '01900000-0000-7000-8000-000000000001';
const fail = (code:string):never => { throw new BridgeError(code === 'FORBIDDEN' ? 403 : code === 'INVALID_REQUEST' ? 400 : 409, code); };
const duplicate = (e:unknown) => (e as {code?:string})?.code === 'ER_DUP_ENTRY';

export async function assertStoredPayload(c:PoolConnection,b:DispatchBinding,grantId:string) {
 const bindingDigest=hash(canonical({binding:b,grant_id:grantId}));
 const [rows]=await c.query<any[]>('SELECT * FROM connector_dispatch_payload WHERE tenant_id=? AND intent_id=? FOR SHARE',[b.tenant_id,b.intent_id]);
 const stored=rows[0];
 if(!stored || stored.binding_digest!==bindingDigest) fail('CONFLICT');
 const body=typeof stored.payload==='string'?JSON.parse(stored.payload):stored.payload;
 if(hash(canonical({binding:bindingFromRow(stored),grant_id:stored.grant_id}))!==bindingDigest || hash(canonical(body))!==b.payload_digest)fail('CONFLICT');
 return structuredClone(body) as ExchangePayload;
}

/** Internal storage only. Caller MUST perform fresh native authority and cancellation checks.
 * No HTTP/worker integration until those adapters exist; grantState is an inspected fact, not a credential.
 */
export class PayloadStore {
 constructor(private readonly pool:Pool) {}

 private input(tenantId:string, input:unknown):PayloadPut {
  if(!uuid(tenantId) || tenantId !== tenantId.toLowerCase() || tenantId === platformTenant) fail('FORBIDDEN');
  if(!valid(input)) fail('INVALID_REQUEST');
  const request = structuredClone(input) as PayloadPut;
  if(request.binding.tenant_id !== tenantId) fail('FORBIDDEN');
  if(Buffer.byteLength(JSON.stringify(request)) > 98304 || Buffer.byteLength(canonical(request.payload)) > 65536 || request.payload.message.text.length > 4000) fail('INVALID_REQUEST');
  if(hash(canonical(request.payload)) !== request.binding.payload_digest) fail('CONFLICT');
  return request;
 }

 private async transaction<T>(fn:(c:PoolConnection)=>Promise<T>):Promise<T> {
  const c = await this.pool.getConnection();
  try { await c.beginTransaction(); const result = await fn(c); await c.commit(); return result; }
  catch(e) { await c.rollback(); throw e; }
  finally { c.release(); }
 }

 async persistAuthorizedPayload(tenantId:string, input:unknown, grantState:'issued'|'consumed') {
  const r = this.input(tenantId,input), b = r.binding;
  if(grantState !== 'issued' && grantState !== 'consumed') fail('FORBIDDEN');
  const bindingDigest = hash(canonical({binding:b,grant_id:r.grant_id}));
  return this.transaction(async c => {
   const guard=await lockDispatchGuard(c,b);
   if(guard.state==='cancelled')fail('INVALID_TRANSITION');
   if(grantState === 'issued') {
    try {
     await c.execute(`INSERT INTO connector_dispatch_payload
      (tenant_id,intent_id,attempt_id,conversation_id,crm_contact_id,connection_id,principal_id,delegation_id,grant_id,
       actor_kind,owner_revision,record_version,payload_digest,binding_digest,payload,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
     [tenantId,b.intent_id,b.attempt_id,b.conversation_id,b.crm_contact_id,b.connection_id,b.principal_id,b.delegation_id,r.grant_id,
      b.actor_kind,b.owner_revision,b.record_version,b.payload_digest,bindingDigest,canonical(r.payload)]);
    } catch(e) { if(!duplicate(e)) throw e; }
   }
   await assertStoredPayload(c,b,r.grant_id);
   const requestDigest = hash(canonical(r));
   try {
    await c.execute('INSERT INTO connector_payload_request(tenant_id,request_id,intent_id,request_digest,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))',
     [tenantId,r.request_id,b.intent_id,requestDigest]);
   } catch(e) { if(!duplicate(e)) throw e; }
   const [requests] = await c.query<any[]>('SELECT intent_id,request_digest FROM connector_payload_request WHERE tenant_id=? AND request_id=? FOR SHARE',[tenantId,r.request_id]);
   if(requests[0]?.request_digest !== requestDigest || requests[0]?.intent_id !== b.intent_id) fail('CONFLICT');
   return {schema_version:1 as const,request_id:r.request_id,state:'staged' as const,receipt_id:b.attempt_id};
  });
 }
}
