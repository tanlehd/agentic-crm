import { Conversations } from '../apps/backend/dist/modules/conversation/domain.js';
import { OrganicSalesReport } from '../apps/backend/dist/modules/sales/organic-report.js';
import { dealDomain,DealService } from '../apps/backend/dist/modules/sales/deals.js';
import { seedSalesBase } from '../apps/backend/dist/modules/identity/sales-base-fixture.js';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID,createHash } from 'node:crypto';
import { databaseSource } from '../apps/backend/dist/kernel/database/data-source.js';
import { migrate } from '../apps/backend/dist/kernel/database/migration-runner.js';
import { seedIdentity,seedUsers,fixtureId } from '../apps/backend/dist/modules/identity/seed.js';
import { seedRegistry } from '../apps/backend/dist/modules/crm/seed.js';
import { seedM1 } from '../apps/backend/dist/modules/crm/m1-seed.js';
import { seedChannels } from '../apps/backend/dist/modules/channels/seed.js';
import { coreDomains,contactReferences } from '../apps/backend/dist/modules/crm/core.js';
import { CrmRecords } from '../apps/backend/dist/modules/crm/records.js';
import { leadDomain,LeadService } from '../apps/backend/dist/modules/sales/leads.js';
import { MessengerIntake } from '../apps/backend/dist/modules/channels/intake.js';
const config=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
if(config.MYSQL_DATABASE!=='native_identity_test'||config.MYSQL_HOST!=='127.0.0.1'||config.APP_ENV!=='test')throw new Error('TEST_TARGET_DENIED');
const env={...config,MYSQL_DATABASE:'native_seed_test',IDENTITY_SEED_MODE:'native',APP_ORIGIN:'http://localhost:18080'};
Object.assign(process.env,env);
const ds=databaseSource(true);await ds.initialize();
const results=[],test=async(name,fn)=>{await fn();results.push({name,result:'PASS'});console.log('PASS '+name);};
try{
  await test('forward upgrade and repeat preserve fixture',async()=>{await migrate(ds);assert.equal(await migrate(ds),0);await seedIdentity(ds,{issuer:'urn:agentic-crm:native',subjects:Object.fromEntries(seedUsers.map(u=>[u,fixtureId(`native:${u}`)]))},env);await seedRegistry(ds,env);await seedM1(ds,env);await seedSalesBase(ds,env);await seedChannels(ds,{alpha:'a'.repeat(64),beta:'b'.repeat(64)},env);});
  const tenant=fixtureId('clinic_alpha'),account=(await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:alpha_admin')]))[0].account_id;
  const role=fixtureId('alpha:role:organic_test');const grants=['contact','lead','conversation','deal','report'].flatMap(resource=>['read','create','update','qualify'].map(action=>({resource,action,scope:'all'})));
  await ds.query("INSERT IGNORE INTO role(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'organic_test','Synthetic organic test',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
  await ds.query('INSERT IGNORE INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)',[tenant,fixtureId('alpha:human:alpha_admin'),role]);
  const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));domains.set('deal',dealDomain());const records=new CrmRecords(ds,'organic-test-only',domains),leads=new LeadService(records,contactReferences);
  const create=(fields,key=randomUUID())=>leads.create(account,tenant,fields,key,'synthetic-organic');
  const contact=(await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Organic synthetic '+randomUUID()}},randomUUID(),undefined,'synthetic')).body.data;

  const conversations=new Conversations(ds,'acquisition-test-only'),intake=new MessengerIntake(ds),subject='acquisition-'+randomUUID();
  let tick=Date.now();
  const receive=async(ad,options={})=>{const event=options.event??randomUUID(),body={provider_event_id:event,provider_message_id:event,external_subject_id:options.subject??subject,occurred_at:options.time??new Date(tick+=1000).toISOString(),message:{type:'text',text:'Synthetic acquisition'},...(ad?{referral:{source:'ctm',ad_id:ad,campaign_id:'campaign-'+ad}}:{})};await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),body,event);for(const claim of await intake.claim())await intake.process(claim);const [row]=await ds.query('SELECT conversation_id,message_id,status FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);assert.equal(row.status,'processed');return {...row,event,body};};
  const list=async(id,q={})=>conversations.read(account,tenant,id,'acquisition-sessions',q);
  const lead=async(id,session)=>{const [c]=await ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);return (await create({contact_id:c.contact_id,conversation_id:id,...(session?{conversation_session_id:session}:{})})).body.data;};
  let a,b,s1,s2,l1,l2;
  await test('same thread separates Ad A and Ad B with immutable Lead and won Deal lineage',async()=>{
    a=await receive('ad-a');s1=(await list(a.conversation_id)).data[0];l1=await lead(a.conversation_id,s1.id);
    b=await receive('ad-b');assert.equal(b.conversation_id,a.conversation_id);s2=(await list(a.conversation_id)).data[0];assert.notEqual(s1.id,s2.id);assert.equal((await list(a.conversation_id)).data[1].close_reason,'new_referral');
    l2=await lead(a.conversation_id,s2.id);assert.equal(l2.fields.source_ad_id,'ad-b');assert.equal(l2.fields.conversation_session_id,s2.id);assert.equal((await leads.read(account,tenant,l1.id)).data.fields.source_ad_id,'ad-a');
    const deals=new DealService(records),d=(await deals.mutate(account,tenant,undefined,{contact_id:l2.fields.contact_id,lead_id:l2.id,title:'Acquisition synthetic',amount:'100',currency:'VND'},randomUUID(),undefined,'synthetic')).body.data;
    const won=(await deals.mutate(account,tenant,d.id,{stage:'won'},randomUUID(),d.version,'synthetic')).body.data;assert.equal(won.fields.source_conversation_session_id,s2.id);assert.equal(won.fields.source_ad_id,'ad-b');assert.equal((await list(a.conversation_id)).data[0].status,'active');
  });
  await test('provider duplicate does not split; same ad new event does; late referral is unresolved',async()=>{
    await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),b.body,b.event);for(const claim of await intake.claim())await intake.process(claim);assert.equal((await list(a.conversation_id)).data.length,2);
    await receive('ad-b');assert.equal((await list(a.conversation_id)).data.length,3);
    const late=await receive('old-ad',{time:new Date(tick-10000).toISOString()});assert.equal((await list(a.conversation_id)).data.length,3);const [m]=await ds.query('SELECT * FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,late.message_id]);assert.equal(m.resolution,'unresolved_late');assert.equal(m.session_id,null);
  });
  await test('explicit agent close and organic reopen preserve thread and select session explicitly',async()=>{
    const r=(await conversations.read(account,tenant,a.conversation_id)).data;
    await conversations.mutate(account,tenant,a.conversation_id,'transition',{target_status:'closed',reason:'Synthetic agent close'},randomUUID(),r.version,'synthetic');
    assert.equal((await list(a.conversation_id)).data[0].close_reason,'agent_closed');await assert.rejects(()=>lead(a.conversation_id),e=>e.code==='SESSION_SELECTION_REQUIRED');assert.equal((await lead(a.conversation_id,s1.id)).fields.source_ad_id,'ad-a');
    const organic=await receive();assert.equal(organic.conversation_id,a.conversation_id);const session=(await list(a.conversation_id)).data[0];assert.equal(session.source_classification,'organic');assert.equal(session.opening_reason,'after_close');assert.equal((await conversations.read(account,tenant,a.conversation_id)).data.closed_at,null);
    assert.equal((await lead(a.conversation_id)).fields.source_conversation_session_id,session.id);await receive();assert.equal((await list(a.conversation_id)).data.length,4);
  });
  await test('session tenant/thread binding, reserved source and cursor authorization',async()=>{
    const other=await receive(undefined,{subject:'other-'+randomUUID()});await assert.rejects(()=>lead(other.conversation_id,s1.id),e=>e.code==='NOT_FOUND');
    await assert.rejects(()=>conversations.read(fixtureId('account:beta_admin'),fixtureId('clinic_beta'),a.conversation_id,'acquisition-sessions'));
    await assert.rejects(()=>create({contact_id:contact.id,conversation_session_id:s1.id}),e=>e.status===422);
    await assert.rejects(()=>records.mutate(account,tenant,{object:'lead',kind:'records',id:l2.id},{fields:{conversation_session_id:s1.id}},randomUUID(),l2.version,'synthetic'));
    const page=await list(a.conversation_id,{limit:'2'});assert.equal(page.data.length,2);assert.equal((await list(a.conversation_id,{limit:'2',before_sequence:page.next_before_sequence})).data.length,2);
    await assert.rejects(()=>list(a.conversation_id,{limit:'0'}));await assert.rejects(()=>list(a.conversation_id,{before_sequence:'0'}));
  });

  await test('queued reply keeps original session and is fenced on new referral',async()=>{
    await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...grants,{resource:'conversation',action:'reply',scope:'all'}]),tenant,role]);
    await ds.query('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[fixtureId('alpha:human:alpha_admin'),tenant,a.conversation_id]);
    const r=(await conversations.read(account,tenant,a.conversation_id)).data,current=(await list(a.conversation_id)).data[0];
    const sent=await conversations.mutate(account,tenant,a.conversation_id,'messages',{text:'Synthetic queued reply',owner_revision:r.owner_revision},randomUUID(),undefined,'synthetic');
    const [membership]=await ds.query('SELECT session_id FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,sent.body.data.message_id]);assert.equal(membership.session_id,current.id);
    await receive('ad-c');const [intent]=await ds.query('SELECT status FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,sent.body.data.id]);assert.equal(intent.status,'cancelled');
    const [after]=await ds.query('SELECT session_id FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,sent.body.data.message_id]);assert.equal(after.session_id,current.id);
  });
  await test('legacy no-session source and field ACL remain explicit',async()=>{
    const legacy=await records.uow.run({tenantId:tenant},async scope=>{const id=randomUUID(),[type]=await scope.query("SELECT id FROM object_type WHERE tenant_id=? AND \`key\`='conversation'",[tenant]);const [c]=await scope.query('SELECT * FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,a.conversation_id]);await scope.query('INSERT INTO crm_record(tenant_id,id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id,type.id]);await scope.query("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,id,c.contact_id,c.contact_identity_id,c.connection_id]);return id;});
    assert.equal((await list(legacy)).data.length,0);assert.equal((await lead(legacy)).fields.source_conversation_session_id,null);
    const policy=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND \`key\`='conversation'",[tenant]);await ds.query("INSERT INTO field_policy(id,tenant_id,object_type_id,role_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'attribution',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,type.id,role]);
    try{await assert.rejects(()=>list(a.conversation_id),e=>e.status===403);await assert.rejects(()=>lead(a.conversation_id,s1.id),e=>e.status===403);}finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,policy]);}
  });
  await mkdir('artifacts/acquisition-sessions',{recursive:true});await writeFile('artifacts/acquisition-sessions/mysql.json',JSON.stringify({database:'native_seed_test',results},null,2));
}finally{await ds.destroy();}
