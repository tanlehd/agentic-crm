import {migrate} from '../apps/backend/dist/kernel/database/migration-runner.js';
import {stageSource} from '../apps/backend/dist/modules/reporting/stage-source.js';
import {SessionProgress} from '../apps/backend/dist/modules/conversation/session-progress.js';
import {SalesHandoffs} from '../apps/backend/dist/modules/sales/handoff.js';
import {ChatflowLeads} from '../apps/backend/dist/modules/sales/chatflow-port.js';
import {withFieldPolicies} from '../apps/backend/dist/modules/crm/access.js';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {CrmRecords} from '../apps/backend/dist/modules/crm/records.js';
import {coreDomains,contactReferences} from '../apps/backend/dist/modules/crm/core.js';
import {leadDomain,LeadService} from '../apps/backend/dist/modules/sales/leads.js';
import {dealDomain,DealService} from '../apps/backend/dist/modules/sales/deals.js';
import {MessengerIntake} from '../apps/backend/dist/modules/channels/intake.js';
import {Conversations} from '../apps/backend/dist/modules/conversation/domain.js';
import {withSourcePolicy,connectedSnapshots} from '../services/reporting/dist/connected-sources.js';
import {ReportingQueryService} from '../services/reporting/dist/query-service.js';
import {hash} from '../services/reporting/dist/storage-security.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_DATABASE,'native_identity_test');Object.assign(process.env,env,{MYSQL_DATABASE:'native_seed_test'});
const ds=databaseSource(true);await ds.initialize();await migrate(ds);await mkdir('artifacts/stage-funnel',{recursive:true});const tenant=fixtureId('clinic_alpha'),checks=[];
const run=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
try{
 const [member]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:alpha_admin')]),account=member.account_id;
 const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));domains.set('deal',dealDomain());const records=new CrmRecords(ds,'synthetic-conversion',domains),leads=new LeadService(records,contactReferences),deals=new DealService(records),intake=new MessengerIntake(ds);
 const event=randomUUID();await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),{provider_event_id:event,provider_message_id:event,external_subject_id:'stage-'+event,occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic stage fixture'}},event);for(const claim of await intake.claim())await intake.process(claim);
 const [thread]=await ds.query('SELECT c.record_id,c.contact_id FROM inbound_delivery d JOIN conversation c ON c.tenant_id=d.tenant_id AND c.record_id=d.conversation_id WHERE d.tenant_id=? AND d.provider_event_id=?',[tenant,event]);assert(thread);
 const [session]=await ds.query("SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND status='active'",[tenant,thread.record_id]);
 const events=id=>ds.query('SELECT * FROM sales_stage_event WHERE tenant_id=? AND subject_id=? ORDER BY sequence',[tenant,id]);
 const createLead=async()=> (await leads.create(account,tenant,{contact_id:thread.contact_id,conversation_id:thread.record_id},randomUUID(),'synthetic-stage')).body.data;
 let lead=await createLead();const qualification={service_interest:'Synthetic service',need_summary:'Synthetic need',contact_permission:true,preferred_contact_method:'messenger',consent_evidence:{kind:'manual',note:'Synthetic consent evidence'}};
 await run('Lead create/draft/qualify ledger records exact transitions and same-state no-op',async()=>{
  lead=(await records.mutate(account,tenant,{object:'lead',kind:'records',id:lead.id},{fields:{qualification:{service_interest:'Synthetic'}}},randomUUID(),lead.version,'synthetic')).body.data;
  lead=(await records.mutate(account,tenant,{object:'lead',kind:'records',id:lead.id},{fields:{qualification:{service_interest:'Synthetic updated'}}},randomUUID(),lead.version,'synthetic')).body.data;
  lead=(await leads.command(account,tenant,lead.id,'qualification',{qualification},randomUUID(),lead.version,'synthetic')).body.data;
  assert.deepEqual((await events(lead.id)).map(e=>e.to_stage),['new','qualifying','qualified']);
 });
 await run('handoff/accept participate atomically and replay never adds stage events',async()=>{
  const service=new SalesHandoffs(ds),key=randomUUID(),requested=await service.mutate(account,tenant,lead.id,undefined,{target_team_id:fixtureId('alpha:team:sales')},key,lead.version,'synthetic');
  await service.mutate(account,tenant,lead.id,undefined,{target_team_id:fixtureId('alpha:team:sales')},key,lead.version,'synthetic');
  const h=requested.body.data;await service.mutate(account,tenant,lead.id,h.handoff_id,{owner_revision:h.owner_revision},randomUUID(),h.version,'synthetic');
  assert.deepEqual((await events(lead.id)).map(e=>e.to_stage),['new','qualifying','qualified','handed_off','accepted']);
 });
 await run('disqualify is an observed terminal branch',async()=>{const l=await createLead();await leads.command(account,tenant,l.id,'disqualify',{reason:'Synthetic'},randomUUID(),l.version,'synthetic');assert.deepEqual((await events(l.id)).map(e=>e.to_stage),['new','disqualified']);});
 let deal=(await deals.mutate(account,tenant,undefined,{contact_id:thread.contact_id,lead_id:lead.id,title:'Synthetic stage journey',amount:'12',currency:'VND'},randomUUID(),undefined,'synthetic')).body.data;
 await run('Deal forward/backward/reentry/won, CAS rollback and outbox correlate to ledger',async()=>{
  for(const stage of ['qualified','proposal','qualified','proposal','won'])deal=(await deals.mutate(account,tenant,deal.id,{stage},randomUUID(),deal.version,'synthetic')).body.data;
  const before=await events(deal.id);assert.equal(before.length,6);assert.deepEqual(before.map(e=>Number(e.sequence)),[1,2,3,4,5,6]);
  await assert.rejects(()=>deals.mutate(account,tenant,deal.id,{stage:'open'},randomUUID(),'1','synthetic'));assert.equal((await events(deal.id)).length,6);
  const [r]=await ds.query("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND event_type='sales.stage_changed' AND aggregate_id=?",[tenant,deal.id]);assert.equal(Number(r.n),6);
 });
 await run('Chat stage events preserve episode/process and do not use milestones',async()=>{
  const p=new SessionProgress(new Conversations(ds,'synthetic'));let state=(await p.read(account,tenant,thread.record_id,session.id)).data;
  for(const stage of state.process.definition.stages.slice(1)){await p.mutate(account,tenant,thread.record_id,session.id,{action:'stage',stage_key:stage.key,reason:'Synthetic stage'},randomUUID(),state.version,'synthetic');state=(await p.read(account,tenant,thread.record_id,session.id)).data;}
  assert(state.stage_key===state.process.definition.stages.at(-1).key);
 });
 await run('Chatflow producer service port records new/qualifying/qualified with real FK fixtures',async()=>{
  await records.uow.run({tenantId:tenant},async scope=>{
   const a=await withFieldPolicies(scope,await records.authorization.loadHuman(scope,account)),[actor]=await scope.query('SELECT id FROM service_actor WHERE tenant_id=? LIMIT 1',[tenant]),[role]=await scope.query('SELECT id FROM role WHERE tenant_id=? LIMIT 1',[tenant]);assert(actor&&role);
   const wd=randomUUID(),wv=randomUUID(),wr=randomUUID(),cd=randomUUID(),cv=randomUUID(),sid=randomUUID();
   await scope.query('INSERT INTO workflow_definition(id,tenant_id,`key`,name,service_actor_id) VALUES (?,?,?,?,?)',[wd,tenant,wd,'Synthetic stage fixture',actor.id]);
   await scope.query("INSERT INTO workflow_version(id,tenant_id,definition_id,number,graph,execution_role_id,state) VALUES (?,?,?,1,JSON_OBJECT(),?,'draft')",[wv,tenant,wd,role.id]);
   await scope.query("INSERT INTO workflow_run(id,tenant_id,definition_id,version_id,trigger_event_id,service_actor_id,current_node,context,status,correlation_id) VALUES (?,?,?,?,?,?,'done',JSON_OBJECT(),'cancelled','synthetic-stage')",[wr,tenant,wd,wv,randomUUID(),actor.id]);
   await scope.query('INSERT INTO chatflow_definition(id,tenant_id,`key`,name) VALUES (?,?,?,?)',[cd,tenant,cd,'Synthetic stage fixture']);
   await scope.query("INSERT INTO chatflow_version(id,tenant_id,definition_id,number,graph,state) VALUES (?,?,?,1,JSON_OBJECT(),'draft')",[cv,tenant,cd]);
   await scope.query("INSERT INTO chatflow_session(id,tenant_id,version_id,parent_run_id,start_action_key,conversation_id,service_actor_id,execution_role_id,node_key,status,owner_revision) VALUES (?,?,?,?,?,?,?,?,'done','cancelled',1)",[sid,tenant,cv,wr,sid,thread.record_id,actor.id,role.id]);
   const port=new ChatflowLeads(),input={sessionId:sid,conversationId:thread.record_id,contactId:thread.contact_id,ownerId:a.principalId,teamId:null,values:{service_interest:'Synthetic AI draft'},complete:false},serviceAccess={...a,principalId:actor.id};
   const [message]=await scope.query('SELECT id FROM message WHERE tenant_id=? AND conversation_id=? LIMIT 1',[tenant,thread.record_id]);assert(message);const id=await port.upsert(scope,serviceAccess,input,'service');await port.upsert(scope,serviceAccess,{...input,values:qualification,evidence:message.id,complete:true},'service');
   const rows=await scope.query('SELECT to_stage,actor_kind FROM sales_stage_event WHERE tenant_id=? AND subject_id=? ORDER BY sequence',[tenant,id]);assert.deepEqual(rows.map(e=>e.to_stage),['new','qualifying','qualified']);assert(rows.every(e=>e.actor_kind==='service'));
  });
 });
 const query=async(kind,id,stages,version='1')=>{
  const p=await stageSource(ds,account,tenant);assert(p.stage);return withSourcePolicy(tenant,{allowMock:false,operations:null,conversion:null,stage:p.stage},async()=>{const s=connectedSnapshots()[0],definition={schemaVersion:1,model:{id:'sf_'+kind,version:1},bindingId:s.binding.id,relations:[],dimensions:['sf_subject.stage'],metrics:s.manifest.catalog.metrics.map(({id,version})=>({id,version})),filters:[{field:'sf_subject.id',op:'eq',value:id}],time:{mode:'activity',from:p.stage.historyFrom,to:p.stage.asOf,asOf:p.stage.asOf,timezone:'UTC',bucket:'day',rollingDays:365},stageFunnel:{processVersion:version,stages,mode:'entry_cohort'},visualization:{type:'funnel'}},request={definition,generation:s.manifest.catalogHash},raw=JSON.stringify(request),now=Date.now();return new ReportingQueryService({read:async()=>{throw Error('NO_MOCK');}}).execute({audience:'reporting-query-v1',tenantId:tenant,principalId:fixtureId('alpha:human:alpha_admin'),authRevision:p.authRevision,mockSource:'all',canExport:true,bodyHash:hash(raw),issuedAt:now,expiresAt:now+5000},request,raw);});
 };
 await run('native producer to shared Reporting query returns all three event funnels',async()=>{
  for(const [kind,id,stages]of [['lead',lead.id,['new','qualifying','qualified','handed_off','accepted']],['deal',deal.id,['open','qualified','proposal','won']]]){const r=await query(kind,id,stages);assert(r.rows.every(row=>row.metrics.sf_count==='1'));assert.equal(r.stage.coverage.full,1);}
  const p=(await new SessionProgress(new Conversations(ds,'synthetic')).read(account,tenant,thread.record_id,session.id)).data;const r=await query('conversation',session.id,p.process.definition.stages.map(s=>s.key),p.process.version);assert(r.rows.every(row=>row.metrics.sf_count==='1'));
 });
 await run('wrong tenant source denied, ledger uniqueness/CHECK and tenant index enforced',async()=>{
  await assert.rejects(()=>stageSource(ds,account,fixtureId('clinic_beta')));const [e]=await events(deal.id);
  await assert.rejects(ds.query('INSERT INTO sales_stage_event SELECT tenant_id,?,object_kind,subject_id,sequence,from_stage,to_stage,actor_kind,actor_id,correlation_id,occurred_at,recorded_at FROM sales_stage_event WHERE tenant_id=? AND id=?',[randomUUID(),tenant,e.id]),e=>e.code==='ER_DUP_ENTRY');
  const runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();try{await assert.rejects(runner.query("UPDATE sales_stage_event SET object_kind='invalid' WHERE tenant_id=? AND id=?",[tenant,e.id]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');}finally{await runner.rollbackTransaction();await runner.release();}
  const plan=await ds.query('EXPLAIN SELECT sequence FROM sales_stage_event WHERE tenant_id=? AND object_kind=? AND subject_id=? ORDER BY sequence',[tenant,'deal',deal.id]);assert(plan.some(p=>p.key==='uq_sales_stage_sequence'));
 });
 const fixture=JSON.parse(await readFile('.local/human-routing-native_seed_test.json','utf8')),actor=fixture.agents[0],role=fixtureId('hr:role'),field=randomUUID();
 const [originalRole]=await ds.query('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?',[tenant,role]),[originalSeat]=await ds.query('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,actor.member]);
 const grants=[...['run','export'].map(action=>({resource:'report_definition',action,scope:'all'})),...['conversation','contact','lead','deal'].map(resource=>({resource,action:'read',scope:'all'}))];
 async function rights(g){await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]);await m.query("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,actor.member]);await m.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(g),tenant,role]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,actor.principal]);});}
 try{
  await rights(grants);assert((await stageSource(ds,actor.account,tenant)).stage);
  await run('native current source grant/scope revocation removes whole correlated population',async()=>{await rights(grants.filter(g=>g.resource!=='deal'));assert.equal((await stageSource(ds,actor.account,tenant)).stage,null);await rights(grants.map(g=>g.resource==='lead'?{...g,scope:'own'}:g));assert.equal((await stageSource(ds,actor.account,tenant)).stage,null);});
  await run('native field filter deny prevents stage field correlation',async()=>{await rights(grants);const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]);await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'stage_key','[\"filter\"]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[field,tenant,role,type.id]);assert.equal((await stageSource(ds,actor.account,tenant)).stage,null);await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,field]);});
  await run('native export authority independent from preview',async()=>{await rights(grants.filter(g=>g.action!=='export'));assert((await stageSource(ds,actor.account,tenant)).stage);assert.equal((await stageSource(ds,actor.account,tenant,true)).stage,null);});
 }finally{await ds.transaction(async m=>{await m.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]);await m.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,field]);await m.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[typeof originalRole.permissions==='string'?originalRole.permissions:JSON.stringify(originalRole.permissions),tenant,role]);await m.query('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[originalSeat.seat_code,tenant,actor.member]);await m.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[tenant,actor.principal]);});}
 await writeFile('artifacts/stage-funnel/native.json',JSON.stringify({status:'PASS',checks,at:new Date().toISOString(),retained:{thread:thread.record_id,session:session.id,lead:lead.id,deal:deal.id}},null,2));console.log(JSON.stringify({status:'PASS',groups:checks.length}));
}finally{await ds.destroy();}
