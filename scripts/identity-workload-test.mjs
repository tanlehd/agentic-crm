import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {PLATFORM_TENANT_ID as system} from '../services/core-baseline/dist/kernel/database/system-scope.js';
import {workloadReaderPrivileges,workloadOperatorPrivileges} from '../services/core-baseline/dist/kernel/database/workload-grants.js';
import {NativeWorkloadRegistry,WorkloadRegistryOperator,workloadAdmissionSql} from '../services/core-baseline/dist/modules/identity/workload-registry.js';
import {canonical} from '../services/core-baseline/dist/kernel/reliability/commands.js';
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8')),f=JSON.parse(await readFile('.local/identity-dispatch-fixture.json','utf8'));
assert.equal(env.APP_ENV,'test');assert.equal(env.MYSQL_DATABASE,'native_identity_test');assert.equal(env.MYSQL_HOST,'127.0.0.1');assert.equal(env.MYSQL_PORT,'13306');Object.assign(process.env,env);
const dir='artifacts/identity-workload',file='.local/identity-workload-fixture.json';await mkdir(dir,{recursive:true});
let saved;try{saved=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;saved={reader:randomBytes(32).toString('hex'),operator:randomBytes(32).toString('hex')};await writeFile(file,JSON.stringify(saved),{flag:'wx',mode:0o600});}
assert.ok([saved.reader,saved.operator].every(p=>/^[a-f0-9]{64}$/.test(p)));
const ds=databaseSource(true);await ds.initialize();let reader,operator,op,registry;const groups=[];
const test=async(name,fn)=>{await fn();groups.push(name);console.log('PASS '+name);};
const bad=(p,code='FORBIDDEN')=>assert.rejects(p,e=>e.code===code);
const version=async(service='chat')=>String((await ds.query('SELECT version FROM identity_workload_service WHERE tenant_id=? AND service=?',[system,service]))[0].version);
const leaf=()=>({fingerprint:randomBytes(32).toString('hex'),notBeforeMs:Date.now()-1000,notAfterMs:Date.now()+3600000});
const cert=async p=>(await ds.query('SELECT * FROM identity_workload_certificate WHERE tenant_id=? AND service=? AND fingerprint=?',[system,'chat',p.fingerprint]))[0];
let current;
try{
 await test('WLR-01 retained forward41 preserves every old row and journal; rerun no-op',async()=>{
  const old=await ds.query('SELECT * FROM schema_migration ORDER BY version');assert.ok(old.length>=40&&old.length<=migrations.length);const target=Math.max(41,old.length);
  const tables=(await ds.query("SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>'schema_migration' ORDER BY TABLE_NAME")).map(r=>r.name),snapshot={};
  const digest=rows=>createHash('sha256').update(canonical(JSON.parse(JSON.stringify(rows)).map(canonical).sort())).digest('hex');
  for(const table of tables){assert.match(table,/^[a-z][a-z0-9_]*$/);const rows=await ds.query('SELECT * FROM `'+table+'`');snapshot[table]={count:rows.length,digest:digest(rows)};}
  const applied=await migrate(ds,migrations.slice(0,target));assert.equal(applied,target-old.length);assert.equal(await migrate(ds,migrations.slice(0,target)),0);
  assert.deepEqual((await ds.query('SELECT * FROM schema_migration ORDER BY version')).slice(0,old.length),old);
  for(const table of tables){const rows=await ds.query('SELECT * FROM `'+table+'`');assert.deepEqual({count:rows.length,digest:digest(rows)},snapshot[table]);}
  const evidence=JSON.stringify({from:old.length,to:target,applied,preserved:snapshot},null,2);await writeFile(dir+'/migration.json',evidence);if(applied)await writeFile(dir+'/migration-upgrade.json',evidence);
 });
 const roles=[['workload_reader_test',saved.reader,workloadReaderPrivileges],['workload_operator_test',saved.operator,workloadOperatorPrivileges]];
 const sql=roles.map(([user,pw,privileges])=>`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${pw}';\nREVOKE ALL PRIVILEGES, GRANT OPTION FROM '${user}'@'%';\n`+Object.entries(privileges).map(([t,p])=>`GRANT ${p} ON native_identity_test.\`${t}\` TO '${user}'@'%';`).join('\n')).join('\n');
 const provision=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});assert.equal(provision.status,0,'narrow role provision');
 reader=databaseSource(false,{user:roles[0][0],password:saved.reader});operator=databaseSource(false,{user:roles[1][0],password:saved.operator});await reader.initialize();await operator.initialize();op=new WorkloadRegistryOperator(operator);registry=new NativeWorkloadRegistry(reader);
 await test('WLR-02 explicit admission and disabled default; initialization preserves state',async()=>{
  for(const s of ['identity','chat','connector'])await op.initialize(s);
  const before=await version();assert.equal(await op.initialize('chat'),before);
  await op.setEnabled('chat',before,false);current=leaf();await op.rotate('chat',await version(),current,0);
  await op.admit('chat',await version(),f.tenant,true);await bad(registry.authorize('chat',current.fingerprint,f.tenant));
  await op.setEnabled('chat',await version(),true);await registry.authorize('chat',current.fingerprint,f.tenant);
  await bad(registry.authorize('chat',current.fingerprint,randomUUID()));await bad(registry.authorize('chat',current.fingerprint,system));await bad(registry.authorize('connector',current.fingerprint,f.tenant));await bad(registry.authorize('chat','0'.repeat(64),f.tenant));
  await op.admit('chat',await version(),f.other,false);await bad(registry.authorize('chat',current.fingerprint,f.other));
  await op.admit('chat',await version(),f.other,true);await registry.authorize('chat',current.fingerprint,f.other);await op.admit('chat',await version(),f.other,false);
 });
 await test('WLR-03 rotation overlap bounded and old deadlines never extended',async()=>{
  const first=current;current=leaf();await op.rotate('chat',await version(),current,3600000);await registry.authorize('chat',first.fingerprint,f.tenant);
  const deadline=Number((await cert(first)).accept_until_ms);assert.ok(deadline<=Date.now()+3600000);const next=leaf();await op.rotate('chat',await version(),next,3600000);assert.ok(Number((await cert(first)).accept_until_ms)<=deadline);
  await op.rotate('chat',await version(),leaf(),0);await bad(registry.authorize('chat',first.fingerprint,f.tenant));await bad(registry.authorize('chat',current.fingerprint,f.tenant));
  current=leaf();await op.rotate('chat',await version(),current,0);await registry.authorize('chat',current.fingerprint,f.tenant);
  await bad(op.rotate('chat',await version(),current,0),'CONFLICT');
 });
 await test('WLR-03 revoke terminal and enable cannot revive; current reads have no cache',async()=>{
  await registry.authorize('chat',current.fingerprint,f.tenant);await op.setEnabled('chat',await version(),false);await bad(registry.authorize('chat',current.fingerprint,f.tenant));await op.setEnabled('chat',await version(),true);
  await op.admit('chat',await version(),f.tenant,false);await bad(registry.authorize('chat',current.fingerprint,f.tenant));await op.admit('chat',await version(),f.tenant,true);
  await op.revoke('chat',await version(),current.fingerprint);await bad(registry.authorize('chat',current.fingerprint,f.tenant));await op.setEnabled('chat',await version(),true);await bad(registry.authorize('chat',current.fingerprint,f.tenant));await bad(op.rotate('chat',await version(),current,0),'CONFLICT');
  current=leaf();await op.rotate('chat',await version(),current,0);
 });
 await test('WLR-02 current system/business suspension and exact SQL validity fail closed',async()=>{
  for(const tenant of [system,f.tenant]){const [old]=await ds.query('SELECT status FROM tenant WHERE id=?',[tenant]);try{await ds.query("UPDATE tenant SET status='suspended' WHERE id=?",[tenant]);await bad(registry.authorize('chat',current.fingerprint,f.tenant));}finally{await ds.query('UPDATE tenant SET status=? WHERE id=?',[old.status,tenant]);}}
  const expired=leaf();await op.rotate('chat',await version(),expired,3600000);await ds.query('UPDATE identity_workload_certificate SET accept_until_ms=FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) WHERE tenant_id=? AND service=? AND fingerprint=?',[system,'chat',expired.fingerprint]);await bad(registry.authorize('chat',expired.fingerprint,f.tenant));
  const future=leaf();await op.rotate('chat',await version(),future,3600000);await ds.query('UPDATE identity_workload_certificate SET not_before_ms=? WHERE tenant_id=? AND service=? AND fingerprint=?',[Date.now()+60000,system,'chat',future.fingerprint]);await bad(registry.authorize('chat',future.fingerprint,f.tenant));
  await registry.authorize('chat',current.fingerprint,f.tenant);
 });
 await test('WLR-04 ten concurrent CAS rotations have one winner and no duplicate audit',async()=>{
  const expected=await version(),attempts=Array.from({length:10},leaf),result=await Promise.allSettled(attempts.map(p=>op.rotate('chat',expected,p,0)));
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1);for(const r of result.filter(x=>x.status==='rejected'))assert.equal(r.reason.code,'CONFLICT');
  current=attempts[result.findIndex(x=>x.status==='fulfilled')];assert.equal(await version(),String(BigInt(expected)+1n));await registry.authorize('chat',current.fingerprint,f.tenant);
  assert.equal(Number((await ds.query('SELECT COUNT(*) n FROM identity_workload_event WHERE tenant_id=? AND service=? AND version=?',[system,'chat',await version()]))[0].n),1);
 });
 await test('WLR-04 audit failure rolls back rotation and admission deadlines',async()=>{
  const expected=await version(),old=await cert(current),p=leaf(),proxy=Object.create(operator);proxy.transaction=(isolation,work)=>operator.transaction(isolation,async m=>{const wrapped=Object.create(m);wrapped.query=async(sql,args)=>{if(sql.startsWith('INSERT INTO identity_workload_event'))throw Object.assign(new Error('synthetic audit failure'),{code:'AUDIT_FAILED'});return m.query(sql,args);};return work(wrapped);});
  await bad(new WorkloadRegistryOperator(proxy).rotate('chat',expected,p,0),'AUDIT_FAILED');assert.equal(await version(),expected);assert.deepEqual(await cert(current),old);assert.equal(await cert(p),undefined);
 });
 await test('WLR-04 committed ACK loss reconciles version; replay cannot rearm',async()=>{
  const expected=await version(),p=leaf(),proxy=Object.create(operator);proxy.transaction=async(...args)=>{await operator.transaction(...args);throw Object.assign(new Error('lost ACK'),{code:'ACK_LOST'});};
  await bad(new WorkloadRegistryOperator(proxy).rotate('chat',expected,p,0),'ACK_LOST');assert.equal(await version(),String(BigInt(expected)+1n));await bad(op.rotate('chat',expected,p,0),'CONFLICT');await bad(op.rotate('chat',await version(),p,0),'CONFLICT');current=p;await new NativeWorkloadRegistry(reader).authorize('chat',p.fingerprint,f.tenant);
 });
 await test('WLR-05 runtime and operator least privilege deny foreign data and audit rewrite',async()=>{
  for(const source of [reader,operator])for(const sql of ['SELECT * FROM auth_session LIMIT 0','SELECT * FROM account_credential LIMIT 0','SELECT * FROM conversation LIMIT 0','SELECT * FROM native_connector_test.connector_dispatch_guard LIMIT 0','DELETE FROM identity_workload_service WHERE 1=0','UPDATE identity_workload_event SET version=version WHERE 1=0','CREATE TABLE forbidden_workload_test(id INT)'])await assert.rejects(source.query(sql),e=>['ER_TABLEACCESS_DENIED_ERROR','ER_DBACCESS_DENIED_ERROR'].includes(e.code));
  for(const table of Object.keys(workloadReaderPrivileges))await assert.rejects(reader.query(`UPDATE ${table} SET tenant_id=tenant_id WHERE 1=0`),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');
 });
 await test('WLR-06 malformed metadata and registry outage fail closed',async()=>{
  const expected=await version();for(const [p,overlap] of [[{...leaf(),notAfterMs:Date.now()+86401000},0],[leaf(),3600001],[leaf(),-1],[{...leaf(),fingerprint:'not-hex'},0],[{...leaf(),notBeforeMs:Date.now()+10000},0],[{...leaf(),extra:true},0]])await bad(op.rotate('chat',expected,p,overlap),'INVALID_REQUEST');
  await bad(op.admit('chat',expected,system,true),'INVALID_REQUEST');await bad(op.admit('chat',expected,randomUUID(),true));await bad(op.initialize('unknown'),'INVALID_REQUEST');
  const unavailable=Object.create(reader);unavailable.query=async()=>{throw new Error('private database failure');};await bad(new NativeWorkloadRegistry(unavailable).authorize('chat',current.fingerprint,f.tenant),'DEPENDENCY_UNAVAILABLE');assert.equal(await version(),expected);
 });
 await test('WLR-01 physical CHECK constraints enforce scope and lifetime',async()=>{
  await assert.rejects(ds.query('INSERT INTO identity_workload_admission(tenant_id,service,enabled,updated_at) VALUES(?,?,1,UTC_TIMESTAMP(6))',[system,'chat']),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
  await assert.rejects(ds.query('INSERT INTO identity_workload_certificate(tenant_id,service,fingerprint,not_before_ms,not_after_ms,accept_until_ms,revoked,created_at) VALUES(?,?,?,0,86400001,86400001,0,UTC_TIMESTAMP(6))',[system,'chat',leaf().fingerprint]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');
 });
 await test('WLR-07 exact admission lookup uses PK and audit is contiguous',async()=>{
  const plans=await reader.query('EXPLAIN '+workloadAdmissionSql,[f.tenant,system,'chat',current.fingerprint]);assert.ok(plans.every(p=>p.key==='PRIMARY'));await writeFile(dir+'/plans.json',JSON.stringify(plans,null,2));
  const events=await operator.query('SELECT version FROM identity_workload_event WHERE tenant_id=? AND service=? ORDER BY version',[system,'chat']);assert.deepEqual(events.map(e=>String(e.version)),Array.from({length:Number(await version())},(_,i)=>String(i+1)));
 });
 await writeFile(dir+'/native.json',JSON.stringify({node:process.version,platform:process.platform,groups,retained:true,nativeRegistry:true,tls:false,serviceCutover:false},null,2));
}finally{if(reader?.isInitialized)await reader.destroy();if(operator?.isInitialized)await operator.destroy();await ds.destroy();}
