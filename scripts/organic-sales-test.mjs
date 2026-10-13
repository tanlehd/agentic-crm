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
  let manual;
  await test('manual Lead source server-owned; declared source independent',async()=>{manual=(await create({contact_id:contact.id,declared_source:'facebook'})).body.data;assert.equal(manual.fields.source_classification,'manual');assert.equal(manual.fields.source_page_id,null);await assert.rejects(()=>create({contact_id:contact.id,source_ad_id:'spoof'}));await assert.rejects(()=>records.mutate(account,tenant,{object:'lead',kind:'records',id:manual.id},{fields:{source_page_id:'spoof'}},randomUUID(),manual.version,'synthetic'));});
  const intake=new MessengerIntake(ds),event=randomUUID();
  const incoming=await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),{provider_event_id:event,provider_message_id:event,external_subject_id:'organic-'+event,occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic organic enquiry'}},event);
  for(const claim of await intake.claim())await intake.process(claim);
  const [delivery]=await ds.query('SELECT conversation_id FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);assert.ok(delivery?.conversation_id);
  const [conversation]=await ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,delivery.conversation_id]);let organic;
  await test('Conversation organic source and idempotent multiple-needs create',async()=>{const input={contact_id:conversation.contact_id,conversation_id:delivery.conversation_id},key=randomUUID();organic=(await create(input,key)).body.data;assert.equal(organic.fields.source_classification,'organic');assert.equal(organic.fields.source_page_id,'synthetic-alpha-page');assert.equal(organic.fields.source_ad_id,null);assert.equal((await create(input,key)).body.data.id,organic.id);assert.notEqual((await create(input)).body.data.id,organic.id);await assert.rejects(()=>create({...input,contact_id:contact.id}),e=>e.code==='CONTACT_BINDING_MISMATCH');});
  await test('declared-source change and tenant denial preserve snapshot',async()=>{const changed=(await records.mutate(account,tenant,{object:'lead',kind:'records',id:organic.id},{fields:{declared_source:'referral'}},randomUUID(),organic.version,'synthetic')).body.data;assert.equal(changed.fields.source_page_id,organic.fields.source_page_id);assert.equal(changed.fields.source_classification,'organic');await assert.rejects(()=>leads.read(fixtureId('account:beta_admin'),fixtureId('clinic_beta'),organic.id));});
  const deals=new DealService(records);let deal;
  await test('manual and Lead-origin Deal, exact money and immutable lineage',async()=>{
    const input={contact_id:conversation.contact_id,lead_id:organic.id,title:'Synthetic organic deal '+randomUUID(),amount:'500000.125',currency:'VND'},key=randomUUID();
    deal=(await deals.mutate(account,tenant,undefined,input,key,undefined,'synthetic')).body.data;assert.equal(deal.fields.source_page_id,organic.fields.source_page_id);assert.equal(deal.fields.amount,'500000.125000');assert.equal((await deals.mutate(account,tenant,undefined,input,key,undefined,'synthetic')).body.data.id,deal.id);
    const manualDeal=(await deals.mutate(account,tenant,undefined,{contact_id:contact.id,title:'Synthetic manual',amount:'10',currency:'USD'},randomUUID(),undefined,'synthetic')).body.data;assert.equal(manualDeal.fields.source_classification,'manual');
    await assert.rejects(()=>deals.mutate(account,tenant,deal.id,{source_page_id:'spoof'},randomUUID(),deal.version,'synthetic'));
    await assert.rejects(()=>deals.mutate(account,tenant,undefined,{...input,amount:0.1},randomUUID(),undefined,'synthetic'));
  });
  await test('won CAS, repeat, Customer transition and terminal guards',async()=>{
    const key=randomUUID(),won=await deals.mutate(account,tenant,deal.id,{stage:'won'},key,deal.version,'synthetic');assert.equal(won.body.data.fields.stage,'won');assert.equal((await deals.mutate(account,tenant,deal.id,{stage:'won'},key,deal.version,'synthetic')).body.data.version,won.body.data.version);
    await assert.rejects(()=>deals.mutate(account,tenant,deal.id,{amount:'999'},randomUUID(),won.body.data.version,'synthetic'),e=>e.code==='INVALID_TRANSITION');
    const customer=(await records.read(account,tenant,{object:'contact',kind:'records',id:conversation.contact_id})).data;assert.equal(customer.fields.lifecycle,'customer');
    assert.equal((await ds.query("SELECT id FROM outbox_event WHERE tenant_id=? AND event_type='deal.won' AND aggregate_id=?",[tenant,deal.id])).length,1);
    await assert.rejects(()=>deals.read(fixtureId('account:beta_admin'),fixtureId('clinic_beta'),deal.id));
  });
  const report=new OrganicSalesReport(records),period={from:new Date(Date.now()-86400000).toISOString(),to:new Date(Date.now()+86400000).toISOString()};
  await test('organic report sums decimal money by Page and currency; manual excluded',async()=>{
    const second=fixtureId('alpha:organic_second_page');await ds.query("INSERT IGNORE INTO channel_connection(id,tenant_id,provider,external_account_id,team_id,service_actor_id,credential_hash) SELECT ?,tenant_id,provider,'synthetic-organic-second-page',team_id,service_actor_id,? FROM channel_connection WHERE tenant_id=? AND id=?",[second,createHash('sha256').update('c'.repeat(64)).digest('hex'),tenant,fixtureId('alpha:mock_connection')]);
    for(const [connection,paid,currency,value] of [[second,false,'VND','0.123456'],[second,false,'USD','20'],[second,true,'VND','999999']]){
      const event=randomUUID();await intake.accept(connection,'Bearer '+'c'.repeat(64),{provider_event_id:event,provider_message_id:event,external_subject_id:'organic-report-'+event,occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic report'},...(paid?{referral:{source:'ctm',ad_id:'synthetic-ad'}}:{})},event);for(const claim of await intake.claim())await intake.process(claim);
      const [delivery]=await ds.query('SELECT conversation_id FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);const [conv]=await ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,delivery.conversation_id]);
      const lead=(await create({contact_id:conv.contact_id,conversation_id:delivery.conversation_id})).body.data;assert.equal(lead.fields.source_classification,paid?'paid':'organic');const d=(await deals.mutate(account,tenant,undefined,{contact_id:conv.contact_id,lead_id:lead.id,title:'Synthetic report',amount:value,currency},randomUUID(),undefined,'synthetic')).body.data;await deals.mutate(account,tenant,d.id,{stage:'won'},randomUUID(),d.version,'synthetic');
      const result=await report.read(account,tenant,period);assert.equal(result.data.some(g=>g.deal_ids.includes(d.id)),!paid);
    }
    const actual=await report.read(account,tenant,period);const expected=await ds.query("SELECT source_channel channel,source_page_id page_id,currency,COUNT(*) won_deal_count,CAST(SUM(amount) AS CHAR) won_value FROM deal WHERE tenant_id=? AND stage='won' AND source_classification='organic' AND closed_at>=? AND closed_at<? GROUP BY source_channel,source_page_id,currency",[tenant,new Date(period.from),new Date(period.to)]);
    for(const e of expected){const a=actual.data.find(g=>g.channel===e.channel&&g.page_id===e.page_id&&g.currency===e.currency);assert(a);assert.equal(a.won_value,e.won_value);assert.equal(a.won_deal_count,Number(e.won_deal_count));}
    await assert.rejects(async()=>report.read(account,tenant,{from:period.to,to:period.from}));
  });
  await test('report field ACL and viewer seat fail closed',async()=>{
    const id=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='deal'",[tenant]);
    await ds.query("INSERT INTO field_policy(id,tenant_id,object_type_id,role_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'amount',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,tenant,type.id,role]);
    try{await assert.rejects(()=>report.read(account,tenant,period),e=>e.status===403);}finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,id]);}
    const [viewer]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:read_only')]);await assert.rejects(()=>report.read(viewer.account_id,tenant,period),e=>e.status===403);
  });
  await mkdir('artifacts/organic-sales',{recursive:true});await writeFile('artifacts/organic-sales/mysql.json',JSON.stringify({database:'native_seed_test',results},null,2));
}finally{await ds.destroy();}
