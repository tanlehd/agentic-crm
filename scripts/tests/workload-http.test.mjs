import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {Agent as HttpAgent} from 'node:http';
import {createWorkloadServer,workloadRequest,workloadIdentity,workloadMaterial,OwnerDomainError} from '../../packages/workload-transport/dist/index.js';

test('explicit HTTP keys: service authentication, allowlists, tenant checks, no TLS downgrade',async()=>{
 const keys=Object.fromEntries(['chat','identity','routing'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID();let effects=0;
 const authority=async(peer,t)=>{assert.equal(t,tenant);assert.deepEqual(peer,workloadIdentity(material(peer.service)));};
 const server=createWorkloadServer(material('identity'),authority,{'/internal/v1/test/echo':{callers:['chat'],validate:v=>v,handle:async v=>{effects++;return {request_id:v.request_id};}}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=new URL('http://127.0.0.1:'+server.address().port+'/internal/v1/test/echo'),data={tenant_id:tenant,request_id:randomUUID()};
 try{
  const response=await workloadRequest(material('chat'),authority,{url,expectedService:'identity',tenant,data});assert.equal(response.request_id,data.request_id);
  await assert.rejects(workloadRequest(material('routing'),authority,{url,expectedService:'identity',tenant,data}),{code:'FORBIDDEN'});
  const forged={...material('chat'),localHttp:{...keys,chat:randomBytes(32).toString('hex')}};
  await assert.rejects(workloadRequest(forged,async()=>{},{url,expectedService:'identity',tenant,data}),{code:'UNAUTHENTICATED'});
  const unauth=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(unauth.status,401);
  await assert.rejects(workloadRequest(material('chat'),authority,{url:new URL(url.toString().replace('http:','https:')),expectedService:'identity',tenant,data}),{code:'INVALID_REQUEST'});
  assert.equal(effects,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('production cannot opt into local HTTP; unknown transport rejected',async()=>{
 await assert.rejects(workloadMaterial('chat',{APP_ENV:'production',WORKLOAD_TRANSPORT:'http-local'}),/LOCAL_HTTP_ENVIRONMENT_REQUIRED/);
 await assert.rejects(workloadMaterial('chat',{APP_ENV:'development',WORKLOAD_TRANSPORT:'typo'}),/WORKLOAD_TRANSPORT_INVALID/);
});

test('pooled requests still authorize both peers on every request and reject revocation before effects',async()=>{
 const keys=Object.fromEntries(['chat','identity'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID();
 let effects=0,connections=0,revoked=false,checks=0;
 const authority=async()=>{checks++;if(revoked)throw Object.assign(new Error(),{code:'FORBIDDEN'});};
 const path='/internal/v1/test/echo',server=createWorkloadServer(material('identity'),authority,{[path]:{callers:['chat'],validate:v=>v,handle:async v=>{effects++;return {request_id:v.request_id};}}});
 server.on('connection',()=>connections++);server.listen(0,'127.0.0.1');await once(server,'listening');
 const agent=new HttpAgent({keepAlive:true,maxSockets:1});
 const call=()=>workloadRequest(material('chat'),authority,{url:new URL('http://127.0.0.1:'+server.address().port+path),expectedService:'identity',tenant,data:{tenant_id:tenant,request_id:randomUUID()},httpAgent:agent});
 try{await call();await call();assert.equal(connections,1);assert.equal(checks,8);revoked=true;await assert.rejects(call(),{code:'FORBIDDEN'});assert.equal(effects,2);assert.equal(checks,10);}
 finally{agent.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('nested Inbox owner composition may exceed two seconds without relaxing elementary owner deadlines',async()=>{
 const keys=Object.fromEntries(['chat','identity','crm'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID();
 const route={callers:['chat'],validate:v=>v,handle:async v=>{await new Promise(resolve=>setTimeout(resolve,2200));return {request_id:v.request_id};}};
 for(const [owner,operation]of [['identity','admit'],['crm','contact-summary-batch']]){
  const path='/internal/v1/owners/'+owner+'/'+operation,server=createWorkloadServer(material(owner),async()=>{},{[path]:route});server.listen(0,'127.0.0.1');await once(server,'listening');
  try{const r=await workloadRequest(material('chat'),async()=>{},{url:new URL('http://127.0.0.1:'+server.address().port+path),expectedService:owner,tenant,data:{tenant_id:tenant,request_id:randomUUID()}});assert.equal(typeof r.request_id,'string');}
  finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 }
});

test('owner public error transport preserves only registered status/code and exact request correlation',async()=>{
 const keys=Object.fromEntries(['chat','bff'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID(),correlation=randomUUID();
 const authority=async()=>{};let failure=new OwnerDomainError('INVALID_CURSOR',correlation);
 const path='/internal/v1/owners/chat/conversation-get-conversations-id-outbound-intents-intentId';
 const route={callers:['bff'],validate:v=>v,handle:async()=>{throw failure;}};
 const server=createWorkloadServer(material('chat'),authority,{[path]:route});server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=new URL('http://127.0.0.1:'+server.address().port+path),data={tenant_id:tenant,request_id:randomUUID()};
 try{
  for(const [code,status] of [['INVALID_CURSOR',400],['FIELD_FORBIDDEN',403],['UNSUPPORTED_MESSAGE_PLATFORM',503]]){
   failure=new OwnerDomainError(code,correlation);
   await assert.rejects(workloadRequest(material('bff'),authority,{url,expectedService:'chat',tenant,data}),e=>e instanceof OwnerDomainError&&e.code===code&&e.status===status&&e.correlation===correlation);
  }
  failure=Object.assign(new Error('private internal exception'),{status:403,code:'FIELD_FORBIDDEN'});
  await assert.rejects(workloadRequest(material('bff'),authority,{url,expectedService:'chat',tenant,data}),{code:'DEPENDENCY_UNAVAILABLE'});
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('large history replies do not raise D2, request-body or unrelated owner budgets',async()=>{
 const keys=Object.fromEntries(['chat','bff'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID();
 const route={callers:['bff'],validate:v=>v,handle:async()=>({}),responseLimit:8*1024*1024};
 for(const path of ['/internal/v1/owners/chat/command-proof','/internal/v1/owners/crm/conversation-get-conversations-id-messages','/internal/v1/dispatch/claim'])assert.throws(()=>createWorkloadServer(material('chat'),async()=>{},{[path]:route}),{code:'INVALID_REQUEST'});
 const path='/internal/v1/owners/chat/conversation-get-conversations-id-messages';
 assert.throws(()=>createWorkloadServer(material('chat'),async()=>{},{[path]:{...route,bodyLimit:262145}}),{code:'INVALID_REQUEST'});
 const options={url:new URL('http://127.0.0.1:1'+path),expectedService:'chat',tenant,data:{tenant_id:tenant,request_id:randomUUID(),payload:'x'.repeat(262144)},responseLimit:8*1024*1024};
 await assert.rejects(workloadRequest(material('bff'),async()=>{},options),{code:'INVALID_REQUEST'});
});

test('Chat composed queries can complete after two seconds while ordinary owner calls still time out',async()=>{
 const keys=Object.fromEntries(['chat','bff'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID(),authority=async()=>{};
 const route={callers:['bff'],validate:v=>v,handle:async v=>{await new Promise(resolve=>setTimeout(resolve,2200));return {request_id:v.request_id};}};
 const query='/internal/v1/owners/chat/workspace-conversations',ordinary='/internal/v1/owners/chat/command-proof';
 const server=createWorkloadServer(material('chat'),authority,{[query]:route,[ordinary]:route});server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=path=>workloadRequest(material('bff'),authority,{url:new URL('http://127.0.0.1:'+server.address().port+path),expectedService:'chat',tenant,data:{tenant_id:tenant,request_id:randomUUID()}});
 try{const [result]=await Promise.all([call(query),assert.rejects(call(ordinary),{code:'DEPENDENCY_UNAVAILABLE'})]);assert.equal(typeof result.request_id,'string');}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('ingress accept and receipt use the composed deadline on client and server',async()=>{
 const keys=Object.fromEntries(['chat','connector'].map(s=>[s,randomBytes(32).toString('hex')]));
 const material=service=>({service,ca:'',cert:'',key:'',localHttp:keys}),tenant=randomUUID(),authority=async()=>{};
 const paths=['/internal/v1/chat-exchange/ingress-accept','/internal/v1/chat-exchange/ingress-read'];
 const route={callers:['connector'],validate:v=>v,handle:async v=>{await new Promise(r=>setTimeout(r,2200));return {request_id:v.request_id};}};
 const server=createWorkloadServer(material('chat'),authority,Object.fromEntries(paths.map(p=>[p,route])));server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await Promise.all(paths.map(async path=>{const data={tenant_id:tenant,request_id:randomUUID()};const result=await workloadRequest(material('connector'),authority,{url:new URL('http://127.0.0.1:'+server.address().port+path),expectedService:'chat',tenant,data});assert.equal(result.request_id,data.request_id);}));}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
