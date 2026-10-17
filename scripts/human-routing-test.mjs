import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {migrate} from '../apps/backend/dist/kernel/database/migration-runner.js';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {HumanRouting} from '../apps/backend/dist/modules/agents/human-routing.js';
import {Conversations} from '../apps/backend/dist/modules/conversation/domain.js';
import {ConversationSnooze} from '../apps/backend/dist/modules/conversation/snooze.js';
import {MessengerIntake} from '../apps/backend/dist/modules/channels/intake.js';
import {humanRoutingFixture} from './lib/human-routing-fixture.mjs';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_HOST,'127.0.0.1');Object.assign(process.env,env,{MYSQL_DATABASE:'native_seed_test'});
const ds=databaseSource(true);await ds.initialize();const checks=[],test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};await mkdir('artifacts/human-routing',{recursive:true});
try{
 await test('forward35, tenant columns and repeat without old-table mutation',async()=>{const tables=['crm_record','conversation_acquisition_session','ownership_history','agent_capacity_slot'];const before={};for(const table of tables)before[table]=await ds.query('SELECT * FROM '+table);await migrate(ds);for(const table of tables)assert.deepEqual(await ds.query('SELECT * FROM '+table),before[table]);assert.equal(await migrate(ds),0);const cols=await ds.query("SELECT TABLE_NAME,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('routing_skill','routing_team_skill','routing_human_profile','routing_queue','routing_queue_version','routing_work_item','routing_queue_entry','routing_assignment_attempt','routing_human_allocation') AND COLUMN_NAME='tenant_id'");assert.equal(cols.length,9);assert(cols.every(c=>c.IS_NULLABLE==='NO'));});
 const f=await humanRoutingFixture(ds),[admin]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[f.tenant,fixtureId('alpha:member:alpha_admin')]);
 const service=new HumanRouting(ds),chat=new Conversations(ds,'synthetic-human-routing'),intake=new MessengerIntake(ds),account=admin.account_id,tenant=f.tenant;
 const read=async()=>(await service.read(account,tenant)).data,save=async(kind,b,v,key=randomUUID())=>(await service.mutate(account,tenant,kind,b,key,v,randomUUID())).body.data;
 const dispatch=()=>service.uow.run({tenantId:tenant},s=>service.dispatch(s));
 // Retain earlier fixture sessions; close only this dedicated mock channel through Chat command.
 for(const row of await ds.query("SELECT record_id FROM conversation WHERE tenant_id=? AND connection_id=? AND status<>'closed'",[tenant,f.connection])){const r=(await chat.read(account,tenant,row.record_id)).data;await chat.mutate(account,tenant,row.record_id,'transition',{target_status:'closed',reason:'Synthetic prior run complete'},randomUUID(),r.version,randomUUID());}await dispatch();
 let d=await read(),skill=d.skills.find(s=>s.skill_key==='product.routing_demo');
 if(!skill)skill=await save('skills',{key:'product.routing_demo',name:'Tư vấn sản phẩm Demo'});
 await test('team skills CAS, replay and profile config persist',async()=>{
  d=await read();const v=d.team_skills.find(t=>t.team_id===f.team)?.version??'0',b={team_id:f.team,skill_ids:[skill.id]},key=randomUUID();const first=await save('team-skills',b,v,key);assert.deepEqual(await save('team-skills',b,v,key),first);await assert.rejects(()=>save('team-skills',b,v),e=>e.code==='VERSION_CONFLICT');
  for(const a of f.agents){d=await read();await save('profiles',{principal_id:a.principal,capacity:1,enabled:true},d.profiles.find(p=>p.principal_id===a.principal)?.version??'0');}
 });
 d=await read();const old=d.queues.find(q=>q.name==='Routing Demo');let queue=await save('queues',{...(old?{id:old.id}:{}),name:'Routing Demo',team_id:f.team,connection_id:f.connection,skill_ids:[skill.id],priority:10,enabled:true},old?.version??'0');
 const inbound=async(subject='human-routing-'+randomUUID())=>{const event=randomUUID();await intake.accept(f.connection,'Bearer '+f.token,{provider_event_id:event,provider_message_id:event,external_subject_id:subject,display_label:'Routing Synthetic',occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic product consultation'}},event);for(const claim of await intake.claim())await intake.process(claim);const [row]=await ds.query('SELECT status,conversation_id FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);assert.equal(row.status,'processed');return row.conversation_id;};
 const threads=[];await test('three conversations, two cap1 agents, one durable waiting; repeated concurrent dispatch',async()=>{for(let i=0;i<3;i++)threads.push(await inbound());await Promise.all([dispatch(),dispatch(),dispatch()]);d=await read();const works=d.work.filter(w=>threads.includes(w.conversation_id));assert.equal(works.filter(w=>w.state==='assigned').length,2);assert.equal(works.filter(w=>w.state==='waiting').length,1);assert.equal(works.find(w=>w.state==='waiting').blocked_reason,'all_at_capacity');assert(d.profiles.filter(p=>f.agents.some(a=>a.principal===p.principal_id)).every(p=>p.workload===1));});
 const assigned=(await read()).work.find(w=>threads.includes(w.conversation_id)&&w.state==='assigned'),agent=f.agents.find(a=>a.principal===assigned.principal_id),waiting=(await read()).work.find(w=>threads.includes(w.conversation_id)&&w.state==='waiting');
 await test('agent reply/pending retains load; close event releases and pushes next work',async()=>{
  let r=(await chat.read(agent.account,tenant,assigned.conversation_id)).data;
  await chat.mutate(agent.account,tenant,r.id,'messages',{text:'Synthetic advisor reply',owner_revision:r.owner_revision},randomUUID(),undefined,randomUUID());
  await chat.mutate(agent.account,tenant,r.id,'transition',{target_status:'pending',reason:'Waiting customer'},randomUUID(),r.version,randomUUID());await dispatch();assert.equal((await read()).profiles.find(p=>p.principal_id===agent.principal).workload,1);
  r=(await chat.read(agent.account,tenant,r.id)).data;await new ConversationSnooze(ds).mutate(agent.account,tenant,r.id,'snooze',{until:new Date(Date.now()+600000).toISOString()},randomUUID(),r.version,randomUUID());await dispatch();assert.equal((await read()).profiles.find(p=>p.principal_id===agent.principal).workload,1);
  r=(await chat.read(agent.account,tenant,r.id)).data;await chat.mutate(agent.account,tenant,r.id,'transition',{target_status:'closed',reason:'Resolved'},randomUUID(),r.version,randomUUID());
  const consumer=service.consumers().find(c=>c.type==='acquisition_session.closed');await service.uow.run({tenantId:tenant},s=>consumer.handle(s,{correlation_id:randomUUID()}));d=await read();assert.equal(d.work.find(w=>w.id===waiting.id).principal_id,agent.principal);assert.equal(d.profiles.find(p=>p.principal_id===agent.principal).workload,1);
 });
 await test('full transfer rejected atomically; capacity increase then successful reroute',async()=>{
  d=await read();const w=d.work.find(w=>w.id===waiting.id),other=f.agents.find(a=>a.principal!==w.principal_id),before=(await chat.read(account,tenant,w.conversation_id)).data;
  await assert.rejects(()=>save('reroute',{work_id:w.id,queue_id:queue.id,owner_principal_id:other.principal},w.version),e=>e.code==='HUMAN_CAPACITY_FULL'||e.code==='TARGET_INELIGIBLE');assert.deepEqual((await chat.read(account,tenant,w.conversation_id)).data,before);
  const p=d.profiles.find(p=>p.principal_id===other.principal);await save('profiles',{principal_id:other.principal,capacity:2,enabled:true},p.version);await save('reroute',{work_id:w.id,queue_id:queue.id,owner_principal_id:other.principal},w.version);assert.equal((await chat.read(account,tenant,w.conversation_id)).data.owner_principal_id,other.principal);
 });
 await test('performance credits one close, transfer separate, reply from Chat actor',async()=>{d=await read();const p=d.performance.find(p=>p.principal_id===agent.principal);assert(Number(p.completed)>=1);assert(Number(p.transferred)>=1);assert(Number(p.handling_seconds)>=0);assert(Number(d.replies.find(r=>r.principal_id===agent.principal).submitted_replies)>=1);assert(Number(d.average_wait_seconds)>=0);});
 await test('wrong tenant and agent admin access forbidden; own workload isolates',async()=>{await assert.rejects(()=>service.read(agent.account,tenant),e=>e.code==='FORBIDDEN');await assert.rejects(()=>service.read(agent.account,fixtureId('clinic_beta')),e=>e.code==='FORBIDDEN');const mine=(await service.read(agent.account,tenant,true)).data;assert(mine.profiles.every(p=>p.principal_id===agent.principal));assert(mine.work.every(w=>w.principal_id===agent.principal));});
 await test('required skills block, restore triggers dispatch; pause queue holds work',async()=>{
  d=await read();const g=d.team_skills.find(t=>t.team_id===f.team);await save('team-skills',{team_id:f.team,skill_ids:[]},g.version);const thread=await inbound();threads.push(thread);await dispatch();assert.equal((await read()).work.find(w=>w.conversation_id===thread).blocked_reason,'no_matching_skill');
  d=await read();const q=d.queues.find(q=>q.id===queue.id);await save('queues',{id:q.id,name:q.name,team_id:q.team_id,connection_id:q.connection_id,skill_ids:q.skill_ids,priority:q.priority,enabled:false},q.version);d=await read();await save('team-skills',{team_id:f.team,skill_ids:[skill.id]},d.team_skills.find(t=>t.team_id===f.team).version);assert.equal((await read()).work.find(w=>w.conversation_id===thread).state,'waiting');
  d=await read();const paused=d.queues.find(q=>q.id===queue.id);await save('queues',{id:q.id,name:q.name,team_id:q.team_id,connection_id:q.connection_id,skill_ids:q.skill_ids,priority:q.priority,enabled:true},paused.version);assert.equal((await read()).work.find(w=>w.conversation_id===thread).state,'assigned');
 });
 const closeAll=async()=>{for(const row of await ds.query("SELECT record_id FROM conversation WHERE tenant_id=? AND connection_id=? AND status<>'closed'",[tenant,f.connection])){const r=(await chat.read(account,tenant,row.record_id)).data;await chat.mutate(account,tenant,r.id,'transition',{target_status:'closed',reason:'Synthetic complete'},randomUUID(),r.version,randomUUID());}await dispatch();};
 await closeAll();
 await test('transaction interruption rolls owner/allocation back; fresh runtime retries exactly once',async()=>{
  const thread=await inbound();await assert.rejects(()=>service.uow.run({tenantId:tenant},async s=>{await service.dispatch(s);throw Error('synthetic interruption before commit');}),/synthetic interruption/);assert.equal((await chat.read(account,tenant,thread)).data.owner_principal_id,null);
  const fresh=new HumanRouting(ds);await fresh.uow.run({tenantId:tenant},s=>fresh.dispatch(s));await dispatch();const [row]=await ds.query('SELECT COUNT(*) n FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE w.tenant_id=? AND w.conversation_id=? AND a.released_at IS NULL',[tenant,thread]);assert.equal(Number(row.n),1);await closeAll();
 });
 await test('unavailable and field-denied candidates cannot receive; restored eligibility wakes backlog',async()=>{
  const role=fixtureId('hr:role'),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]),field=randomUUID();
  try{
   await ds.query("UPDATE principal SET availability='unavailable' WHERE tenant_id=? AND id IN (?,?)",[tenant,...f.agents.map(a=>a.principal)]);const thread=await inbound();await dispatch();assert.equal((await read()).work.find(w=>w.conversation_id===thread).blocked_reason,'no_available_agent');
   await ds.query("UPDATE principal SET availability='available' WHERE tenant_id=? AND id IN (?,?)",[tenant,...f.agents.map(a=>a.principal)]);
   await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text','[\"write\"]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[field,tenant,role,type.id]);await dispatch();assert.equal((await read()).work.find(w=>w.conversation_id===thread).blocked_reason,'permission_denied');
   await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,field]);await dispatch();assert.equal((await read()).work.find(w=>w.conversation_id===thread).state,'assigned');
  }finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,field]);await ds.query("UPDATE principal SET availability='available' WHERE tenant_id=? AND id IN (?,?)",[tenant,...f.agents.map(a=>a.principal)]);}await closeAll();
 });
 await test('manual assignment shares capacity guard; actor revoke holds queue without losing completed work',async()=>{
  const p=(await read()).profiles.find(p=>p.principal_id===agent.principal);await save('profiles',{principal_id:agent.principal,capacity:0,enabled:true},p.version);
  const thread=await inbound(),record=(await chat.read(account,tenant,thread)).data;
  await assert.rejects(()=>service.routing.mutate(account,tenant,thread,false,{owner_principal_id:agent.principal,team_id:f.team,reason:'manual'},randomUUID(),record.version,randomUUID()),e=>e.code==='HUMAN_CAPACITY_FULL'||e.code==='TARGET_INELIGIBLE');
  const [actor]=await ds.query("SELECT id FROM service_actor WHERE tenant_id=? AND `key`='human_routing_dispatch'",[tenant]);
  try{await ds.query('UPDATE service_actor SET active=0 WHERE tenant_id=? AND id=?',[tenant,actor.id]);await dispatch();assert.equal((await read()).work.find(w=>w.conversation_id===thread).blocked_reason,'routing_actor_unavailable');}finally{await ds.query('UPDATE service_actor SET active=1 WHERE tenant_id=? AND id=?',[tenant,actor.id]);}
  d=await read();await save('profiles',{principal_id:agent.principal,capacity:1,enabled:true},d.profiles.find(p=>p.principal_id===agent.principal).version);await closeAll();
 });
 await test('profile rejects non-chat seat; own workload respects field denies',async()=>{
  await assert.rejects(()=>save('profiles',{principal_id:fixtureId('alpha:human:read_only'),capacity:1,enabled:true},'0'),e=>e.code==='CHAT_SEAT_REQUIRED');
  const thread=await inbound();await dispatch();const w=(await read()).work.find(w=>w.conversation_id===thread),owner=f.agents.find(a=>a.principal===w.principal_id),field=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]);
  try{await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'team_id','[\"read\"]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[field,tenant,fixtureId('hr:role'),type.id]);assert((await service.read(owner.account,tenant,true)).data.work.every(w=>w.team_id===null));}finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,field]);}await closeAll();
 });
 const plans={};for(const [name,sql,params] of [['load','SELECT COUNT(*) FROM routing_human_allocation WHERE tenant_id=? AND principal_id=? AND released_at IS NULL',[tenant,agent.principal]],['wait',"SELECT id FROM routing_queue_entry WHERE tenant_id=? AND state='waiting' ORDER BY wait_started_at,id LIMIT 100",[tenant]]])plans[name]=await ds.query('EXPLAIN '+sql,params);
 await writeFile('artifacts/human-routing/mysql.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',checks,plans,retained:true},null,2));
}finally{await ds.destroy();}
