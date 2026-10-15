import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {databaseSource} from '../apps/backend/dist/kernel/database/data-source.js';
import {migrate} from '../apps/backend/dist/kernel/database/migration-runner.js';
import {seedIdentity,seedUsers,fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {seedRegistry} from '../apps/backend/dist/modules/crm/seed.js';
import {seedM1} from '../apps/backend/dist/modules/crm/m1-seed.js';
import {seedChannels} from '../apps/backend/dist/modules/channels/seed.js';
import {Conversations} from '../apps/backend/dist/modules/conversation/domain.js';
import {SessionProgress} from '../apps/backend/dist/modules/conversation/session-progress.js';
import {advanceProgressClock} from '../apps/backend/dist/modules/conversation/session-process-storage.js';
import {MessengerIntake} from '../apps/backend/dist/modules/channels/intake.js';
const config=parseEnv(await readFile('.local/native-auth-test.env','utf8'));assert.equal(config.MYSQL_DATABASE,'native_identity_test');assert.equal(config.MYSQL_HOST,'127.0.0.1');assert.equal(config.APP_ENV,'test');
const env={...config,MYSQL_DATABASE:'native_seed_test',IDENTITY_SEED_MODE:'native',APP_ORIGIN:'http://localhost:18080'};Object.assign(process.env,env);
const ds=databaseSource(true);await ds.initialize();const results=[],test=async(name,fn)=>{await fn();results.push({name,result:'PASS'});console.log('PASS '+name);};
const schema=JSON.parse(await readFile('packages/contracts/schemas/session-progress.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);for(const key of Object.keys(schema.definitions))assert(ajv.getSchema('session-progress.json#/definitions/'+key));
const wire=(key,data)=>{const fn=ajv.getSchema('session-progress.json#/definitions/'+key);assert(fn({data,meta:{correlation_id:'synthetic'}}),JSON.stringify(fn.errors));};
try{
 await test('forward29 rerun, tenant constraints and reusable native fixtures',async()=>{await migrate(ds);assert.equal(await migrate(ds),0);await seedIdentity(ds,{issuer:'urn:agentic-crm:native',subjects:Object.fromEntries(seedUsers.map(u=>[u,fixtureId(`native:${u}`)]))},env);await seedRegistry(ds,env);await seedM1(ds,env);await seedChannels(ds,{alpha:'a'.repeat(64),beta:'b'.repeat(64)},env);const rows=await ds.query("SELECT TABLE_NAME name,IS_NULLABLE nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('session_process_head','session_process_version','session_progress','session_stage_event','session_need','session_milestone_event') AND COLUMN_NAME='tenant_id'");assert.equal(rows.length,6);assert(rows.every(r=>r.nullable==='NO'));});
 const tenant=fixtureId('clinic_alpha'),account=(await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,fixtureId('alpha:member:alpha_admin')]))[0].account_id,principal=fixtureId('alpha:human:alpha_admin');
 const conversations=new Conversations(ds,'synthetic-session-progress'),progress=new SessionProgress(conversations),intake=new MessengerIntake(ds),subject='progress-'+randomUUID();
 async function inbound(ad,sub=subject,time=new Date(Date.now()-1000).toISOString()){
  const event=randomUUID();await intake.accept(fixtureId('alpha:mock_connection'),'Bearer '+'a'.repeat(64),{provider_event_id:event,provider_message_id:event,external_subject_id:sub,occurred_at:time,message:{type:'text',text:'Synthetic progress evidence'},...(ad?{referral:{source:'ctm',ad_id:ad}}:{})},event);for(const claim of await intake.claim())await intake.process(claim);
  const [r]=await ds.query('SELECT conversation_id,message_id,status FROM inbound_delivery WHERE tenant_id=? AND provider_event_id=?',[tenant,event]);assert.equal(r.status,'processed');return r;
 }
 const cid=(await inbound()).conversation_id,sid=(await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0].id;
 const read=async()=>{const r=(await progress.read(account,tenant,cid,sid)).data;wire('session-progress-response',r);return r;};
 const command=async body=>{const r=await progress.mutate(account,tenant,cid,sid,body,randomUUID(),(await read()).version,'synthetic');wire('session-progress-result',r.body.data);return r.body.data;};
 const process=(await progress.process(account,tenant)).data,original=structuredClone(process.definition);let published,needA,needB,first,second;
 const dbNow=async()=>new Date((await ds.query('SELECT UTC_TIMESTAMP(3) now'))[0].now).toISOString();
 const range={from:new Date(Date.now()-3600000).toISOString(),to:new Date(Date.now()+3600000).toISOString(),process_version:process.version};
 await test('new session pins process; stage has no milestone side effect; CAS and idempotency',async()=>{
  let p=await read();assert.equal(p.coverage,'full');assert.equal(p.process.version,process.version);const key=randomUUID(),body={action:'stage',stage_key:p.process.definition.stages[1].key,reason:'Synthetic consultation'},version=p.version;
  const a=await progress.mutate(account,tenant,cid,sid,body,key,version,'synthetic'),b=await progress.mutate(account,tenant,cid,sid,body,key,version,'different-correlation');assert.deepEqual(a,b);await assert.rejects(()=>progress.mutate(account,tenant,cid,sid,body,randomUUID(),version,'synthetic'),e=>e.code==='VERSION_CONFLICT');assert.equal((await read()).history.filter(e=>e.type==='milestone').length,0);
 });
 await test('publish immutable version only affects subsequent sessions; new Ad retains stage',async()=>{
  const p=await read(),def=structuredClone(original);if(def.stages.length>=20)def.stages.pop();def.stages.push({key:'review_'+randomUUID().slice(0,8),label:'Synthetic review'});
  published=(await progress.publish(account,tenant,def,randomUUID(),process.version,'synthetic')).body.data;wire('session-process-response',published);
  await inbound('ad-progress');assert.equal((await read()).stage_key,p.stage_key);assert.equal((await read()).process.version,process.version);assert.deepEqual((await progress.process(account,tenant,{version:process.version})).data.definition,original);
  await assert.rejects(()=>progress.publish(account,tenant,def,randomUUID(),process.version,'synthetic'),e=>e.code==='VERSION_CONFLICT');
 });
 await test('subject-scoped evidence and native connected funnel do not combine unrelated needs',async()=>{
  needA=(await command({action:'need',label:'Synthetic need A'})).id;needB=(await command({action:'need',label:'Synthetic need B'})).id;
  const baseline=(await progress.funnel(account,tenant,range)).data,at=await dbNow();
  first=(await command({action:'record',need_id:needA,milestone_key:original.milestones[0].key,occurred_at:at,reason:'Verified synthetic A'})).id;
  await command({action:'record',need_id:needB,milestone_key:original.milestones[1].key,occurred_at:at,reason:'Verified synthetic B'});
  const split=(await progress.funnel(account,tenant,range)).data;wire('session-funnel-response',split);assert.equal(split.steps[0].sessions,baseline.steps[0].sessions+1);assert.equal(split.steps[1].sessions,baseline.steps[1].sessions);
  second=(await command({action:'record',need_id:needA,milestone_key:original.milestones[1].key,occurred_at:at,reason:'Verified synthetic A next'})).id;
  const complete=(await progress.funnel(account,tenant,range)).data;assert.equal(complete.steps[1].sessions,baseline.steps[1].sessions+1);await inbound('ad-another');assert.equal((await progress.funnel(account,tenant,range)).data.denominator,complete.denominator);
 });
 await test('replacement and retraction preserve historical as_of, support correction chains',async()=>{
  const historical=(await progress.funnel(account,tenant,range)).data;
  const replacement=await command({action:'replace',supersedes_id:second,occurred_at:await dbNow(),reason:'Correct synthetic event time'});
  await command({action:'retract',supersedes_id:replacement.id,reason:'Synthetic evidence invalidated'});
  const current=(await progress.funnel(account,tenant,range)).data;assert.equal(current.steps[1].sessions,historical.steps[1].sessions-1);assert.deepEqual((await progress.funnel(account,tenant,{...range,as_of:historical.as_of})).data,historical);
  await assert.rejects(()=>command({action:'retract',supersedes_id:second,reason:'duplicate correction'}),e=>e.code==='EVIDENCE_CONFLICT');
 });
 await test('reject forged message/need, future/outside-session evidence and strict unknown fields',async()=>{
  const other=await inbound(undefined,'other-'+randomUUID());const b={action:'record',need_id:needA,milestone_key:original.milestones[0].key,occurred_at:await dbNow(),reason:'Synthetic'};
  for(const bad of [{...b,message_id:other.message_id},{...b,need_id:randomUUID()},{...b,milestone_key:'won'}])await assert.rejects(()=>command(bad),e=>e.code==='INVALID_EVIDENCE');
  for(const time of [new Date(Date.now()+86400000).toISOString(),'2000-01-01T00:00:00.000Z'])await assert.rejects(()=>command({...b,occurred_at:time}),e=>e.code==='EVIDENCE_TIME_OUTSIDE_SESSION');
  await assert.rejects(()=>command({...b,stage_key:'consulting'}));await assert.rejects(()=>command({...b,message_id:null}));
  await assert.rejects(()=>progress.funnel(account,tenant,{...range,process_version:[range.process_version]}),e=>e.status===400);
  await assert.rejects(()=>progress.funnel(account,tenant,{...range,to:new Date(Date.now()+100*86400000).toISOString()}),e=>e.code==='INVALID_WINDOW');
  await assert.rejects(()=>progress.funnel(account,tenant,{...range,as_of:new Date(Date.now()+86400000).toISOString()}),e=>e.code==='INVALID_AS_OF');
 });
 await test('current authorization on replay and field-denied reads/funnel, tenant negatives',async()=>{
  const key=randomUUID(),v=(await read()).version,b={action:'need',label:'Revocation probe'};await progress.mutate(account,tenant,cid,sid,b,key,v,'synthetic');
  const roles=await ds.query('SELECT r.id,r.permissions FROM role r JOIN principal_role p ON p.tenant_id=r.tenant_id AND p.role_id=r.id WHERE p.tenant_id=? AND p.principal_id=?',[tenant,principal]);
  try{for(const r of roles){const grants=typeof r.permissions==='string'?JSON.parse(r.permissions):r.permissions;await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.filter(g=>!(g.resource==='conversation'&&g.action==='update'))),tenant,r.id]);}await assert.rejects(()=>progress.mutate(account,tenant,cid,sid,b,key,v,'synthetic'),e=>e.status===403);}finally{for(const r of roles)await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[typeof r.permissions==='string'?r.permissions:JSON.stringify(r.permissions),tenant,r.id]);}
  const [obj]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]),role=roles[0].id,fieldId=randomUUID();
  await ds.query('INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,?,JSON_ARRAY(?),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[fieldId,tenant,role,obj.id,'text','read']);
  try{await assert.rejects(read,e=>e.status===403);assert.equal((await progress.funnel(account,tenant,range)).data.sessions,0);}finally{await ds.query('DELETE FROM field_policy WHERE tenant_id=? AND id=?',[tenant,fieldId]);}
  const beta=fixtureId('clinic_beta'),[member]=await ds.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[beta,fixtureId('beta:member:beta_admin')]);await assert.rejects(()=>progress.read(member.account_id,beta,cid,sid),e=>e.status===404);
 });
 await test('closed session accepts late attestation and correction but rejects stage; reopen pins latest',async()=>{
  const at=await dbNow(),r=(await conversations.read(account,tenant,cid)).data;await conversations.mutate(account,tenant,cid,'transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),r.version,'synthetic');
  const milestone=await command({action:'record',need_id:needA,milestone_key:original.milestones[1].key,occurred_at:at,reason:'Late recorded synthetic confirmation'});await command({action:'retract',supersedes_id:milestone.id,reason:'Late correction'});
  await assert.rejects(()=>command({action:'stage',stage_key:original.stages[0].key,reason:'closed'}),e=>e.code==='SESSION_CLOSED');
  await inbound(undefined,subject,new Date(new Date((await ds.query('SELECT UTC_TIMESTAMP(3) now'))[0].now).getTime()+1000).toISOString());const next=(await conversations.read(account,tenant,cid,'acquisition-sessions')).data[0];assert.notEqual(next.id,sid);const p=(await progress.read(account,tenant,cid,next.id)).data;assert.equal(p.process.version,published.version);assert.equal(p.stage_key,published.definition.stages[0].key);
 });
 await test('preexisting session coverage stays explicit and enrollment is partial',async()=>{
  const [legacy]=await ds.query('SELECT x.id,x.conversation_id FROM conversation_acquisition_session x LEFT JOIN session_progress p ON p.tenant_id=x.tenant_id AND p.session_id=x.id WHERE x.tenant_id=? AND x.status=\'active\' AND p.session_id IS NULL LIMIT 1',[tenant]);assert(legacy,'Persistent pre29 fixture required');
  const before=(await progress.read(account,tenant,legacy.conversation_id,legacy.id)).data;assert.equal(before.coverage,'none');wire('session-progress-response',before);
  await progress.mutate(account,tenant,legacy.conversation_id,legacy.id,{action:'enroll'},randomUUID(),'0','synthetic');assert.equal((await progress.read(account,tenant,legacy.conversation_id,legacy.id)).data.coverage,'partial');
 });
 await test('stage race and revision history pagination retain one successful CAS effect',async()=>{
  const n=await inbound(undefined,'race-'+randomUUID()),session=(await conversations.read(account,tenant,n.conversation_id,'acquisition-sessions')).data[0],p=(await progress.read(account,tenant,n.conversation_id,session.id)).data;
  const run=()=>progress.mutate(account,tenant,n.conversation_id,session.id,{action:'stage',stage_key:p.process.definition.stages[1].key,reason:'Synthetic race'},randomUUID(),p.version,'synthetic');const results=await Promise.allSettled([run(),run()]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='VERSION_CONFLICT').length,1);
  for(let i=0;i<51;i++){const value=(await progress.read(account,tenant,n.conversation_id,session.id)).data;await progress.mutate(account,tenant,n.conversation_id,session.id,{action:'stage',stage_key:value.process.definition.stages[i%2].key,reason:'Synthetic history'},randomUUID(),value.version,'synthetic');}
  const page=(await progress.read(account,tenant,n.conversation_id,session.id)).data;assert.equal(page.history.length,50);assert(page.next_before_revision);const older=(await progress.read(account,tenant,n.conversation_id,session.id,{before_revision:page.next_before_revision})).data;assert.equal(older.history.length,2);assert(!older.history.some(x=>page.history.some(y=>x.id===y.id)));
 });
 await test('concurrent close/stage serializes and cannot append a stage after closure',async()=>{
  const n=await inbound(undefined,'close-race-'+randomUUID()),session=(await conversations.read(account,tenant,n.conversation_id,'acquisition-sessions')).data[0],p=(await progress.read(account,tenant,n.conversation_id,session.id)).data,c=(await conversations.read(account,tenant,n.conversation_id)).data;
  const [move,close]=await Promise.allSettled([progress.mutate(account,tenant,n.conversation_id,session.id,{action:'stage',stage_key:p.process.definition.stages[1].key,reason:'Synthetic close race'},randomUUID(),p.version,'synthetic'),conversations.mutate(account,tenant,n.conversation_id,'transition',{target_status:'closed',reason:'Synthetic close race'},randomUUID(),c.version,'synthetic')]);
  assert.equal(close.status,'fulfilled');if(move.status==='rejected')assert.equal(move.reason.code,'SESSION_CLOSED');
  const final=(await progress.read(account,tenant,n.conversation_id,session.id)).data;assert.equal(final.status,'closed');const closed=(await conversations.read(account,tenant,n.conversation_id,'acquisition-sessions')).data[0];assert(final.history.every(e=>Date.parse(e.recorded_at)<=Date.parse(closed.closed_at)));
 });
 await test('snapshot waits for in-flight evidence commit and has a closed reproducible cutoff',async()=>{
  const runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();let pending,done=false;
  try{
   await runner.query('SELECT version FROM session_process_head WHERE tenant_id=? FOR UPDATE',[tenant]);
   const [parent]=await runner.query('SELECT * FROM session_milestone_event WHERE tenant_id=? AND id=?',[tenant,first]);
   const [row]=await runner.query('SELECT version FROM session_progress WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,sid]);
   const id=randomUUID(),next=String(BigInt(row.version)+1n);
   await runner.query("INSERT INTO session_milestone_event(tenant_id,id,session_id,need_id,revision,milestone_key,kind,supersedes_id,reason,occurred_at,recorded_at,actor_id) VALUES (?,?,?,?,?,?,'retract',?,'Synthetic held transaction',?,UTC_TIMESTAMP(3),?)",[tenant,id,sid,needA,next,parent.milestone_key,first,parent.occurred_at,principal]);
   await runner.query('UPDATE session_progress SET version=?,updated_at=UTC_TIMESTAMP(3) WHERE tenant_id=? AND session_id=?',[next,tenant,sid]);
   pending=progress.funnel(account,tenant,range).then(value=>{done=true;return value;});await new Promise(r=>setTimeout(r,100));assert.equal(done,false);await runner.commitTransaction();
   const frozen=(await pending).data;assert.deepEqual((await progress.funnel(account,tenant,{...range,as_of:frozen.as_of})).data,frozen);
  }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();await pending?.catch(()=>{});}
 });
 await test('durable recorded-time watermark survives a regressing database session clock',async()=>{
  await conversations.uow.run({tenantId:tenant},async s=>{
   const before=await advanceProgressClock(s),[clock]=await s.query('SELECT UNIX_TIMESTAMP(UTC_TIMESTAMP(3)) now');
   try{await s.query('SET timestamp=?',[Number(clock.now)-3]);const after=await advanceProgressClock(s);assert(after.getTime()>before.getTime());const [wall]=await s.query('SELECT UTC_TIMESTAMP(3) now');assert(after.getTime()>new Date(wall.now).getTime());}finally{await s.query('SET timestamp=0');}
  });
 });
 const plans=await ds.query('EXPLAIN SELECT * FROM session_milestone_event WHERE tenant_id=? AND session_id=? AND recorded_at<=? ORDER BY recorded_at,revision LIMIT 20001',[tenant,sid,new Date()]);
 await mkdir('artifacts/session-progress',{recursive:true});await writeFile('artifacts/session-progress/mysql.json',JSON.stringify({at:new Date().toISOString(),database:env.MYSQL_DATABASE,results,plans,fixturesRetained:true},null,2));console.log('PASS '+results.length+' persistent MySQL groups');
}finally{await ds.destroy();}
