import {randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,chatExchangeV1Schema,type DispatchBinding} from '@agentic-crm/contracts';
import {workloadRequest,remoteRegistryAuthority,type TlsMaterial} from '@agentic-crm/workload-transport';
import {ChatDispatchStore} from './dispatch-storage.js';
import {businessTenant} from './database.js';
import type {Issue} from './outbound-job.js';

type Phase='issue'|'payload'|'prepare'|'claim'|'begin'|'deliver';
interface Job {tenant_id:string;intent_id:string;conversation_id:string;phase:Phase;binding_json:DispatchBinding;resource_json:Issue['resource_context'];grant_id:string|null;claim_id:string|null;lease_token:string;version:string;failures:number}
const json=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);
const validReply=a.compile({...chatDispatchV1Schema,$ref:'#/definitions/DispatchReply'});
const validPayload=a.compile({...chatExchangeV1Schema,$ref:'#/definitions/ExchangePayloadReply'});

/** Chat-owned durable coordinator. No Identity/Connector SQL or provider callback. */
export class HumanOutboundCoordinator {
 private readonly uow:ChatDispatchStore;
 private readonly authority:ReturnType<typeof remoteRegistryAuthority>;
 constructor(private readonly source:ChatDispatchStore,private readonly material:TlsMaterial,registry:Parameters<typeof remoteRegistryAuthority>[1],private readonly owners:{identity:URL;connector:URL}){
  if(material.service!=='chat')throw new Error('CHAT_WORKLOAD_REQUIRED');this.uow=source;this.authority=remoteRegistryAuthority(material,registry);
 }
 private async claim(tenant:string,intent:string):Promise<Job|null>{return this.uow.run({tenantId:tenant},async s=>{
  const [row]=await s.query("SELECT *,lease_until>UTC_TIMESTAMP(6) busy FROM chat_outbound_job WHERE tenant_id=? AND intent_id=? AND status='pending' AND next_attempt_at<=UTC_TIMESTAMP(6) FOR UPDATE",[tenant,intent]);
  if(!row||row.busy)return null;
  const token=randomUUID();await s.query('UPDATE chat_outbound_job SET lease_token=?,lease_until=TIMESTAMPADD(SECOND,30,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=?',[token,tenant,intent]);
  return {...row,binding_json:json(row.binding_json),resource_json:json(row.resource_json),lease_token:token,version:String(BigInt(row.version)+1n)};
 });}
 private async save(job:Job,phase:Phase,values:{grant?:string;claim?:string;done?:boolean;retry?:boolean}={}){
  const changed=await this.uow.run({tenantId:job.tenant_id},s=>s.query("UPDATE chat_outbound_job SET phase=?,grant_id=?,claim_id=?,status=?,lease_token=IF(?,NULL,lease_token),lease_until=IF(?,NULL,lease_until),next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND lease_token=? AND version=? AND lease_until>UTC_TIMESTAMP(6)",[phase,values.grant??job.grant_id,values.claim??job.claim_id,values.done?'done':'pending',!!values.done||!!values.retry,!!values.done||!!values.retry,values.retry?1:0,job.tenant_id,job.intent_id,job.lease_token,job.version]));
  if(changed.affectedRows!==1)throw new Error('LEASE_LOST');job.phase=phase;job.grant_id=values.grant??job.grant_id;job.claim_id=values.claim??job.claim_id;job.version=String(BigInt(job.version)+1n);
 }
 private async call(job:Job,owner:'identity'|'connector',path:string,data:Record<string,unknown>,payload=false){
  const reply=await workloadRequest(this.material,this.authority,{url:new URL(path,this.owners[owner]),expectedService:owner,tenant:job.tenant_id,data});
  if(!(payload?validPayload:validReply)(reply)||reply.request_id!==data.request_id)throw new Error('INVALID_OWNER_REPLY');return reply;
 }
 async run(tenant:string,intent:string){
  const job=await this.claim(tenant,intent);if(!job)return;
  const binding=job.binding_json,base={schema_version:1,request_id:job.intent_id,binding};
  const receipt={...base,operation:'receipt-read',receipt_id:binding.attempt_id};
  const call=(owner:'identity'|'connector',operation:string,data:Record<string,unknown>)=>this.call(job,owner,'/internal/v1/dispatch/'+operation,data);
  try{
   for(let step=0;step<6;step++){
    if(job.phase==='issue'){
     const r=await call('identity','identity-issue',{...base,operation:'identity-issue',resource_context:job.resource_json});
     if(r.state!=='issued'||r.receipt_id!==r.grant_id)throw new Error('GRANT_UNAVAILABLE');
     await this.save(job,'payload',{grant:String(r.grant_id)});
    }else if(job.phase==='payload'){
     const [row]=await this.source.query('SELECT text FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,intent]);if(!row)throw new Error('INTENT_MISSING');
     const r=await this.call(job,'connector','/internal/v1/chat-exchange/payload-put',{...base,operation:'payload-put',grant_id:job.grant_id,payload:{version:1,platform:'mock_messenger',message:{type:'text',text:row.text}}},true);
     if(r.receipt_id!==binding.attempt_id)throw new Error('RECEIPT_MISMATCH');await this.save(job,'prepare');
    }else if(job.phase==='prepare'){
     const r=await call('connector','connector-prepare',{...base,operation:'connector-prepare',grant_id:job.grant_id});
     if(r.state!=='prepared'||r.receipt_id!==binding.attempt_id)throw new Error('RECEIPT_MISMATCH');await this.save(job,'claim');
    }else if(job.phase==='claim'){
     const r=await call('connector','connector-claim',{...base,operation:'chat-claim',grant_id:job.grant_id});
     if(r.state!=='claimed'||r.receipt_id!==r.claim_id)throw new Error('RECEIPT_MISMATCH');await this.save(job,'begin',{claim:String(r.claim_id)});
    }else if(job.phase==='begin'){
     const prior=await call('connector','receipt-read',receipt);
     if(prior.receipt_id!==binding.attempt_id)throw new Error('RECEIPT_MISMATCH');
     if(prior.state==='prepared')await call('connector','connector-begin',{...base,operation:'connector-begin',grant_id:job.grant_id,claim_id:job.claim_id});
     else if(!['admitting','started','sent','unknown'].includes(String(prior.state)))throw new Error('INVALID_ATTEMPT');
     await this.save(job,'deliver');
    }else{
     const r=await call('connector','connector-deliver',receipt);if(r.receipt_id!==binding.attempt_id)throw new Error('RECEIPT_MISMATCH');
     const terminal=['sent','unknown'].includes(String(r.state));await this.save(job,'deliver',{done:terminal,retry:!terminal});return;
    }
   }
  }catch{
   // Never change binding, attempt, phase or route when retrying an uncertain effect.
   await this.uow.run({tenantId:tenant},s=>s.query("UPDATE chat_outbound_job SET failures=failures+1,status=IF(failures>=25,'attention','pending'),last_error='OUTBOUND_DEPENDENCY_UNAVAILABLE',next_attempt_at=TIMESTAMPADD(SECOND,?,UTC_TIMESTAMP(6)),lease_token=NULL,lease_until=NULL,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND intent_id=? AND lease_token=? AND version=?",[Math.min(30,2**Math.min(5,Number(job.failures))),tenant,intent,job.lease_token,job.version]));
  }
 }
 async tick(tenants:readonly string[],limit=25){
  if(!Number.isSafeInteger(limit)||limit<1||limit>25)throw new Error('CHAT_OUTBOUND_BATCH_INVALID');
  const scope=[...new Set(tenants.map(businessTenant))];if(!scope.length)throw new Error('CHAT_OUTBOUND_TENANTS_REQUIRED');
  const rows=await this.source.query(`SELECT tenant_id,intent_id FROM chat_outbound_job WHERE tenant_id IN (?) AND status='pending' AND next_attempt_at<=UTC_TIMESTAMP(6) AND (lease_until IS NULL OR lease_until<=UTC_TIMESTAMP(6)) ORDER BY next_attempt_at,tenant_id,intent_id LIMIT ${limit}`,[scope]);
  for(const row of rows)await this.run(row.tenant_id,row.intent_id);
 }
}
