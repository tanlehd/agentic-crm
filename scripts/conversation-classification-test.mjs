import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {migrate} from '../apps/backend/dist/kernel/database/migration-runner.js';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {seedRegistry} from '../apps/backend/dist/modules/crm/seed.js';
import {Conversations} from '../apps/backend/dist/modules/conversation/domain.js';
import {ConversationClassification} from '../apps/backend/dist/modules/conversation/classification.js';
import {SessionProgress} from '../apps/backend/dist/modules/conversation/session-progress.js';
import {MessengerIntake} from '../apps/backend/dist/modules/channels/intake.js';
import {CrmRecords} from '../apps/backend/dist/modules/crm/records.js';
import {coreDomains,contactReferences} from '../apps/backend/dist/modules/crm/core.js';
import {leadDomain,LeadService} from '../apps/backend/dist/modules/sales/leads.js';
import {Routing} from '../apps/backend/dist/modules/agents/routing.js';
import {OutboundDispatcher} from '../apps/backend/dist/modules/conversation/outbound.js';
const config=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(config.MYSQL_DATABASE,'native_identity_test');assert.equal(config.MYSQL_HOST,'127.0.0.1');assert.equal(config.APP_ENV,'test');
const env={...config,MYSQL_DATABASE:'native_seed_test',IDENTITY_SEED_MODE:'native',APP_ORIGIN:'http://localhost:18080'};Object.assign(process.env,env);
const ds=databaseSource(true);await ds.initialize();const checks=[],test=async(name,run)=>{await run();checks.push(name);console.log('PASS '+name);};
const schema=JSON.parse(await readFile('packages/contracts/schemas/conversation-classification.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
const wire=(name,result)=>{const validate=ajv.getSchema('conversation-classification.json#/definitions/'+name);assert(validate({...result,meta:{correlation_id:'synthetic'}}),JSON.stringify(validate.errors));};
try{
 await test('forward31, repeat, metadata and tenant-bound DDL',async()=>{await migrate(ds);assert.equal(await migrate(ds),0);await seedRegistry(ds,env);const rows=await ds.query("SELECT TABLE_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('session_classification','session_contribution') AND COLUMN_NAME='tenant_id'");assert.equal(rows.length,2);assert(rows.every(r=>r.IS_NULLABLE==='NO'));});
 const tenant=fixtureId('clinic_alpha'),principal=fixtureId('alpha:human:alpha_admin'),member=fixtureId('alpha:member:alpha_admin'),[membership]=await ds.query('SELECT account_id,seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,member]),account=membership.account_id;
 const conversations=new Conversations(ds,'synthetic-classification'),service=new ConversationClassification(conversations),progress=new SessionProgress(conversations),routing=new Routing(ds),intake=new MessengerIntake(ds);
 const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));const records=new CrmRecords(ds,'synthetic-classification',domains),leads=new LeadService(records,contactReferences),field='round_reason_demo';
 let [type]=await ds.query("SELECT * FROM object_type WHERE tenant_id=? AND `key`='conversation_session'",[tenant]);
 await test('canonical definitions restrict defaults, required, query and reserved stage',async()=>{
  const create=body=>records.mutate(account,tenant,{object:'conversation_session',kind:'properties'},body,randomUUID(),String(type.version),'synthetic');
  const b={key:field,label:'Lý do liên hệ DEMO',type:'enum',required:false,indexed:false,sensitive:false,options:['sales','support']};
  if(!(await records.read(account,tenant,{object:'conversation_session',kind:'properties'})).data.some(p=>p.key===field)){await create(b);[type]=await ds.query('SELECT * FROM object_type WHERE tenant_id=? AND id=?',[tenant,type.id]);}
  for(const extra of [{required:true,default_value:'sales'},{indexed:true},{default_value:'sales'},{key:'stage'}])await assert.rejects(()=>create({...b,key:'invalid_'+randomUUID().slice(0,8),...extra}),e=>e.code==='CLASSIFICATION_PROPERTY_UNSUPPORTED');
 });
 const subject='round-'+randomUUID();
 const inbound=async(ad,sub=subject)=>{const id=randomUUID(),[clock]=await ds.query('SELECT UTC_TIMESTAMP(3) now');await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),{provider_event_id:id,provider_message_id:id,external_subject_id:sub,occurred_at:new Date(clock.now).toISOString(),message:{type:'text',text:'Synthetic Conversation classification'},...(ad?{referral:{source:'ctm',ad_id:ad}}:{})},id);for(const claim of await intake.claim())await intake.process(claim);const [r]=await ds.query('SELECT * FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,id]);assert.equal(r.status,'processed');return r.conversation_id;};
 const cid=await inbound(),sid=(await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0].id;
 const read=async(session=sid)=>{const r=await service.read(account,tenant,cid,session);wire('conversation-classification-response',r);return r.data;};
 const history=async(session=sid,q={})=>{const r=await service.history(account,tenant,cid,session,q);wire('conversation-contributions-response',r);return r.data;};
 const save=async(values,session=sid)=>service.mutate(account,tenant,cid,session,{values},randomUUID(),(await read(session)).version,'synthetic');
 await test('empty new episode; typed CAS and replay are atomic',async()=>{assert.equal((await read()).version,'0');assert.deepEqual((await read()).values,{});const k=randomUUID(),b={values:{[field]:'sales'}};const first=await service.mutate(account,tenant,cid,sid,b,k,'0','synthetic');wire('conversation-classification-result',first.body);assert.deepEqual(await service.mutate(account,tenant,cid,sid,b,k,'0','replay'),first);await assert.rejects(()=>service.mutate(account,tenant,cid,sid,b,randomUUID(),'0','synthetic'),e=>e.code==='VERSION_CONFLICT');assert.equal((await history()).history.filter(h=>h.kind==='classification').length,1);await assert.rejects(()=>save({[field]:'unknown'}),e=>e.status===422);});
 await test('new ad and owner/team transfers retain episode, stage and fields',async()=>{
  const p=(await progress.read(account,tenant,cid,sid)).data;await progress.mutate(account,tenant,cid,sid,{action:'stage',stage_key:p.process.definition.stages[1].key,reason:'Synthetic stage'},randomUUID(),p.version,'synthetic');await inbound('synthetic-new-ad');
  const assign=async(owner,team)=>{const r=(await conversations.read(account,tenant,cid)).data;return routing.mutate(account,tenant,cid,false,{owner_principal_id:owner,team_id:team,reason:'handoff'},randomUUID(),r.version,'synthetic');};
  await assign(principal,fixtureId('alpha:team:intake'));
  const r=(await conversations.read(account,tenant,cid)).data;await conversations.mutate(account,tenant,cid,'messages',{text:'Synthetic author preserved',owner_revision:r.owner_revision},randomUUID(),undefined,'synthetic');
  await assign(null,fixtureId('alpha:team:sales'));await assign(principal,fixtureId('alpha:team:intake'));
  assert.equal((await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0].id,sid);assert.equal((await read()).values[field],'sales');assert.equal((await progress.read(account,tenant,cid,sid)).data.stage_key,p.process.definition.stages[1].key);
  const h=await history(),transfers=h.history.filter(h=>h.kind==='assignment');assert.equal(transfers.length,3);assert.equal(transfers[1].payload.to_team_id,fixtureId('alpha:team:sales'));assert.equal(h.history.find(h=>h.kind==='outbound_submitted').actor.id,principal);assert.equal(h.coverage,'full');
  const teams=await routing.read(account,tenant,cid,'teams');wire('conversation-assignment-teams-response',teams);assert(teams.data.length>=2);await routing.read(account,tenant,cid,'targets',{team_id:fixtureId('alpha:team:sales')});await assert.rejects(()=>routing.read(account,tenant,cid,'targets',{team_id:fixtureId('beta:team:sales')}));
 });
 await test('outcome actor and source binding visible without changing owner',async()=>{const thread=(await conversations.read(account,tenant,cid)).data;const lead=await leads.create(account,tenant,{contact_id:thread.contact_id,conversation_id:cid,conversation_session_id:sid},randomUUID(),'synthetic');const h=(await history()).history.find(h=>h.kind==='outcome'&&h.payload.record_id===lead.body.data.id);assert(h);assert.equal(h.actor.id,principal);assert.equal(h.payload.role,'created');assert.equal((await history()).owner.id,principal);});
 await test('concurrent writers leave one CAS effect',async()=>{const version=(await read()).version;const results=await Promise.allSettled(['sales','support'].map(v=>service.mutate(account,tenant,cid,sid,{values:{[field]:v}},randomUUID(),version,'synthetic')));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='VERSION_CONFLICT').length,1);});
 await test('live field deny removes values/history and prevents replay; revoke capability blocks mutation',async()=>{
  const roles=await ds.query('SELECT r.id,r.`key`,r.permissions FROM role r JOIN principal_role p ON p.tenant_id=r.tenant_id AND p.role_id=r.id WHERE p.tenant_id=? AND p.principal_id=?',[tenant,principal]);const policy=randomUUID(),key=randomUUID(),version=(await read()).version,body={values:{[field]:'support'}};await service.mutate(account,tenant,cid,sid,body,key,version,'synthetic');
  // Disable only the synthetic test user's tenant-admin bypass; retain its grants.
  try{
   await ds.query("UPDATE membership SET seat_code='chat' WHERE tenant_id=? AND id=?",[tenant,member]);
   await ds.query('INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,?,JSON_ARRAY(?,?),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[policy,tenant,roles[0].id,type.id,field,'read','write']);
   const hidden=await read();assert(!Object.hasOwn(hidden.values,field));assert(!hidden.definitions.some(d=>d.key===field));assert(!(await history()).history.some(h=>h.kind==='classification'&&h.payload.changes[field]));await assert.rejects(()=>service.mutate(account,tenant,cid,sid,body,key,version,'synthetic'),e=>e.status===403);
   await ds.query("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,member]);await assert.rejects(()=>save({[field]:'sales'}),e=>e.status===403);
  }finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,policy]);await ds.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[membership.seat_code,tenant,member]);}
 });
 await test('wrong tenant and wrong thread cannot read or mutate episode',async()=>{const beta=fixtureId('clinic_beta'),[m]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[beta,fixtureId('beta:member:beta_admin')]);await assert.rejects(()=>service.read(m.account_id,beta,cid,sid),e=>e.status===404);const other=await inbound(undefined,'other-'+randomUUID());await assert.rejects(()=>service.read(account,tenant,other,sid),e=>e.status===404);});
 await test('transfer without outcome permission; late sent receipt retains actual actor and historical team',async()=>{
  const anna=fixtureId('alpha:human:chat_anna'),[m]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:chat_anna')]);
  const roles=await ds.query('SELECT r.id,r.permissions FROM role r JOIN principal_role p ON p.tenant_id=r.tenant_id AND p.role_id=r.id WHERE p.tenant_id=? AND p.principal_id=?',[tenant,anna]);
  const memberships=await ds.query('SELECT team_id,active FROM team_member WHERE tenant_id=? AND principal_id=?',[tenant,anna]);
  const assign=async(who,owner,team)=>{const r=(await conversations.read(account,tenant,cid)).data;return routing.mutate(who,tenant,cid,false,{owner_principal_id:owner,team_id:team,reason:'handoff'},randomUUID(),r.version,'synthetic');};
  try{
   const permissions=[...['read','update','reply','note','assign'].map(action=>({resource:'conversation',action,scope:'all'})),{resource:'contact',action:'read',scope:'all'}];
   for(const role of roles)await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions),tenant,role.id]);
   await assign(account,anna,fixtureId('alpha:team:intake'));
   const contact=(await conversations.read(account,tenant,cid)).data.contact_id;
   await assert.rejects(()=>leads.create(m.account_id,tenant,{contact_id:contact,conversation_id:cid,conversation_session_id:sid},randomUUID(),'synthetic'),e=>e.status===403);
   await assign(m.account_id,null,fixtureId('alpha:team:sales'));await assign(account,anna,fixtureId('alpha:team:intake'));
   const r=(await conversations.read(account,tenant,cid)).data;
   const sent=await conversations.mutate(m.account_id,tenant,cid,'messages',{text:'Synthetic late receipt',owner_revision:r.owner_revision},randomUUID(),undefined,'synthetic');
   const queued=await conversations.mutate(m.account_id,tenant,cid,'messages',{text:'Synthetic queued cancellation',owner_revision:r.owner_revision},randomUUID(),undefined,'synthetic');
   const dispatcher=new OutboundDispatcher(ds,{send:async()=>{await assign(account,principal,fixtureId('alpha:team:intake'));return {status:'sent',providerMessageId:randomUUID()};},lookup:async()=>null});
   await dispatcher.dispatch(tenant,cid,sent.body.data.id);
   const [intent]=await ds.query('SELECT status,actor_id FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,sent.body.data.id]);assert.equal(intent.status,'sent');assert.equal(intent.actor_id,anna);
   assert.equal((await ds.query('SELECT status FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,queued.body.data.id]))[0].status,'cancelled');
   const before=(await history()).history.find(h=>h.source_id===sent.body.data.message_id);assert.equal(before.actor.id,anna);assert.equal(before.handling_team_id,fixtureId('alpha:team:intake'));
   await ds.query('UPDATE team_member SET active=0 WHERE tenant_id=? AND principal_id=?',[tenant,anna]);assert.deepEqual((await history()).history.find(h=>h.id===before.id),before);
  }finally{for(const role of roles)await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[typeof role.permissions==='string'?role.permissions:JSON.stringify(role.permissions),tenant,role.id]);for(const row of memberships)await ds.query('UPDATE team_member SET active=? WHERE tenant_id=? AND principal_id=? AND team_id=?',[row.active,tenant,anna,row.team_id]);}
 });
 await test('close/field race; new inbound starts empty; old owner frozen across later assignment',async()=>{
  const r=(await conversations.read(account,tenant,cid)).data,version=(await read()).version;const results=await Promise.allSettled([service.mutate(account,tenant,cid,sid,{values:{[field]:'support'}},randomUUID(),version,'synthetic'),conversations.mutate(account,tenant,cid,'transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),r.version,'synthetic')]);assert.equal(results[1].status,'fulfilled');if(results[0].status==='rejected')assert.equal(results[0].reason.code,'SESSION_CLOSED');
  await assert.rejects(()=>save({[field]:'sales'}),e=>e.code==='SESSION_CLOSED');await inbound();const next=(await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0];assert.notEqual(next.id,sid);assert.deepEqual((await read(next.id)).values,{});assert.equal((await read()).status,'closed');const current=(await conversations.read(account,tenant,cid)).data;await routing.mutate(account,tenant,cid,false,{owner_principal_id:null,team_id:fixtureId('alpha:team:sales'),reason:'handoff'},randomUUID(),current.version,'synthetic');assert.equal((await history()).owner.id,principal);assert.equal((await history(next.id)).owner.id,null);
 });
 await test('legacy coverage remains unknown; stable keyset and query index',async()=>{
  const [legacy]=await ds.query('SELECT x.id,x.conversation_id FROM conversation_acquisition_session x LEFT JOIN session_contribution c ON c.tenant_id=x.tenant_id AND c.session_id=x.id WHERE x.tenant_id=? AND c.id IS NULL LIMIT 1',[tenant]);assert(legacy);assert.equal((await service.history(account,tenant,legacy.conversation_id,legacy.id)).data.coverage,'none');
  const plan=await ds.query('EXPLAIN SELECT * FROM session_contribution WHERE tenant_id=? AND session_id=? AND revision<? ORDER BY revision DESC LIMIT 51',[tenant,sid,'999999']);assert(['PRIMARY','uq_session_contribution_source'].includes(plan[0].key));assert.notEqual(plan[0].type,'ALL');
  const current=(await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0].id;
  for(let i=0;i<52;i++)await save({[field]:i%2?'sales':'support'},current);
  const h=await history(current);assert.equal(h.history.length,50);assert(h.next_before_revision);const older=await history(current,{before_revision:h.next_before_revision});assert(older.history.length>=4);assert(!older.history.some(x=>h.history.some(y=>x.id===y.id)));
 });
 await mkdir('artifacts/conversation-classification',{recursive:true});await writeFile('artifacts/conversation-classification/native.json',JSON.stringify({at:new Date().toISOString(),database:'native_seed_test',checks,thread:cid,session:sid},null,2));
}finally{await ds.destroy();}
