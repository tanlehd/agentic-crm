import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { databaseSource } from '../apps/backend/dist/kernel/database/data-source.js';
import { migrate } from '../apps/backend/dist/kernel/database/migration-runner.js';
import { migrations } from '../apps/backend/dist/kernel/database/migrations.js';
import { NativeAuthService } from '../apps/backend/dist/modules/identity/auth/native-service.js';
import { nativeConfig } from '../apps/backend/dist/modules/identity/auth/native-config.js';
import { passwordHash,passwordMatches } from '../apps/backend/dist/modules/identity/auth/password.js';
import { PLATFORM_TENANT_ID as system } from '../apps/backend/dist/kernel/database/system-scope.js';
import { TransactionScope } from '../apps/backend/dist/kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from '../apps/backend/dist/modules/identity/authorization.js';
import { UnitOfWork } from '../apps/backend/dist/kernel/tenancy/unit-of-work.js';
import { seedIdentity,seedUsers,fixtureId } from '../apps/backend/dist/modules/identity/seed.js';
import { migrate as migrateConnector } from '../services/crm-connector/dist/schema.js';
const require=createRequire(new URL('../apps/backend/package.json',import.meta.url));const {createPool}=require('mysql2/promise');
const env=parseEnv(await readFile('.local/native-auth-test.env','utf8'));
if(env.MYSQL_DATABASE!=='native_identity_test'||env.MYSQL_HOST!=='127.0.0.1'||env.APP_ENV!=='test')throw new Error('TEST_TARGET_DENIED');
Object.assign(process.env,env);
const source=databaseSource(true);await source.initialize();
const pool=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,database:env.MYSQL_DATABASE,connectionLimit:5});
const results=[];const test=async(name,fn)=>{await fn();results.push({name,result:'PASS'});console.log('PASS '+name);};
try{
  await test('persistent native cold fixture and repeat preserves existing roles',async()=>{
    const seedEnv={...env,MYSQL_DATABASE:'native_seed_test',IDENTITY_SEED_MODE:'native',APP_ORIGIN:'http://localhost:18080'};
    const {DataSource}=require('typeorm');const ds=new DataSource({...databaseSource(true).options,database:'native_seed_test'});await ds.initialize();
    try{await migrate(ds);const input={issuer:'urn:agentic-crm:native',subjects:Object.fromEntries(seedUsers.map(u=>[u,fixtureId(`native:${u}`)]))};await seedIdentity(ds,input,seedEnv);
      const before=await ds.query('SELECT * FROM `role` ORDER BY tenant_id,id');assert.equal((await seedIdentity(ds,input,seedEnv)).created,0);assert.deepEqual(await ds.query('SELECT * FROM `role` ORDER BY tenant_id,id'),before);
      assert.equal((await ds.query('SELECT id FROM account')).length,6);
    }finally{await ds.destroy();}
  });
  await test('Connector legacy journal retrofit and checksums survive repeat',async()=>{
    const connector=createPool({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,database:'native_connector_test'});
    try{await connector.query("CREATE TABLE IF NOT EXISTS connector_schema_migration(version INT PRIMARY KEY,name VARCHAR(128) NOT NULL,checksum CHAR(64) NOT NULL,state ENUM('applying','applied') NOT NULL)");await migrateConnector(connector);const [before]=await connector.query('SELECT version,name,checksum,state FROM connector_schema_migration ORDER BY version');assert.equal(await migrateConnector(connector),0);const [after]=await connector.query('SELECT version,name,checksum,state FROM connector_schema_migration ORDER BY version');assert.deepEqual(after,before);
      const [missing]=await connector.query("SELECT t.TABLE_NAME FROM information_schema.TABLES t LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='tenant_id' AND c.IS_NULLABLE='NO' WHERE t.TABLE_SCHEMA=DATABASE() AND c.COLUMN_NAME IS NULL");assert.equal(missing.length,0);
    }finally{await connector.end();}
  });
  await test('forward migrations and no-op rerun',async()=>{await migrate(source);assert.equal(await migrate(source),0);const rows=await source.query('SELECT MAX(version) version FROM schema_migration');assert.equal(rows[0].version,migrations.length);});
  await test('all application tables have NOT NULL tenant_id',async()=>{const missing=await source.query("SELECT t.TABLE_NAME FROM information_schema.TABLES t LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='tenant_id' AND c.IS_NULLABLE='NO' WHERE t.TABLE_SCHEMA=DATABASE() AND t.TABLE_TYPE='BASE TABLE' AND c.COLUMN_NAME IS NULL");assert.equal(missing.length,0);});
  const account=randomUUID(),key='test_'+randomBytes(8).toString('hex'),password=randomBytes(24).toString('hex');
  await source.query("INSERT INTO account(id,issuer,subject,display_name,login_key,created_at,updated_at) VALUES (?,'urn:crm:native-test',?,'Synthetic native test',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account,key]);
  const encoded=await passwordHash(password);await source.query('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)',[system,account,encoded,Date.now()]);
  let clock=Date.now();const config=nativeConfig({APP_ENV:'test',APP_ORIGIN:'http://localhost:18080',SESSION_ENCRYPTION_KEY:randomBytes(32).toString('hex')});
  const auth=new NativeAuthService(config,pool,()=>clock);
  const signIn=async(service=auth,user=key,pass=password,ip=randomUUID())=>{const ch=await service.challenge(ip);return service.login(user,pass,ch.token,ch.browser,config.origin,ip);};
  await test('Argon2id password, policy and salted hashes',async()=>{assert.match(encoded,/^\$argon2id\$/);assert.equal(await passwordMatches(encoded,password),true);assert.equal(await passwordMatches(encoded,password+'x'),false);assert.notEqual(encoded,await passwordHash(password));await assert.rejects(passwordHash('short'));});
  let session;
  await test('native login, cookie binding and one-use challenge',async()=>{const ch=await auth.challenge('bind-'+key);await assert.rejects(auth.login(key,password,ch.token,randomBytes(32).toString('base64url'),config.origin,key),{code:'AUTH_CSRF_INVALID'});session=await auth.login(key,password,ch.token,ch.browser,config.origin,key);await assert.rejects(auth.login(key,password,ch.token,ch.browser,config.origin,key),{code:'AUTH_CSRF_INVALID'});assert.equal((await auth.session(session)).account_id,account);});
  await test('restart-independent MySQL sessions and CSRF',async()=>{const restarted=new NativeAuthService(config,pool,()=>clock);assert.equal((await restarted.session(session,true)).account_id,account);const csrf=await restarted.csrf(session);await assert.rejects(restarted.requireMutation(session,'https://foreign.invalid',csrf),{code:'AUTH_CSRF_INVALID'});await assert.rejects(restarted.requireMutation(session,config.origin,'wrong'),{code:'AUTH_CSRF_INVALID'});await restarted.requireMutation(session,config.origin,csrf);});
  await test('unavailable MySQL fails closed without cached session',async()=>{const unavailable=createPool({host:'127.0.0.1',port:1,user:'synthetic',connectTimeout:500});try{await assert.rejects(new NativeAuthService(config,unavailable).session(session));}finally{await unavailable.end();}});
  await test('wrong and unknown login are generic',async()=>{for(const name of [key,'unknown_'+key])await assert.rejects(signIn(auth,name,password+'bad'),{code:'AUTH_LOGIN_INVALID'});});
  await test('system context and tenant binding rejected',async()=>{assert.throws(()=>new TransactionScope({tenantId:system},null));await assert.rejects(source.query('INSERT INTO auth_attempt VALUES (?,?,?,?)',[randomUUID(),'a'.repeat(64),clock,1]));});
  await test('existing role/tenant authorization preserved for shared account',async()=>{const alpha=randomUUID(),beta=randomUUID(),member=randomUUID(),principal=randomUUID();for(const id of [alpha,beta])await source.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Native test tenant','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);await source.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','viewer',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,alpha,account]);await source.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,alpha,member]);const acl=new IdentityAuthorization(new UnitOfWork(source));await acl.runHuman(account,alpha,async(_s,a)=>assert.equal(a.principalId,principal));await assert.rejects(acl.runHuman(account,beta,async()=>{}));});
  await test('logout revokes without Redis/provider',async()=>{await auth.logout(session,config.origin,await auth.csrf(session));await assert.rejects(auth.session(session),{code:'AUTH_SESSION_REQUIRED'});});
  await test('expired sessions cannot be touched back to life',async()=>{const id=await signIn();clock+=8*3600_000+1;await assert.rejects(auth.session(id,true),{code:'AUTH_SESSION_REQUIRED'});clock-=8*3600_000+1;});
  await test('password reset race has one winner and revokes all sessions',async()=>{const id=await signIn();const token=await auth.issueRecovery(account,'reset');const next=randomBytes(24).toString('hex');const race=await Promise.allSettled([auth.resetPassword(token,next,config.origin,key+'reset'),auth.resetPassword(token,next,config.origin,key+'reset')]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);await assert.rejects(auth.session(id),{code:'AUTH_SESSION_REQUIRED'});await assert.rejects(signIn(),{code:'AUTH_LOGIN_INVALID'});const newer=await signIn(auth,key,next);await auth.changePassword(newer,config.origin,await auth.csrf(newer),next,password);await assert.rejects(auth.session(newer),{code:'AUTH_SESSION_REQUIRED'});});
  await test('account disable invalidates durable session immediately',async()=>{const id=await signIn();await source.query("UPDATE account SET native_status='disabled' WHERE id=?",[account]);await assert.rejects(auth.session(id),{code:'AUTH_SESSION_REQUIRED'});await source.query("UPDATE account SET native_status='active' WHERE id=?",[account]);});
  await test('login rate budget cannot be bypassed without Redis',async()=>{const unknown='limited_'+key;for(let i=0;i<5;i++)await assert.rejects(signIn(auth,unknown,password,unknown),{code:'AUTH_LOGIN_INVALID'});await assert.rejects(signIn(auth,unknown,password,unknown),{code:'AUTH_RATE_LIMITED'});});
  await mkdir('artifacts/SRC-038',{recursive:true});await writeFile('artifacts/SRC-038/native-test.json',JSON.stringify({platform:process.platform,node:process.version,results,preservedData:true},null,2));
}finally{await pool.end();await source.destroy();}
