import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {nativeChatParity} from './chat-runtime-parity.mjs';
import {ownerClient} from '../../packages/workload-transport/dist/index.js';
import {ExternalChatReadGateway} from '../../services/core-baseline/dist/gateway/chat-external-read.js';
import {ExternalData} from '../../services/core-baseline/dist/modules/external-api/service.js';
import {ExternalController,ExternalRuntime} from '../../services/core-baseline/dist/modules/external-api/http.js';
import {AuthRuntime} from '../../services/core-baseline/dist/modules/identity/auth/http.js';

export async function chatRuntimeNative(ctx){
 const {check,tenant,other,bffMaterial,bffAuthority,policyUrl,apps,admissions,token,fixture}=ctx;
 await check('Chat external runtime four public reads preserve app admission, fields, tenant, parent and cursor across crash',async()=>{
  const candidate=await nativeChatParity(ctx,{identity:policyUrl},fixture.cursorKey);let app;
  try{
   const prepare=ownerClient(bffMaterial,bffAuthority,'chat',candidate.url);
   const gateway=new ExternalChatReadGateway(admissions,r=>prepare(r.tenant_id,'external-prepare',r),candidate.call),data=new ExternalData(apps,null,gateway);
   const require=createRequire(new URL('../../services/core-baseline/package.json',import.meta.url)),{Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
   class PublicModule{}Module({controllers:[ExternalController],providers:[{provide:AuthRuntime,useValue:{}},{provide:ExternalRuntime,useValue:{ready:async()=>{},data}}]})(PublicModule);
   app=await NestFactory.create(PublicModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
   const origin=await app.getUrl(),get=async(path,status=200)=>{const r=await fetch(origin+'/api/v1/external/'+path,{headers:{Authorization:'Bearer '+token,'x-tenant-id':tenant}});assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');return r.json();};
   for(const path of ['conversations','conversations/'+fixture.conversation,'conversations/'+fixture.conversation+'/messages','conversations/'+fixture.conversation+'/messages/'+fixture.messages[0]])assert((await get(path)).data);
   const detail=await get('conversations/'+fixture.conversation);assert.equal(detail.data.properties.contact_id,fixture.contact);assert(!Object.hasOwn(detail.data.properties,'opened_at'));
   await get('conversations/'+fixture.sibling+'/messages/'+fixture.messages[0],404);
   const page=await get('conversations/'+fixture.conversation+'/messages?limit=1');assert(page.next_cursor);
   await candidate.crashRestart();const next=await get('conversations/'+fixture.conversation+'/messages?limit=1&cursor='+encodeURIComponent(page.next_cursor));assert.equal(next.data.length,1);assert.notEqual(next.data[0].id,page.data[0].id);
   const id=randomUUID(),foreign={schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:other,command_id:id,operation:'external-conversations',actor:{kind:'app',principal_id:fixture.app,delegation_id:id},payload:{limit:1}};
   await assert.rejects(prepare(other,'external-prepare',foreign),e=>e.code==='FORBIDDEN');assert(candidate.proofCount()>0);
  }finally{if(app)await app.close();await candidate.stop();}
 });
}
