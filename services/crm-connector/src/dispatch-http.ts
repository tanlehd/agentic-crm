import {randomUUID,createHash} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,chatExchangeV1Schema,type DispatchBinding,type DispatchRequest} from '@agentic-crm/contracts';
import {createWorkloadServer,workloadRequest,remoteRegistryAuthority,workloadReadiness,TransportError,type TlsMaterial,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {PayloadStore} from './payload-store.js';
import {PreparationStore} from './preparation-store.js';
import {AttemptStore} from './attempt-store.js';
import {AttemptExecutor} from './attempt-executor.js';
import {canonical} from './validation.js';
import {ConnectorConnectionStatus,connectorConnectionStatusRoutes,lockActiveConnection} from './connection-status.js';

type Read=Extract<DispatchRequest,{operation:'receipt-read'}>;
function validator(schema:object,name:string){const a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);return a.compile({...schema,$ref:'#/definitions/'+name});}
const replyValid=validator(chatDispatchV1Schema,'DispatchReply'),proofValid=validator(chatDispatchV1Schema,'ChatClaimProofReply');
const queuedValid=(()=>{const a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);a.addSchema(chatDispatchV1Schema);return a.compile({type:'object',additionalProperties:false,required:['schema_version','request_id','receipt_id','state','binding','resource_context'],properties:{schema_version:{const:1},request_id:{type:'string',format:'uuid'},receipt_id:{type:'string',format:'uuid'},state:{const:'queued'},binding:{$ref:chatDispatchV1Schema.$id+'#/definitions/DispatchBinding'},resource_context:{$ref:chatDispatchV1Schema.$id+'#/definitions/DispatchResourceContext'}}});})();
function denied():never{throw new TransportError('FORBIDDEN');}

export function connectorDispatchServer(pool:Pool,material:TlsMaterial,registry:Parameters<typeof remoteRegistryAuthority>[1],owners:{identity:URL;chat:URL},synthetic:boolean){
  if(material.service!=='connector'||!synthetic)throw new Error('SYNTHETIC_DISPATCH_CONFIGURATION_REQUIRED');
  const authority=remoteRegistryAuthority(material,registry),payloads=new PayloadStore(pool),preparation=new PreparationStore(pool),attempts=new AttemptStore(pool,undefined,lockActiveConnection);
  async function call<T extends {request_id:string;binding:DispatchBinding}>(owner:'identity'|'chat',operation:string,r:T,signal:AbortSignal){
    const response=await workloadRequest(material,authority,{url:new URL('/internal/v1/dispatch/'+operation,owners[owner]),expectedService:owner,tenant:r.binding.tenant_id,data:{...r},signal});
    if(response.request_id!==r.request_id)denied();return response;
  }
  const read=(binding:DispatchBinding,receipt_id:string):Read=>({schema_version:1,operation:'receipt-read',request_id:randomUUID(),binding,receipt_id});
  async function active(b:DispatchBinding){const [rows]=await pool.query<any[]>("SELECT id FROM connector_connection WHERE tenant_id=? AND id=? AND status='active'",[b.tenant_id,b.connection_id]);return rows.length===1;}
  async function grant(r:any,signal:AbortSignal){
    const response=await call('identity','receipt-read',read(r.binding,r.grant_id),signal);
    if(!replyValid(response)||response.receipt_id!==r.grant_id||!['issued','consumed'].includes(String(response.state)))denied();return response;
  }
  async function stageAuthority(r:any,signal:AbortSignal){
    const g=await grant(r,signal);if(g.state!=='issued')denied();
    const intent=await call('chat','intent-read',read(r.binding,r.binding.intent_id),signal);
    if(!queuedValid(intent)||intent.receipt_id!==r.binding.intent_id||canonical(intent.binding)!==canonical(r.binding)||canonical(intent.resource_context)!==canonical(g.resource_context)||!await active(r.binding))denied();
  }
  const executor=new AttemptExecutor(attempts,{
    async authorizeBegin(r,signal){
      await grant(r,signal);
      const proof=await call('chat','chat-claim-proof',{schema_version:1,operation:'chat-claim-proof',request_id:randomUUID(),binding:r.binding,claim_id:r.claim_id},signal);
      if(!proofValid(proof)||proof.claim_id!==r.claim_id||proof.receipt_id!==r.claim_id||proof.grant_id!==r.grant_id||canonical(proof.binding)!==canonical(r.binding))denied();
    },bindingActive:active,
    consume:(r,signal)=>call('identity','identity-consume',r,signal),
    async send(binding,_payload,signal){if(signal.aborted)throw new Error('ABORTED');return {provider_message_id:'synthetic-'+binding.intent_id};},
  });
  const routes:Record<string,WorkloadRoute>={...connectorConnectionStatusRoutes(new ConnectorConnectionStatus(pool)),'/internal/v1/workloads/ready':workloadReadiness('connector',()=>pool.query('SELECT 1'))};
  function route(path:string,schema:object,name:string,handle:WorkloadRoute['handle'],bodyLimit=16384){
    const valid=validator(schema,name);routes[path]={callers:['chat'],bodyLimit,validate(v){if(!valid(v))throw new TransportError('INVALID_REQUEST');return {tenant_id:(v.binding as DispatchBinding).tenant_id,request_id:String(v.request_id)};},handle};
  }
  route('/internal/v1/chat-exchange/payload-put',chatExchangeV1Schema,'ExchangePayloadPut',async(v,_p,s)=>{await stageAuthority(v,s);return payloads.persistAuthorizedPayload((v.binding as DispatchBinding).tenant_id,v,'issued');},98304);
  route('/internal/v1/dispatch/connector-prepare',chatDispatchV1Schema,'ConnectorPrepare',async(v,_p,s)=>{await stageAuthority(v,s);return preparation.prepareAuthorized((v.binding as DispatchBinding).tenant_id,v);});
  route('/internal/v1/dispatch/connector-begin',chatDispatchV1Schema,'ConnectorBegin',async v=>executor.execute((v.binding as DispatchBinding).tenant_id,v));
  route('/internal/v1/dispatch/receipt-read',chatDispatchV1Schema,'ReceiptRead',async v=>attempts.readAuthorized((v.binding as DispatchBinding).tenant_id,v));
  route('/internal/v1/dispatch/connector-claim',chatDispatchV1Schema,'ChatClaim',async(v,_p,s)=>{
    const r=v as unknown as Extract<DispatchRequest,{operation:'chat-claim'}>;
    const receipt=await attempts.readAuthorized(r.binding.tenant_id,read(r.binding,r.binding.attempt_id));
    if(!['prepared','admitting','started','sent','unknown'].includes(receipt.state))denied();
    // Preparation binds this exact payload and grant. Replaying it never creates a sender continuation.
    await preparation.prepareAuthorized(r.binding.tenant_id,{...r,operation:'connector-prepare'});
    const claimed=await call('chat','chat-claim',r,s);
    if(!replyValid(claimed)||claimed.state!=='claimed'||claimed.receipt_id!==claimed.claim_id)denied();return claimed;
  });
  route('/internal/v1/dispatch/connector-deliver',chatDispatchV1Schema,'ReceiptRead',async(v,_p,s)=>{
    const r=v as unknown as Read,result=await attempts.recoverAuthorized(r.binding.tenant_id,r);
    if(!['sent','unknown'].includes(result.state))return result;
    const digest=createHash('sha256').update(r.binding.tenant_id+':'+r.binding.attempt_id+':'+result.state).digest('hex');
    const request_id=digest.slice(0,8)+'-'+digest.slice(8,12)+'-5'+digest.slice(13,16)+'-a'+digest.slice(17,20)+'-'+digest.slice(20,32);
    const applied=await call('chat','connector-result',{schema_version:1,operation:'connector-result',request_id,binding:r.binding,outcome:result.state,...(result.state==='sent'?{provider_message_id:result.provider_message_id}:{error_code:'DELIVERY_UNKNOWN'})},s);
    if(!replyValid(applied)||applied.receipt_id!==r.binding.attempt_id||!['sent','unknown'].includes(String(applied.state)))denied();
    return {...applied,request_id:r.request_id};
  });
  return createWorkloadServer(material,authority,routes);
}
