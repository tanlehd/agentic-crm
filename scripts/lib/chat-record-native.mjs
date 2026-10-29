import {nativeChatParity} from './chat-runtime-parity.mjs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {once} from 'node:events';
import {ChatGenericRecords} from '../../services/chat/dist/generic-record.js';
import {createChatRecordBff} from '../../services/core-baseline/dist/gateway/chat-record-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import {OwnerError,ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export async function chatRecordNative(ctx){
 const {check,input,row,send,peers,records,fixture,operator,chatOperator,commands,tenant,other,f,servers}=ctx;
 const reject=(work,code)=>assert.rejects(work,e=>e.code===code);
 const request=(source,patch=false)=>({...source,operation:patch?'record-patch':'record-get',command_id:randomUUID(),payload:{id:source.payload.conversation_id,...(patch?{expected_version:source.payload.expected_version,idempotency_key:randomUUID(),body:source.payload.input}:{})}});
 const policy=async(field,denied)=>operator.execute('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?',[field,JSON.stringify(denied),tenant,fixture.policy]);
 await check('Chat custom generic native envelope, closed Conversation and atomic custom patch',async()=>{
  const source=await input(),read=await send(request(source));assert.equal(read.data.version,'7');assert.equal(read.data.fields.status,'closed');assert.match(read.data.fields.contact_id,/^[0-9a-f-]{36}$/);assert(read.data.fields.opened_at.endsWith('Z'));assert(read.data.fields.closed_at.endsWith('Z'));
  const patch=request(source,true),[first,repeated]=await Promise.all([send(patch),send({...patch,command_id:randomUUID(),request_id:randomUUID()})]);assert.deepEqual(first.data,repeated.data);assert.equal(first.data.version,'8');assert.equal(first.data.owner_revision,'3');assert.equal(first.data.custom_values.owner_note,'Synthetic metadata test');assert.deepEqual(first.data.fields,read.data.fields);
  assert.equal(String((await row(source.payload.conversation_id)).version),'8');
  await reject(()=>send({...patch,payload:{...patch.payload,body:{custom_values:{owner_note:'changed'}}}}),'CONFLICT');
  await reject(()=>send({...patch,payload:{...patch.payload,expected_version:'8'}}),'CONFLICT');
 });
 await check('Chat custom generic filters new standard and custom fields, denies revoked stored receipt',async()=>{
  const source=await input(),patch=request(source,true),first=await send(patch);
  try{
   await policy('status',['read']);const read=await send(request(source));assert(!Object.hasOwn(read.data.fields,'status'));await reject(()=>send(patch),'FORBIDDEN');
   const source2=await input(),patch2=request(source2,true),redacted=await send(patch2);assert(!Object.hasOwn(redacted.data.fields,'status'));assert(Object.hasOwn(redacted.data.fields,'contact_id'));
   await policy('owner_note',['read']);const safe=await send(request(source));assert(!Object.hasOwn(safe.data.custom_values,'owner_note'));await reject(()=>send(patch),'FORBIDDEN');
   const source3=await input({owner_amount:'2.000000'});await chatOperator.execute('UPDATE crm_record SET custom_values=? WHERE tenant_id=? AND id=?',[JSON.stringify({owner_note:'Synthetic hidden field'}),tenant,source3.payload.conversation_id]);
   const result=await send(request(source3,true));assert(!Object.hasOwn(result.data.custom_values,'owner_note'));assert.equal(result.data.custom_values.owner_amount,'2.000000');
   await policy('owner_note',[]);assert.deepEqual((await send(patch)).data,first.data);assert(!Object.hasOwn((await send(patch2)).data.fields,'status'));
  }finally{await policy('owner_note',[]);}
 });
 await check('Chat custom generic retry retains original metadata and immutable response after later edits',async()=>{
  const source=await input(),patch=request(source,true),first=await send(patch);
  await operator.execute('UPDATE object_type SET schema_version=schema_version+1,version=version+1 WHERE tenant_id=? AND id=?',[tenant,f.object]);
  const metadata=peers.metadata;peers.metadata=async()=>{throw new OwnerError('DEPENDENCY_UNAVAILABLE');};
  try{assert.deepEqual((await send(patch)).data,first.data);}finally{peers.metadata=metadata;}
  const next={...patch,payload:{...patch.payload,expected_version:'8',idempotency_key:randomUUID(),body:{custom_values:{owner_note:'Synthetic later value'}}}};assert.equal((await send(next)).data.version,'9');assert.deepEqual((await send(patch)).data,first.data);
  assert.equal((await send(request(source))).data.custom_values.owner_note,'Synthetic later value');
 });
 await check('Chat custom generic forbids standard writers, stale versions, missing records and foreign tenants',async()=>{
  const source=await input(),patch=request(source,true);
  for(const fields of [{status:'open'},{owner_principal_id:f.principal},{contact_id:randomUUID()}])await reject(()=>send({...patch,payload:{...patch.payload,idempotency_key:randomUUID(),body:{fields,custom_values:{owner_note:'Synthetic'}}}}),'INVALID_REQUEST');
  await reject(()=>send({...patch,payload:{...patch.payload,expected_version:null}}),'PRECONDITION_REQUIRED');
  await reject(()=>send({...patch,payload:{...patch.payload,expected_version:'6'}}),'STALE_VERSION');
  await reject(()=>send({...request(source),payload:{id:randomUUID()}}),'NOT_FOUND');
  await reject(()=>send({...request(source),tenant_id:other}),'NOT_FOUND');
  await reject(()=>send({...request(source),actor:{kind:'service',principal_id:f.principal,delegation_id:f.principal}}),'FORBIDDEN');
  assert.equal(String((await row(source.payload.conversation_id)).version),'7');
 });
 await check('Chat custom generic source drift and Identity outage fail closed',async()=>{
  const source=await input(),req=request(source),admit=peers.admit;
  peers.admit=async(...args)=>{const result=await admit(...args);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,source.payload.conversation_id]);return result;};
  try{await reject(()=>send(req),'STALE_VERSION');}finally{peers.admit=admit;}
  peers.admit=async()=>{throw new OwnerError('DEPENDENCY_UNAVAILABLE');};try{await reject(()=>send(req),'DEPENDENCY_UNAVAILABLE');}finally{peers.admit=admit;}
 });
 await check('Chat custom generic lost result ACK recovers same committed response',async()=>{
  const source=await input(),patch=request(source,true);let drop=true;
  const lossy=new ChatGenericRecords(commands,{...peers,release:async(...args)=>{const result=await peers.release(...args);if(drop){drop=false;throw new OwnerError('DEPENDENCY_UNAVAILABLE');}return result;}});
  await reject(()=>lossy.patch(patch),'DEPENDENCY_UNAVAILABLE');assert.equal(String((await row(source.payload.conversation_id)).version),'8');assert.equal((await send(patch)).data.version,'8');assert.equal(String((await row(source.payload.conversation_id)).version),'8');
 });
 await check('Chat custom generic native public session, CSRF, ETag and exact routes'+(process.argv.includes('--with-runtime')?' runtime':''),async()=>{
  const candidate=process.argv.includes('--with-runtime')?await nativeChatParity(ctx,{crm:new URL(ctx.protocol+'//127.0.0.1:'+ctx.crmServer.address().port+'/')}):null;
  try{
  const runtimeSend=candidate?ownerCommandClient(ctx.crmMaterial,remoteRegistryAuthority(ctx.crmMaterial,ctx.registryConfig),'chat',candidate.url):send;
  const source=await input(),server=createChatRecordBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),runtimeSend);servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');
  const root='http://127.0.0.1:'+server.address().port+'/api/v1/objects/conversation/records/'+source.payload.conversation_id;
  const headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession,'content-type':'application/json',origin:'http://localhost:18080','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'idempotency-key':randomUUID(),'if-match':'"7"'};
  assert.equal((await fetch(root)).status,401);const read=await fetch(root,{headers});assert.equal(read.status,200);assert.equal(read.headers.get('etag'),'"7"');assert.equal(read.headers.get('cache-control'),'no-store');
  const body=JSON.stringify(source.payload.input);assert.equal((await fetch(root,{method:'PATCH',headers:{...headers,'x-csrf-token':'invalid'},body})).status,403);
  const response=await fetch(root,{method:'PATCH',headers,body});assert.equal(response.status,200);assert.equal(response.headers.get('etag'),'"8"');const first=await response.json();
  const replay=await fetch(root,{method:'PATCH',headers,body});assert.equal(replay.status,200);assert.deepEqual((await replay.json()).data,first.data);
  assert.equal((await fetch(root,{method:'PATCH',headers:{...headers,'idempotency-key':randomUUID()},body:'{"custom_values":{"owner_note":"x"},"custom_values":{}}'})).status,400);
  assert.equal((await fetch(root,{method:'PATCH',headers,body:JSON.stringify({custom_values:{owner_note:'x'.repeat(65536)}})})).status,413);
  assert.equal((await fetch(root+'/archive',{method:'POST',headers,body:'{}'})).status,404);assert.equal((await fetch(root+'?extra=1',{headers})).status,404);
  }finally{if(candidate)await candidate.stop();}
 });
 await check('Chat custom generic native logout after admission prevents read completion',async()=>{
  const source=await input(),session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=request(source);req.actor={...req.actor,delegation_id:enrolled.delegationId};
  const admit=peers.admit;peers.admit=async(...args)=>{const result=await admit(...args);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return result;};
  try{await reject(()=>send(req),'INVALID_TRANSITION');}finally{peers.admit=admit;}
  assert.equal(String((await row(source.payload.conversation_id)).version),'7');
 });
}
