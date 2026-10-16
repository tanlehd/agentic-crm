import {ordinaryTestAdmin} from './test-ordinary-admin.mjs';
import { Conversations } from '../apps/backend/dist/modules/conversation/domain.js';
import { SalesSessionContext } from '../apps/backend/dist/modules/sales/session-context.js';
import { LeadMerge } from '../apps/backend/dist/modules/sales/lead-merge.js';
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
  const withoutGrant=async(resource,action,fn)=>ordinaryTestAdmin(ds,tenant,fixtureId('alpha:human:alpha_admin'),async()=>{const rows=await ds.query('SELECT r.id,r.permissions FROM role r JOIN principal_role p ON p.tenant_id=r.tenant_id AND p.role_id=r.id WHERE p.tenant_id=? AND p.principal_id=?',[tenant,fixtureId('alpha:human:alpha_admin')]);try{for(const r of rows){const permissions=typeof r.permissions==='string'?JSON.parse(r.permissions):r.permissions;await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(permissions.filter(g=>g.resource!==resource||g.action!==action)),tenant,r.id]);}await fn();}finally{for(const r of rows)await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[typeof r.permissions==='string'?r.permissions:JSON.stringify(r.permissions),tenant,r.id]);}});
  const create=(fields,key=randomUUID())=>leads.create(account,tenant,fields,key,'synthetic-organic');
  const contact=(await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Organic synthetic '+randomUUID()}},randomUUID(),undefined,'synthetic')).body.data;

  const conversations=new Conversations(ds,'acquisition-test-only'),intake=new MessengerIntake(ds),subject='acquisition-'+randomUUID();
  let tick=Date.now();
  const receive=async(ad,options={})=>{const event=options.event??randomUUID(),body={provider_event_id:event,provider_message_id:event,external_subject_id:options.subject??subject,occurred_at:options.time??new Date(tick+=1000).toISOString(),message:{type:'text',text:'Synthetic acquisition'},...(ad?{referral:{source:'ctm',ad_id:ad,campaign_id:'campaign-'+ad}}:{})};await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),body,event);for(const claim of await intake.claim())await intake.process(claim);const [row]=await ds.query('SELECT conversation_id,message_id,status FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);assert.equal(row.status,'processed');return {...row,event,body};};
  const list=async(id,q={})=>conversations.read(account,tenant,id,'acquisition-sessions',q);
  const lead=async(id,session)=>{const [c]=await ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);return (await create({contact_id:c.contact_id,conversation_id:id,...(session?{conversation_session_id:session}:{})})).body.data;};
  let a,b,s1,s2,l1,l2;
  await test('same thread retains session across Ad A and B with immutable source and touchpoints',async()=>{
    a=await receive('ad-a');s1=(await list(a.conversation_id)).data[0];l1=await lead(a.conversation_id,s1.id);
    b=await receive('ad-b');assert.equal(b.conversation_id,a.conversation_id);s2=(await list(a.conversation_id)).data[0];assert.equal(s1.id,s2.id);assert.equal((await list(a.conversation_id)).data.length,1);assert.equal(s1.policy_version,'inbox_v2');
    assert.equal((await ds.query('SELECT touchpoint_id FROM session_touchpoint WHERE tenant_id=? AND session_id=?',[tenant,s1.id])).length,2);
    l2=await lead(a.conversation_id,s2.id);assert.equal(l2.fields.source_ad_id,'ad-a');assert.equal(l2.fields.conversation_session_id,s2.id);assert.equal((await leads.read(account,tenant,l1.id)).data.fields.source_ad_id,'ad-a');
    const deals=new DealService(records),d=(await deals.mutate(account,tenant,undefined,{contact_id:l2.fields.contact_id,lead_id:l2.id,title:'Acquisition synthetic',amount:'100',currency:'VND'},randomUUID(),undefined,'synthetic')).body.data;
    const won=(await deals.mutate(account,tenant,d.id,{stage:'won'},randomUUID(),d.version,'synthetic')).body.data;assert.equal(won.fields.source_conversation_session_id,s2.id);assert.equal(won.fields.source_ad_id,'ad-a');assert.equal((await list(a.conversation_id)).data[0].status,'active');
  });
  await test('provider duplicate and same ad retain session; late referral is unresolved',async()=>{
    await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),b.body,b.event);for(const claim of await intake.claim())await intake.process(claim);assert.equal((await list(a.conversation_id)).data.length,1);
    assert.equal((await ds.query('SELECT touchpoint_id FROM session_touchpoint WHERE tenant_id=? AND session_id=?',[tenant,s1.id])).length,2);
    await receive('ad-b');assert.equal((await list(a.conversation_id)).data.length,1);
    const late=await receive('old-ad',{time:new Date(tick-10000).toISOString()});assert.equal((await list(a.conversation_id)).data.length,1);const [m]=await ds.query('SELECT * FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,late.message_id]);assert.equal(m.resolution,'unresolved_late');assert.equal(m.session_id,null);
  });
  await test('explicit agent close and organic reopen preserve thread and select session explicitly',async()=>{
    const r=(await conversations.read(account,tenant,a.conversation_id)).data;
    await conversations.mutate(account,tenant,a.conversation_id,'transition',{target_status:'closed',reason:'Synthetic agent close'},randomUUID(),r.version,'synthetic');
    assert.equal((await list(a.conversation_id)).data[0].close_reason,'agent_closed');await assert.rejects(()=>lead(a.conversation_id),e=>e.code==='SESSION_SELECTION_REQUIRED');assert.equal((await lead(a.conversation_id,s1.id)).fields.source_ad_id,'ad-a');
    const late=await receive('closed-late',{time:new Date(Date.now()-3600000).toISOString()});assert.equal((await conversations.read(account,tenant,a.conversation_id)).data.status,'closed');assert.equal((await list(a.conversation_id)).data.length,1);assert.equal((await ds.query('SELECT resolution FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,late.message_id]))[0].resolution,'unresolved_late');
    const organic=await receive();assert.equal(organic.conversation_id,a.conversation_id);const session=(await list(a.conversation_id)).data[0];assert.equal(session.source_classification,'organic');assert.equal(session.opening_reason,'after_close');assert.equal((await conversations.read(account,tenant,a.conversation_id)).data.closed_at,null);
    assert.equal((await lead(a.conversation_id)).fields.source_conversation_session_id,session.id);await receive();assert.equal((await list(a.conversation_id)).data.length,2);
  });
  await test('session tenant/thread binding, reserved source and cursor authorization',async()=>{
    const other=await receive(undefined,{subject:'other-'+randomUUID()});await assert.rejects(()=>lead(other.conversation_id,s1.id),e=>e.code==='NOT_FOUND');
    await assert.rejects(()=>conversations.read(fixtureId('account:beta_admin'),fixtureId('clinic_beta'),a.conversation_id,'acquisition-sessions'));
    await assert.rejects(()=>create({contact_id:contact.id,conversation_session_id:s1.id}),e=>e.status===422);
    await assert.rejects(()=>records.mutate(account,tenant,{object:'lead',kind:'records',id:l2.id},{fields:{conversation_session_id:s1.id}},randomUUID(),l2.version,'synthetic'));
    const page=await list(a.conversation_id,{limit:'1'});assert.equal(page.data.length,1);assert.equal((await list(a.conversation_id,{limit:'1',before_sequence:page.next_before_sequence})).data.length,1);
    await assert.rejects(()=>list(a.conversation_id,{limit:'0'}));await assert.rejects(()=>list(a.conversation_id,{before_sequence:'0'}));
  });

  await test('queued reply keeps original session and remains queued on new referral',async()=>{
    await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...grants,{resource:'conversation',action:'reply',scope:'all'}]),tenant,role]);
    await ds.query('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[fixtureId('alpha:human:alpha_admin'),tenant,a.conversation_id]);
    const r=(await conversations.read(account,tenant,a.conversation_id)).data,current=(await list(a.conversation_id)).data[0];
    const sent=await conversations.mutate(account,tenant,a.conversation_id,'messages',{text:'Synthetic queued reply',owner_revision:r.owner_revision},randomUUID(),undefined,'synthetic');
    const [membership]=await ds.query('SELECT session_id FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,sent.body.data.message_id]);assert.equal(membership.session_id,current.id);
    await receive('ad-c');const [intent]=await ds.query('SELECT status FROM outbound_intent WHERE tenant_id=? AND id=?',[tenant,sent.body.data.id]);assert.equal(intent.status,'queued');
    const [after]=await ds.query('SELECT session_id FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?',[tenant,sent.body.data.message_id]);assert.equal(after.session_id,current.id);
  });
  const contexts=new SalesSessionContext(records),merges=new LeadMerge(records);
  await test('continuation CAS and replay preserve source/owner; direct and inherited Deal origins differ from actual context',async()=>{
    const session=(await list(a.conversation_id)).data[0],body={conversation_id:a.conversation_id,conversation_session_id:session.id},key=randomUUID(),first=await contexts.link(account,tenant,l1.id,body,key,l1.version,'synthetic');
    assert.deepEqual(await contexts.link(account,tenant,l1.id,body,key,l1.version,'synthetic'),first);
    await assert.rejects(()=>contexts.link(account,tenant,l1.id,body,randomUUID(),l1.version,'synthetic'),e=>e.code==='VERSION_CONFLICT');
    const now=(await leads.read(account,tenant,l1.id)).data;assert.equal(now.fields.source_ad_id,'ad-a');assert.equal(now.owner_principal_id,l1.owner_principal_id);
    assert.equal((await contexts.read(account,tenant,l1.id)).data.length,2);
    const deals=new DealService(records),createDeal=lead_id=>deals.mutate(account,tenant,undefined,{contact_id:l1.fields.contact_id,...body,...(lead_id?{lead_id}:{}),title:'Context synthetic',amount:'100',currency:'VND'},randomUUID(),undefined,'synthetic');
    const direct=(await createDeal()).body.data,inherited=(await createDeal(l1.id)).body.data;
    assert.equal(direct.fields.source_conversation_session_id,session.id);assert.equal(inherited.fields.source_conversation_session_id,s1.id);
    assert.equal((await contexts.read(account,tenant,inherited.id)).data[0].session_id,session.id);
    const won=(await deals.mutate(account,tenant,inherited.id,{stage:'won',...body},randomUUID(),inherited.version,'synthetic')).body.data;assert.equal(won.fields.source_conversation_session_id,s1.id);
    assert.deepEqual(new Set((await contexts.read(account,tenant,inherited.id)).data.map(x=>x.kind)),new Set(['created','closing']));
    await assert.rejects(()=>contexts.link(account,tenant,l1.id,{...body,conversation_session_id:s1.id},randomUUID(),now.version,'synthetic'),e=>e.code==='SESSION_CLOSED');
    await assert.rejects(()=>contexts.link(account,tenant,l1.id,{...body,conversation_session_id:randomUUID()},randomUUID(),now.version,'synthetic'),e=>e.code==='NOT_FOUND');
    await withoutGrant('lead','qualify',()=>assert.rejects(()=>contexts.link(account,tenant,l1.id,body,key,l1.version,'synthetic'),e=>e.status===403));
  });
  await test('duplicate consolidation explicit rights, both CAS, retained source and Deal history, no chains',async()=>{
    const source=await lead(a.conversation_id),target=await lead(a.conversation_id),deals=new DealService(records),deal=(await deals.mutate(account,tenant,undefined,{contact_id:source.fields.contact_id,lead_id:source.id,title:'Before merge',amount:'50',currency:'VND'},randomUUID(),undefined,'synthetic')).body.data;
    const mergeGrants=[...grants,{resource:'lead',action:'archive',scope:'all'}];await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(mergeGrants),tenant,role]);
    try{
      const preview=await merges.preview(account,tenant,source.id,{target_id:target.id});assert.equal(preview.data.source.id,source.id);
      const body={target_id:target.id,target_version:target.version,reason:'Synthetic duplicate'},key=randomUUID();
      await assert.rejects(()=>merges.merge(account,tenant,source.id,{...body,target_version:'999'},key,source.version,'synthetic'),e=>e.code==='VERSION_CONFLICT');assert.equal((await leads.read(account,tenant,source.id)).data.archived,false);
      const merged=await merges.merge(account,tenant,source.id,body,key,source.version,'synthetic');assert.deepEqual(await merges.merge(account,tenant,source.id,body,key,source.version,'synthetic'),merged);
      assert.equal((await leads.read(account,tenant,source.id)).data.archived,true);assert.deepEqual((await leads.read(account,tenant,source.id)).data.fields,source.fields);assert.deepEqual((await leads.read(account,tenant,target.id)).data.fields,target.fields);assert.deepEqual((await deals.read(account,tenant,deal.id)).data.fields,deal.fields);
      await assert.rejects(()=>deals.mutate(account,tenant,undefined,{contact_id:source.fields.contact_id,lead_id:source.id,title:'Rejected',amount:'1',currency:'VND'},randomUUID(),undefined,'synthetic'),e=>e.code==='NOT_FOUND');
      assert.equal((await merges.history(account,tenant,target.id)).data[0].source_id,source.id);
      const third=await lead(a.conversation_id);await assert.rejects(()=>merges.preview(account,tenant,target.id,{target_id:third.id}),e=>e.code==='MERGE_CHAIN_NOT_ALLOWED');await assert.rejects(()=>merges.preview(account,tenant,third.id,{target_id:third.id}),e=>e.code==='INVALID_MERGE');
      await withoutGrant('lead','archive',()=>assert.rejects(()=>merges.merge(account,tenant,source.id,body,key,source.version,'synthetic'),e=>e.status===403));
    }finally{await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,role]);}
  });
  await test('legacy no-session source and field ACL remain explicit',async()=>{
    const legacy=await records.uow.run({tenantId:tenant},async scope=>{const id=randomUUID(),[type]=await scope.query("SELECT id FROM object_type WHERE tenant_id=? AND \`key\`='conversation'",[tenant]);const [c]=await scope.query('SELECT * FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,a.conversation_id]);await scope.query('INSERT INTO crm_record(tenant_id,id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[tenant,id,type.id]);await scope.query("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,id,c.contact_id,c.contact_identity_id,c.connection_id]);return id;});
    assert.equal((await list(legacy)).data.length,0);assert.equal((await lead(legacy)).fields.source_conversation_session_id,null);
    const policy=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND \`key\`='conversation'",[tenant]);await ds.query("INSERT INTO field_policy(id,tenant_id,object_type_id,role_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'attribution',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,type.id,role]);
    try{await ordinaryTestAdmin(ds,tenant,fixtureId('alpha:human:alpha_admin'),async()=>{await assert.rejects(()=>list(a.conversation_id),e=>e.status===403);await assert.rejects(()=>lead(a.conversation_id,s1.id),e=>e.status===403);assert.deepEqual((await contexts.read(account,tenant,l1.id)).data,[]);const current=(await leads.read(account,tenant,l1.id)).data;await assert.rejects(()=>contexts.link(account,tenant,l1.id,{conversation_id:a.conversation_id,conversation_session_id:s1.id},randomUUID(),current.version,'synthetic'),e=>e.status===403);});}finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,policy]);}
  });
  await test('cross-contact continuation and merge, terminal Lead and tenant-native table/index checks',async()=>{
    const other=(await create({contact_id:contact.id})).body.data,current=(await list(a.conversation_id)).data[0];
    await assert.rejects(()=>contexts.link(account,tenant,other.id,{conversation_id:a.conversation_id,conversation_session_id:current.id},randomUUID(),other.version,'synthetic'),e=>e.code==='CONTACT_BINDING_MISMATCH');
    await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...grants,{resource:'lead',action:'archive',scope:'all'}]),tenant,role]);
    try{await assert.rejects(()=>merges.preview(account,tenant,other.id,{target_id:l1.id}),e=>e.code==='CONTACT_BINDING_MISMATCH');const disqualified=await lead(a.conversation_id);await leads.command(account,tenant,disqualified.id,'disqualify',{reason:'Synthetic irrelevant'},randomUUID(),disqualified.version,'synthetic');await assert.rejects(()=>merges.preview(account,tenant,disqualified.id,{target_id:l1.id}),e=>e.code==='INVALID_TRANSITION');
      const pending=await lead(a.conversation_id),[team]=await ds.query("SELECT id FROM team WHERE tenant_id=? AND purpose='sales' LIMIT 1",[tenant]),handoff=randomUUID();assert(team);
      await ds.query("INSERT INTO lead_handoff(id,tenant_id,lead_id,target_team_id,requested_by_kind,requested_by_id,status,due_at) VALUES (?,?,?,?,'human',?,'pending',DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 HOUR))",[handoff,tenant,pending.id,team.id,fixtureId('alpha:human:alpha_admin')]);
      try{await assert.rejects(()=>merges.preview(account,tenant,pending.id,{target_id:l1.id}),e=>e.code==='ACTIVE_DEPENDENCY');}finally{await ds.query("UPDATE lead_handoff SET status='cancelled' WHERE tenant_id=? AND id=?",[tenant,handoff]);}
    }
    finally{await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,role]);}
    const tables=['session_touchpoint','sales_session_context','lead_merge'];for(const table of tables){const [column]=await ds.query("SELECT IS_NULLABLE nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME='tenant_id'",[table]);assert.equal(column.nullable,'NO');}
    const plans=await ds.query('EXPLAIN SELECT * FROM sales_session_context WHERE tenant_id=? AND record_id=? ORDER BY id DESC LIMIT 51',[tenant,l1.id]);assert(plans[0].possible_keys.includes('uq_sales_session_context'));assert.notEqual(plans[0].type,'ALL');
  });
  await test('concurrent close/inbound keeps thread and active-session state consistent',async()=>{
    const subject='close-race-'+randomUUID(),initial=await receive(undefined,{subject}),before=(await conversations.read(account,tenant,initial.conversation_id)).data;
    const outcomes=await Promise.allSettled([conversations.mutate(account,tenant,initial.conversation_id,'transition',{target_status:'closed',reason:'Synthetic close race'},randomUUID(),before.version,'synthetic'),receive('race-ad',{subject})]);
    assert.equal(outcomes[1].status,'fulfilled');if(outcomes[0].status==='rejected')assert.equal(outcomes[0].reason.code,'VERSION_CONFLICT');
    const after=(await conversations.read(account,tenant,initial.conversation_id)).data,sessions=(await list(initial.conversation_id)).data;assert.equal(sessions.filter(s=>s.status==='active').length,after.status==='closed'?0:1);assert.equal(new Set(sessions.map(s=>s.sequence)).size,sessions.length);
  });
  await mkdir('artifacts/acquisition-sessions',{recursive:true});await writeFile('artifacts/acquisition-sessions/mysql.json',JSON.stringify({database:'native_seed_test',results},null,2));
}finally{await ds.destroy();}
