import type {DataSource} from 'typeorm';
import {Ajv} from 'ajv';
import {default as formats} from 'ajv-formats';
import {chatDispatchV1Schema,type DispatchBinding} from '@agentic-crm/contracts';
import {createWorkloadServer,workloadRequest,registryAdmissionRoute,workloadReadiness,TransportError,type TlsMaterial,type WorkloadRoute,type CurrentAuthority} from '@agentic-crm/workload-transport';
import {NativeWorkloadRegistry} from './modules/identity/workload-registry.js';
import {IdentityDispatchLedger} from './modules/identity/dispatch-ledger.js';
import {wireChatClaimInspector} from './modules/identity/dispatch-proof.js';
import {withFieldPolicies} from './modules/crm/access.js';

function route(name:string,callers:WorkloadRoute['callers'],handle:WorkloadRoute['handle']):WorkloadRoute {
  const a=new Ajv({strict:true});(formats as unknown as(a:Ajv)=>void)(a);
  const valid=a.compile({...chatDispatchV1Schema,$ref:'#/definitions/'+name});
  return {callers,validate(v){if(!valid(v))throw new TransportError('INVALID_REQUEST');return {tenant_id:(v.binding as DispatchBinding).tenant_id,request_id:String(v.request_id)};},handle};
}
export function identityDispatchServer(source:DataSource,registrySource:DataSource,material:TlsMaterial,config:{key:string|Buffer;keyId:string;chat:URL}){
  if(material.service!=='identity')throw new Error('IDENTITY_MATERIAL_REQUIRED');
  const registry=new NativeWorkloadRegistry(registrySource,material);
  const authorize:CurrentAuthority=(p,t)=>registry.authorize(p.service,p.fingerprint,t);
  const ledger=new IdentityDispatchLedger(source,withFieldPolicies,wireChatClaimInspector((r,signal)=>workloadRequest(material,authorize,{url:new URL('/internal/v1/dispatch/chat-claim-proof',config.chat),expectedService:'chat',tenant:r.binding.tenant_id,data:{...r},signal})));
  return createWorkloadServer(material,authorize,{
    '/internal/v1/workloads/ready':workloadReadiness('identity',()=>source.query('SELECT 1')),
    '/internal/v1/workloads/admit':registryAdmissionRoute(material,config.key,config.keyId,authorize),
    '/internal/v1/dispatch/identity-issue':route('IdentityIssue',['chat'],(v,p)=>ledger.issue(p.service,(v.binding as DispatchBinding).tenant_id,v)),
    '/internal/v1/dispatch/identity-consume':route('IdentityConsume',['connector'],(v,p)=>ledger.consume(p.service,(v.binding as DispatchBinding).tenant_id,v)),
    '/internal/v1/dispatch/receipt-read':route('ReceiptRead',['chat','connector'],(v,p)=>ledger.read(p.service,(v.binding as DispatchBinding).tenant_id,v)),
  });
}
