import { ConnectorContactCache,checkedMapping } from './contact-cache.js';
import { payload } from './validation.js';
import { Store,type Claim,type Result } from './store.js';
import { remoteOrigin,uuid } from './validation.js';
class RemoteError extends Error {constructor(readonly code:string,readonly terminal=false){super(code);}}
export class Worker {
 readonly contactCache=new ConnectorContactCache();
 private busy=false;
 readonly origin:string;
 constructor(private readonly store:Store,origin:string,private readonly env:NodeJS.ProcessEnv=process.env,private readonly request:typeof fetch=fetch,allowHttp=false){this.origin=remoteOrigin(origin,allowHttp);}
 private async call(claim:Claim,path:string,body?:unknown){
  const token=this.env[claim.remote_token_env];if(!token||!/^[a-f0-9]{64}$/.test(token))throw new RemoteError('REMOTE_CREDENTIAL_MISSING',true);
  const response=await this.request(this.origin+path,{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{authorization:`Bearer ${token}`,'x-connection-id':claim.remote_connection_id,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok)throw new RemoteError([400,401,403,404,409,422].includes(response.status)?'REMOTE_REJECTED':'REMOTE_UNAVAILABLE',[400,401,403,404,409,422].includes(response.status));
  // Bound even authenticated response bodies; discard upstream error text completely.
  const reader=response.body?.getReader();if(!reader)throw new RemoteError('REMOTE_PROTOCOL');
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>65536)throw new RemoteError('REMOTE_PROTOCOL');chunks.push(chunk.value);}}finally{await reader.cancel();reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')).data;}catch{throw new RemoteError('REMOTE_PROTOCOL');}
 }
 async dispatch(claim:Claim){
  if(!await this.store.active(claim))return false;
  let result:Result;
  try{
   const binding=await this.call(claim,'/api/v1/integrations/mock-messenger/binding');
   if(binding?.tenant_id!==claim.tenant_id||binding?.connection_id!==claim.remote_connection_id||binding?.platform!=='mock_messenger')throw new RemoteError('REMOTE_BINDING_MISMATCH',true);
   if(!await this.store.active(claim))return false;
   if(claim.status==='queued'){
    const intake=payload(claim.payload),key=this.contactCache.key(claim.tenant_id,claim.remote_connection_id,intake.external_subject_id);
    let mapping=this.contactCache.get(key);
    if(!mapping){
     const found=await this.call(claim,'/api/v1/integrations/contact-identities/lookup',{external_subject_id:intake.external_subject_id});
     // Only an explicit authoritative null may create. Malformed/failed lookups must retry.
     if(!found||!Object.prototype.hasOwnProperty.call(found,'mapping'))throw new RemoteError('REMOTE_PROTOCOL');
     const result=found.mapping===null?await this.call(claim,'/api/v1/integrations/contact-identities/resolve',{external_subject_id:intake.external_subject_id,operation_id:claim.id,...(intake.display_label?{display_label:intake.display_label}:{})}):found;
     try{mapping=checkedMapping(result?.mapping,claim.tenant_id,claim.remote_connection_id,intake.external_subject_id);}catch{throw new RemoteError('REMOTE_PROTOCOL');}
     this.contactCache.put(key,mapping);
    }
    if(!await this.store.active(claim))return false;
    const ack=await this.call(claim,'/api/v1/integrations/mock-messenger/deliveries-v2',{crm_contact_id:mapping.crm_contact_id,crm_identity_id:mapping.crm_identity_id,intake});
    if(!uuid(ack?.delivery_id)||ack?.status!=='received')throw new RemoteError('REMOTE_PROTOCOL');
    result={status:'forwarded',remoteId:ack.delivery_id,errors:0,delay:5};
   }else{
    if(!uuid(claim.remote_delivery_id))throw new RemoteError('REMOTE_PROTOCOL',true);
    const receipt=await this.call(claim,`/api/v1/integrations/deliveries/${claim.remote_delivery_id}`);
    if(receipt?.id!==claim.remote_delivery_id||receipt?.connection_id!==claim.remote_connection_id||!['received','processed','failed'].includes(receipt?.status))throw new RemoteError('REMOTE_PROTOCOL');
    result={status:receipt.status==='processed'?'completed':receipt.status==='failed'?'blocked':'forwarded',errors:0,delay:5,...(receipt.status==='failed'?{error:'REMOTE_PROCESSING_FAILED'}:{})};
   }
  }catch(e){
   const errors=claim.errors+1,terminal=e instanceof RemoteError&&e.terminal;
   result={status:terminal?'blocked':errors>=10?'attention':claim.status as 'queued'|'forwarded',errors,error:e instanceof RemoteError?e.code:'REMOTE_UNAVAILABLE',delay:[1,5,30,120,600][Math.min(errors-1,4)]!};
  }
  return this.store.finish(claim,result);
 }
 async tick(){if(this.busy)return;this.busy=true;try{const claim=await this.store.claim();if(claim)await this.dispatch(claim);}finally{this.busy=false;}}
}
