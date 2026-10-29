import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchBinding,type DispatchReply} from '@agentic-crm/contracts';
import {createWorkloadServer,workloadRequest,remoteRegistryAuthority,workloadReadiness,TransportError,type TlsMaterial,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatDispatchStore} from './dispatch-storage.js';
import {NativeChatClaims,type ChatClaimPorts} from './dispatch-claim.js';
import {NativeChatResults} from './dispatch-result.js';

function route(name:string,callers:WorkloadRoute['callers'],handle:WorkloadRoute['handle']):WorkloadRoute{
 const a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);
 const valid=a.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+name});
 return {callers,validate(v){if(!valid(v))throw new TransportError('INVALID_REQUEST');return {tenant_id:(v.binding as DispatchBinding).tenant_id,request_id:String(v.request_id)};},handle};
}
export function dispatchRoutes(store:ChatDispatchStore,material:TlsMaterial,registry:Parameters<typeof remoteRegistryAuthority>[1],owners:{identity:URL;connector:URL},connection:ChatClaimPorts['mockConnectionActive']):Record<string,WorkloadRoute>{
 if(material.service!=='chat')throw new Error('CHAT_MATERIAL_REQUIRED');
 const authority=remoteRegistryAuthority(material,registry),a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);
 const valid=a.compile<DispatchReply>({...chatDispatchV1Schema,$ref:'#/definitions/DispatchReply'});
 async function read(owner:'identity'|'connector',r:Parameters<ChatClaimPorts['inspectGrant']>[0],signal:AbortSignal){
  const reply=await workloadRequest(material,authority,{url:new URL('/internal/v1/dispatch/receipt-read',owners[owner]),expectedService:owner,tenant:r.binding.tenant_id,data:{...r},signal});
  if(!valid(reply)||reply.request_id!==r.request_id||reply.receipt_id!==r.receipt_id)throw new TransportError('FORBIDDEN');return reply;
 }
 const claims=new NativeChatClaims(store,store,{inspectGrant:(r,s)=>read('identity',r,s),mockConnectionActive:connection});
 const results=new NativeChatResults(store,store,(r,s)=>read('connector',r,s));
 return {
  '/internal/v1/dispatch/chat-claim':route('ChatClaim',['connector'],(v,p)=>claims.claim(p.service,(v.binding as DispatchBinding).tenant_id,v)),
  '/internal/v1/dispatch/chat-claim-proof':route('ChatClaimProofRead',['identity','connector'],async(v,p)=>({...await claims.readProofWire(p.service,(v.binding as DispatchBinding).tenant_id,v)})),
  '/internal/v1/dispatch/intent-read':route('ReceiptRead',['connector'],(v,p)=>claims.inspectQueued(p.service,(v.binding as DispatchBinding).tenant_id,v)),
  '/internal/v1/dispatch/connector-result':route('ConnectorResult',['connector'],(v,p)=>results.apply(p.service,(v.binding as DispatchBinding).tenant_id,v)),
 };
}
export function chatDispatchServer(store:ChatDispatchStore,material:TlsMaterial,registry:Parameters<typeof remoteRegistryAuthority>[1],owners:{identity:URL;connector:URL},connection:ChatClaimPorts['mockConnectionActive']){
 return createWorkloadServer(material,remoteRegistryAuthority(material,registry),{'/internal/v1/workloads/ready':workloadReadiness('chat',()=>store.query('SELECT 1')),...dispatchRoutes(store,material,registry,owners,connection)});
}
