import { randomUUID,timingSafeEqual } from 'node:crypto';
import type { Pool,PoolConnection } from 'mysql2/promise';
import { BridgeError,canonical,hash,payload,uuid } from './validation.js';
export interface Connection {id:string;tenant_id:string;token_hash:string;remote_connection_id:string;remote_token_env:string;status:string}
export interface Claim {id:string;tenant_id:string;connection_id:string;token:string;status:string;payload:unknown;remote_delivery_id:string|null;errors:number;remote_connection_id:string;remote_token_env:string}
export interface Result {status:'queued'|'forwarded'|'completed'|'blocked'|'attention';remoteId?:string;error?:string;errors:number;delay:number}
export class Store {
 constructor(readonly pool:Pool){}
 private async transaction<T>(fn:(c:PoolConnection)=>Promise<T>):Promise<T>{const c=await this.pool.getConnection();try{await c.beginTransaction();const r=await fn(c);await c.commit();return r;}catch(e){await c.rollback();throw e;}finally{c.release();}}
 async provision(input:{id:string;tenant_id:string;token:string;remote_connection_id:string;remote_token_env:string}){
  if(!uuid(input.id)||!uuid(input.tenant_id)||!uuid(input.remote_connection_id)||!/^[a-f0-9]{64}$/.test(input.token)||!/^CONNECTOR_REMOTE_TOKEN_[A-Z0-9_]{1,105}$/.test(input.remote_token_env))throw new BridgeError(422,'INVALID_BINDING');
  return this.transaction(async c=>{
   const [rows]=await c.query<any[]>('SELECT * FROM connector_connection WHERE id=? FOR UPDATE',[input.id]);
   if(rows.length){const r=rows[0]!;if(r.tenant_id!==input.tenant_id||r.token_hash!==hash(input.token)||r.remote_connection_id!==input.remote_connection_id||r.remote_token_env!==input.remote_token_env||r.status!=='active')throw new BridgeError(409,'IMMUTABLE_BINDING');return;}
   await c.execute('INSERT INTO connector_connection(id,tenant_id,token_hash,remote_connection_id,remote_token_env) VALUES (?,?,?,?,?)',[input.id,input.tenant_id,hash(input.token),input.remote_connection_id,input.remote_token_env]);
  });
 }
 private async auth(c:PoolConnection,id:unknown,authorization:unknown):Promise<Connection>{
  if(!uuid(id)||typeof authorization!=='string'||!/^Bearer [a-f0-9]{64}$/.test(authorization))throw new BridgeError(401,'INTEGRATION_UNAUTHORIZED');
  const [rows]=await c.query<any[]>('SELECT * FROM connector_connection WHERE id=? FOR UPDATE',[id]);const r=rows[0];
  const expected=Buffer.from(r?.token_hash??'0'.repeat(64),'hex'),actual=Buffer.from(hash(authorization.slice(7)),'hex');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual)||!r)throw new BridgeError(401,'INTEGRATION_UNAUTHORIZED');
  if(r.status!=='active')throw new BridgeError(403,'INTEGRATION_FORBIDDEN');return r;
 }
 private audit(c:PoolConnection,ctx:{tenant_id:string;connection_id:string;id:string},action:string,status:string){return c.execute('INSERT INTO connector_audit(id,tenant_id,connection_id,delivery_id,action,status) VALUES (?,?,?,?,?,?)',[randomUUID(),ctx.tenant_id,ctx.connection_id,ctx.id,action,status]);}
 async accept(connection:unknown,authorization:unknown,input:unknown){
  return this.transaction(async c=>{
   const ctx=await this.auth(c,connection,authorization),body=payload(input),digest=hash(canonical(body));
   const [rows]=await c.query<any[]>('SELECT id,payload_hash,status FROM connector_delivery WHERE tenant_id=? AND connection_id=? AND provider_event_id=?',[ctx.tenant_id,ctx.id,body.provider_event_id]);
   if(rows.length){if(rows[0].payload_hash!==digest)throw new BridgeError(409,'IDEMPOTENCY_CONFLICT');return {delivery_id:rows[0].id,status:rows[0].status};}
   const id=randomUUID();await c.execute('INSERT INTO connector_delivery(id,tenant_id,connection_id,provider_event_id,payload_hash,payload) VALUES (?,?,?,?,?,?)',[id,ctx.tenant_id,ctx.id,body.provider_event_id,digest,JSON.stringify(body)]);
   await this.audit(c,{tenant_id:ctx.tenant_id,connection_id:ctx.id,id},'received','queued');return {delivery_id:id,status:'queued'};
  });
 }
 async read(connection:unknown,authorization:unknown,id:unknown){
  if(!uuid(id))throw new BridgeError(400,'INVALID_REQUEST');
  return this.transaction(async c=>{const ctx=await this.auth(c,connection,authorization);const [rows]=await c.query<any[]>('SELECT id,status,attempts,error_code,remote_delivery_id FROM connector_delivery WHERE tenant_id=? AND connection_id=? AND id=?',[ctx.tenant_id,ctx.id,id]);if(!rows.length)throw new BridgeError(404,'NOT_FOUND');return rows[0];});
 }
 async claim():Promise<Claim|undefined>{
  return this.transaction(async c=>{
   const [rows]=await c.query<any[]>("SELECT d.*,c.remote_connection_id,c.remote_token_env FROM connector_delivery d JOIN connector_connection c ON c.id=d.connection_id AND c.tenant_id=d.tenant_id WHERE c.status='active' AND d.status IN ('queued','forwarded') AND d.next_attempt_at<=UTC_TIMESTAMP(6) AND (d.lease_until IS NULL OR d.lease_until<=UTC_TIMESTAMP(6)) ORDER BY d.next_attempt_at,d.id LIMIT 1 FOR UPDATE SKIP LOCKED");
   if(!rows.length)return;const row=rows[0],token=String(BigInt(row.fencing_token)+1n);
   await c.execute('UPDATE connector_delivery SET attempts=attempts+1,fencing_token=?,lease_until=TIMESTAMPADD(SECOND,30,UTC_TIMESTAMP(6)) WHERE id=?',[token,row.id]);
   return {...row,token,payload:typeof row.payload==='string'?JSON.parse(row.payload):row.payload};
  });
 }
 async active(claim:Claim){
  const [rows]=await this.pool.query<any[]>("SELECT d.id FROM connector_delivery d JOIN connector_connection c ON c.id=d.connection_id AND c.tenant_id=d.tenant_id WHERE d.id=? AND d.tenant_id=? AND d.connection_id=? AND d.fencing_token=? AND d.lease_until>UTC_TIMESTAMP(6) AND d.status IN ('queued','forwarded') AND c.status='active'",[claim.id,claim.tenant_id,claim.connection_id,claim.token]);
  return rows.length===1;
 }
 async finish(claim:Claim,result:Result):Promise<boolean>{
  return this.transaction(async c=>{
   const [connections]=await c.query<any[]>('SELECT status FROM connector_connection WHERE tenant_id=? AND id=? FOR UPDATE',[claim.tenant_id,claim.connection_id]);
   if(connections[0]?.status!=='active')return false;
   const [rows]=await c.query<any[]>("SELECT id FROM connector_delivery WHERE tenant_id=? AND connection_id=? AND id=? AND fencing_token=? AND lease_until>UTC_TIMESTAMP(6) AND status IN ('queued','forwarded') FOR UPDATE",[claim.tenant_id,claim.connection_id,claim.id,claim.token]);
   if(!rows.length)return false;
   await c.execute('UPDATE connector_delivery SET status=?,errors=?,remote_delivery_id=COALESCE(?,remote_delivery_id),error_code=?,lease_until=NULL,next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),updated_at=UTC_TIMESTAMP(6) WHERE id=?',[result.status,result.errors,result.remoteId??null,result.error??null,result.delay,claim.id]);
   await this.audit(c,claim,'worker_result',result.status);return true;
  });
 }
}
