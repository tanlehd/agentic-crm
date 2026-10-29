import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { databaseSource } from '../services/core-baseline/dist/kernel/database/data-source.js';
import { migrate } from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import { fixtureId } from '../services/core-baseline/dist/modules/identity/seed.js';
import { MarketingAuthority } from '../services/core-baseline/dist/modules/channels/marketing-authority.js';
import { MarketingGraph } from '../services/core-baseline/dist/modules/channels/marketing-graph.js';
import { MarketingCrypto,MarketingIntegrationAuth } from '../services/core-baseline/dist/modules/channels/marketing-security.js';
import { MarketingAuthorityController } from '../services/core-baseline/dist/modules/channels/marketing-http.js';
import { MarketingAuthorityRuntime } from '../services/core-baseline/dist/modules/channels/marketing-http.js';
import { AuthRuntime } from '../services/core-baseline/dist/modules/identity/auth/http.js';
import { safeJsonBody } from '../services/core-baseline/dist/kernel/http/json-body.js';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url));
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_DATABASE,'native_identity_test');
Object.assign(process.env,env,{MYSQL_DATABASE:'native_seed_test'});
const ds=databaseSource(true);await ds.initialize();
const groups=[];async function test(name,fn){await fn();groups.push(name);console.log('PASS '+name);}
const bad=(fn,code)=>assert.rejects(fn,e=>e.code===code);
const tA=fixtureId('clinic_alpha'),tB=fixtureId('clinic_beta');
const config={appId:'mkt_'+randomUUID().replaceAll('-','').slice(0,24),keyId:'fixture-key',encryptionKey:randomBytes(32).toString('hex'),operationKey:randomBytes(32).toString('hex')};
const pageIdA=config.appId+'A',pageIdB=config.appId+'B';
const external='9007199254740993123456789',token=randomBytes(32).toString('hex'),integrationToken=randomBytes(32).toString('hex');
const graph=new MarketingGraph(async(url,init)=>{
 assert.equal(new URL(url).origin,'https://graph.facebook.com');assert.equal(init.redirect,'error');assert.equal(init.headers.authorization,'Bearer '+token);assert(!url.includes(token));
 const u=new URL(url);let body;
 if(u.pathname.endsWith('/ads'))body={data:[{id:'ad-1',account_id:external}],paging:{}};
 else if(u.pathname.endsWith('/act_'+external))body={id:'act_'+external,account_id:external,currency:'VND',timezone_name:'Asia/Ho_Chi_Minh'};
 else body={id:'creative-1',account_id:external,actor_id:pageIdA,object_story_spec:{page_id:pageIdA,private_user_data:'must-not-survive',link_data:{message:'Synthetic creative',access_token:'discard'}},access_token:'discard'};
 return Response.json(body);
});
const authority=new MarketingAuthority(ds,config,graph);
let a,b,accountA,accountB,ctx,pageA,pageB;
try{
 await test('forward27 and warm migration preserve existing fixture rows',async()=>{
  const before=await ds.query('SELECT id,tenant_id,provider,status FROM channel_connection ORDER BY id');await migrate(ds);assert.equal(await migrate(ds),0);assert.deepEqual(await ds.query('SELECT id,tenant_id,provider,status FROM channel_connection ORDER BY id'),before);
  accountA=(await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tA,fixtureId('alpha:member:alpha_admin')]))[0].account_id;
  accountB=(await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tB,fixtureId('beta:member:beta_admin')]))[0].account_id;
 });
 await test('native admin creates encrypted shared-account credentials, no token in receipt/audit',async()=>{
  const body={operation_id:randomUUID(),app_id:config.appId,external_account_id:external,token};a=await authority.mutate(accountA,tA,'create',undefined,body);b=await authority.mutate(accountB,tB,'create',undefined,{...body,operation_id:randomUUID()});assert.notEqual(a.id,b.id);assert.equal((await authority.mutate(accountA,tA,'create',undefined,body)).id,a.id);
  await bad(()=>authority.mutate(accountA,tB,'create',undefined,{...body,operation_id:randomUUID()}),'FORBIDDEN');
  const [stored]=await ds.query('SELECT token_ciphertext FROM channel_marketing_credential WHERE tenant_id=? AND id=?',[tA,a.id]);assert(!stored.token_ciphertext.includes(token));const crypto=new MarketingCrypto(config);assert.equal(crypto.open(stored.token_ciphertext,tA,a.id,external,config.keyId),token);assert.throws(()=>crypto.open(stored.token_ciphertext,tB,a.id,external,config.keyId));
  const records=await ds.query('SELECT request_hash,response_body FROM idempotency_record WHERE tenant_id=? AND `key`=?',[tA,body.operation_id]);assert(!JSON.stringify(records).includes(token));assert(!JSON.stringify(await authority.list(accountA,tA,{})).includes('token_ciphertext'));
 });
 await test('integration registry isolates tenant/credential and rejects browser/forged token',async()=>{
  const registration={connection_id:randomUUID(),tenant_id:tA,consumer:'marketing',audience:'marketing-authority',credential_ids:[a.id],token_hashes:[createHash('sha256').update(integrationToken).digest('hex')],active:true};const auth=new MarketingIntegrationAuth(JSON.stringify([registration]));
  ctx=auth.authenticate({'x-integration-id':registration.connection_id,authorization:'Bearer '+integrationToken});assert.equal(ctx.tenant_id,tA);assert.throws(()=>auth.authenticate({'x-integration-id':registration.connection_id,authorization:'Bearer '+integrationToken,origin:'http://localhost'}));assert.throws(()=>auth.authenticate({'x-integration-id':registration.connection_id,authorization:'Bearer '+'0'.repeat(64)}));
  await bad(()=>authority.graphRead(ctx,{credential_ref:b.id,operation:'account'}),'INTEGRATION_FORBIDDEN');
 });
 await test('Graph proxy selected fields, nested minimization and fixed account',async()=>{
  const r=await authority.graphRead(ctx,{credential_ref:a.id,operation:'creative',external_id:'creative-1'});assert.equal(r.payload.actor_id,pageIdA);assert(!JSON.stringify(r).includes('must-not-survive'));assert(!JSON.stringify(r).includes('access_token'));assert.equal(r.credential_revision,'1');
  await bad(()=>authority.graphRead(ctx,{credential_ref:a.id,operation:'creative',external_id:'creative-1',url:'https://example.com'}),'INVALID_REQUEST');
  await bad(()=>new MarketingGraph(async()=>Response.json({id:'act_'+external,account_id:'foreign'})).verify(external,token),'ACCOUNT_MISMATCH');
  await bad(()=>new MarketingGraph(async()=>new Response('x'.repeat(1048577))).verify(external,token),'PROVIDER_UNAVAILABLE');
 });
 await test('Page match works while messaging disabled; foreign skip and unknown defer sanitized',async()=>{
  for(const [tenant,label] of [[tA,'A'],[tB,'B']]){
   const id=randomUUID(),team=fixtureId((label==='A'?'alpha':'beta')+':team:reception');const [validTeam]=await ds.query('SELECT id FROM team WHERE tenant_id=? LIMIT 1',[tenant]);
   await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'messenger',?,'disabled',?)",[id,tenant,(label==='A'?pageIdA:pageIdB),validTeam?.id??team]);
   await ds.query('INSERT INTO facebook_page(tenant_id,connection_id,app_id,page_id,name,connected_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id,config.appId,(label==='A'?pageIdA:pageIdB),'Synthetic Marketing '+label]);if(label==='A')pageA=id;else pageB=id;
  }
  assert.equal((await authority.pageCheck(ctx,{credential_ref:a.id,page_id:pageIdA})).decision,'match');assert.deepEqual(await authority.pageCheck(ctx,{credential_ref:a.id,page_id:pageIdB}),{decision:'skip'});assert.deepEqual(await authority.pageCheck(ctx,{credential_ref:a.id,page_id:'unknown'}),{decision:'defer'});
 });
 const grant=()=>({operation_id:randomUUID(),credential_ref:a.id,expected_credential_revision:'1',page_id:pageIdA,expected_page_revision:'1',external_ad_id:'ad-1',payload_sha256:'a'.repeat(64),run_id:randomUUID(),fence:'1',fetched_at:new Date().toISOString()});
 let accepted,request;
 await test('admission idempotency, receipt recovery, conflict and stale checks',async()=>{
  request=grant();accepted=await authority.admit(ctx,request);assert.equal(accepted.page_binding_ref,pageA);assert.deepEqual(await authority.admit(ctx,request),accepted);assert.deepEqual(await authority.getReceipt(ctx,request.operation_id),accepted);
  await bad(()=>authority.admit(ctx,{...request,payload_sha256:'b'.repeat(64)}),'IDEMPOTENCY_CONFLICT');await bad(()=>authority.admit(ctx,{...grant(),expected_page_revision:'99'}),'ADMISSION_STALE');await bad(()=>authority.admit(ctx,{...grant(),fetched_at:'2020-01-01T00:00:00Z'}),'OBSERVATION_STALE');
  assert.deepEqual(await authority.admit(ctx,{...grant(),page_id:pageIdB}),{decision:'skip'});
  const count=await ds.query('SELECT COUNT(*) n FROM channel_marketing_admission_receipt WHERE tenant_id=? AND credential_id=?',[tA,a.id]);assert.equal(Number(count[0].n),1);
 });
 await test('Page revoke stops new grants and preserves accepted historical receipt',async()=>{
  await authority.mutate(accountA,tA,'page',pageA,{operation_id:randomUUID(),expected_version:'1',enabled:false});assert.deepEqual(await authority.admit(ctx,grant()),{decision:'defer'});assert.deepEqual(await authority.admit(ctx,request),accepted);
  await bad(()=>authority.mutate(accountA,tA,'page',pageB,{operation_id:randomUUID(),expected_version:'1',enabled:false}),'NOT_FOUND');
 });
 await test('credential revoke blocks new proxy reads; other tenant unaffected',async()=>{
  await authority.mutate(accountA,tA,'revoke',a.id,{operation_id:randomUUID(),expected_version:'1'});await bad(()=>authority.graphRead(ctx,{credential_ref:a.id,operation:'account'}),'CREDENTIAL_DENIED');await bad(()=>authority.admit(ctx,grant()),'ADMISSION_STALE');assert.deepEqual(await authority.getReceipt(ctx,request.operation_id),accepted);
  const [row]=await ds.query('SELECT status FROM channel_marketing_credential WHERE tenant_id=? AND id=?',[tB,b.id]);assert.equal(row.status,'active');
 });
 await test('native controller requires CSRF and sanitizes unexpected failures',async()=>{
  let ready=false,called=false;const controller=new MarketingAuthorityController({service:{requireMutation:async()=>{throw {unsafe:token};}}},{ready:async()=>{ready=true;},service:{mutate:async()=>{called=true;}}});
  let response='';const res={setHeader(){},end(v){response=v;},statusCode:0};await controller.create({headers:{'content-type':'application/json'},query:{},params:{},body:{token}},res);assert.equal(res.statusCode,503);assert(!response.includes(token));assert.equal(ready,false);assert.equal(called,false);
 });
 await test('concurrent admission/revoke has one authority order',async()=>{
  await authority.mutate(accountA,tA,'replace',a.id,{operation_id:randomUUID(),expected_version:'2',token});await authority.mutate(accountA,tA,'page',pageA,{operation_id:randomUUID(),expected_version:'2',enabled:true});
  const req={...grant(),expected_credential_revision:'3',expected_page_revision:'3'};
  const outcomes=await Promise.allSettled([authority.admit(ctx,req),authority.mutate(accountA,tA,'page',pageA,{operation_id:randomUUID(),expected_version:'3',enabled:false})]);assert.equal(outcomes[1].status,'fulfilled');assert.equal(outcomes[0].status,'fulfilled');const decision=outcomes[0].value;assert(decision.receipt_id||decision.decision==='defer');assert.deepEqual(await authority.pageCheck(ctx,{credential_ref:a.id,page_id:pageIdA}),{decision:'defer'});
 });
 await test('dedicated role executes authority while history/CRM/auth/DDL stay protected',async()=>{
  const role=parseEnv(await readFile('.local/marketing-authority-test.env','utf8'));const restricted=databaseSource(true,{user:role.MYSQL_MARKETING_USER,password:role.MYSQL_MARKETING_PASSWORD});await restricted.initialize();assert((await restricted.query('SELECT CURRENT_USER() actual'))[0].actual.startsWith(role.MYSQL_MARKETING_USER+'@'));
  try{const svc=new MarketingAuthority(restricted,config,graph);assert.equal((await svc.getReceipt(ctx,request.operation_id)).receipt_id,accepted.receipt_id);assert((await svc.list(accountA,tA,{})).items.length>0);await svc.mutate(accountA,tA,'replace',a.id,{operation_id:randomUUID(),expected_version:'3',token});
   for(const sql of ['SELECT * FROM account_credential LIMIT 0','SELECT * FROM contact LIMIT 0','SELECT * FROM crm_marketing.marketing_account LIMIT 0','UPDATE channel_marketing_admission_receipt SET fence=fence WHERE 1=0','DELETE FROM channel_marketing_credential WHERE 1=0','UPDATE facebook_page SET token_ciphertext=NULL WHERE 1=0','CREATE TABLE forbidden(id INT)'])await assert.rejects(()=>restricted.query(sql));
  }finally{await restricted.destroy();}
 });
 await test('real Nest HTTP private routes: auth, scope, strict body, sanitized errors',async()=>{
  const {Module,RequestMethod}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
  const registry=new MarketingIntegrationAuth(JSON.stringify([{...ctx,token_hashes:[createHash('sha256').update(integrationToken).digest('hex')]}]));
  class TestModule{}Module({controllers:[MarketingAuthorityController],providers:[{provide:AuthRuntime,useValue:{service:{session:async()=>{throw new Error('not authenticated');},requireMutation:async()=>{throw new Error('not authenticated');}}}},{provide:MarketingAuthorityRuntime,useValue:{integration:registry,service:authority,ready:async()=>{}}}]})(TestModule);
  const app=await NestFactory.create(TestModule,{logger:false,bodyParser:false});safeJsonBody(app);app.setGlobalPrefix('api/v1',{exclude:[{path:'internal/v1/marketing-authority/{*path}',method:RequestMethod.ALL}]});await app.listen(0,'127.0.0.1');
  try{const origin=await app.getUrl(),headers={'content-type':'application/json','x-integration-id':ctx.connection_id,authorization:'Bearer '+integrationToken};
   let r=await fetch(origin+'/internal/v1/marketing-authority/page-check',{method:'POST',headers,body:JSON.stringify({credential_ref:a.id,page_id:pageIdA})});assert.equal(r.status,200);assert.equal((await r.json()).data.decision,'defer');
   r=await fetch(origin+'/internal/v1/marketing-authority/receipts/'+request.operation_id,{headers});assert.equal(r.status,200);assert.equal((await r.json()).data.receipt_id,accepted.receipt_id);
   r=await fetch(origin+'/api/v1/admin/channels/marketing/credentials',{method:'POST',headers,body:'{"token":'+token});assert.equal(r.status,400);assert(!(await r.text()).includes(token));
   for(const [body,extra,status] of [[{credential_ref:b.id,page_id:pageIdB},{},403],[{credential_ref:a.id,page_id:pageIdA,tenant_id:tB},{},400],[{credential_ref:a.id,page_id:pageIdA},{origin:'http://localhost'},403]]){r=await fetch(origin+'/internal/v1/marketing-authority/page-check',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});assert.equal(r.status,status);const error=await r.text();assert(!error.includes(token));assert(!error.includes(tB));}
  }finally{await app.close();}
 });
 await mkdir('artifacts/marketing-authority',{recursive:true});await writeFile('artifacts/marketing-authority/mysql-latest.json',JSON.stringify({groups,passed:groups.length,database:'native_seed_test',migration:27,reset:false,liveMeta:'NOT_RUN'},null,2));console.log('PASS '+groups.length+' authority MySQL/transport groups');
}finally{await ds.destroy();}
