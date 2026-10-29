import {randomUUID} from 'node:crypto';
import {Ajv} from 'ajv';
import {default as formatsImport} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchBinding,type DispatchRequest,type ExchangePayload,type DispatchReply} from '@agentic-crm/contracts';
import {BridgeError} from './validation.js';
import {businessTenant} from './dispatch-guard.js';
import {AttemptStore,parseBegin,type Begin} from './attempt-store.js';
const ajv=new Ajv({strict:true});(formatsImport as unknown as (a:Ajv)=>void)(ajv);
const validReply=ajv.compile({...chatDispatchV1Schema,$ref:'#/definitions/DispatchReply'});
type Consume=Extract<DispatchRequest,{operation:'identity-consume'}>;
export interface AttemptPorts {
 authorizeBegin(request:Begin,signal:AbortSignal):Promise<void>;
 bindingActive(binding:DispatchBinding,signal:AbortSignal):Promise<boolean>;
 consume(request:Consume,signal:AbortSignal):Promise<unknown>;
 send(binding:DispatchBinding,payload:ExchangePayload,signal:AbortSignal):Promise<{provider_message_id:string}>;
}
async function bounded<T>(fn:(signal:AbortSignal)=>Promise<T>):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(()=>fn(controller.signal)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('DEPENDENCY_TIMEOUT'));},2000);})]);}
 finally{if(timer)clearTimeout(timer);}
}
/** Injectable application executor; no production authority/provider ports or HTTP registration supplied. */
export class AttemptExecutor {
 constructor(private readonly store:AttemptStore,private readonly ports:AttemptPorts){}
 async execute(tenantId:string,input:unknown){
  const r=parseBegin(input);businessTenant(tenantId,r.binding);await bounded(signal=>this.ports.authorizeBegin(structuredClone(r),signal));
  const begun=await this.store.beginAuthorized(tenantId,r);if(!begun.live)return begun.receipt;
  const info=this.store.admissionInfo(begun.live);
  const read=()=>this.store.readAuthorized(tenantId,{schema_version:1,operation:'receipt-read',request_id:r.request_id,binding:r.binding,receipt_id:r.binding.attempt_id});
  try{
   if(!await bounded(signal=>this.ports.bindingActive(structuredClone(r.binding),signal)))throw new Error('BINDING_INACTIVE');
   const consume:Consume={...r,operation:'identity-consume',request_id:randomUUID(),fence_id:info.fence};
   const consumed=await bounded(signal=>this.ports.consume(structuredClone(consume),signal));
   if(!validReply(consumed))throw new Error('INVALID_CONSUME_REPLY');
   const proof=consumed as DispatchReply;
   if(proof.state!=='consumed'||proof.request_id!==consume.request_id||proof.receipt_id!==r.grant_id||proof.grant_id!==r.grant_id||proof.claim_id!==r.claim_id||proof.resource_context.owner_principal_id!==r.binding.principal_id||proof.resource_context.owner_revision!==r.binding.owner_revision||proof.resource_context.record_version!==r.binding.record_version)throw new Error('CONSUME_MISMATCH');
   if(!await bounded(signal=>this.ports.bindingActive(structuredClone(r.binding),signal)))throw new Error('BINDING_INACTIVE');
   const permit=await this.store.startLive(begun.live);
   if(!await bounded(signal=>this.ports.bindingActive(structuredClone(r.binding),signal)))throw new Error('BINDING_INACTIVE');
   const payload=await this.store.takeLivePayload(permit);
   const result=await bounded(signal=>this.ports.send(structuredClone(r.binding),payload,signal));
   const saved=await this.store.recordResultAuthorized(tenantId,{schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:r.binding,outcome:'sent',provider_message_id:result.provider_message_id},info.fence);
   return {...saved,request_id:r.request_id};
  }catch{
   try{await this.store.recordResultAuthorized(tenantId,{schema_version:1,operation:'connector-result',request_id:randomUUID(),binding:r.binding,outcome:'unknown',error_code:'DELIVERY_UNKNOWN'},info.fence);return await read();}
   catch{throw new BridgeError(503,'DEPENDENCY_UNAVAILABLE');}
  }
 }
}
