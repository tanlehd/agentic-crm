import {chatDeliveryRuntimeNative} from './lib/chat-delivery-runtime-native.mjs';
import {chatExternalNative} from './lib/chat-external-native.mjs';
import assert from 'node:assert/strict';
import {chatCommandRecoveryHandlers} from '../services/chat/dist/command-reconciliation.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID, randomBytes, X509Certificate, createHash, createPublicKey } from 'node:crypto';
import { once } from 'node:events';
import { createPool, rootSQL } from './lib/chat-native.mjs';
import { workloadCertificates } from './lib/workload-certificates.mjs';
import { ownerWorkloadFixture } from './lib/owner-workload-fixture.mjs';
import { chatCustomNative } from './lib/chat-custom-native.mjs';
import { routingConfigNative } from './lib/routing-config-native.mjs';
import {chatOutboundNative} from './lib/chat-outbound-native.mjs';
import {chatWorkspaceNative} from './lib/chat-workspace-native.mjs';
import {chatRoutingFactsNative} from './lib/chat-routing-facts-native.mjs';
import {chatRoutingSyncNative} from './lib/chat-routing-sync-native.mjs';
import {chatAssignmentDirectoryNative} from './lib/chat-assignment-directory-native.mjs';
import {chatCatalogNative} from './lib/chat-catalog-native.mjs';
import {chatInboxNative} from './lib/chat-inbox-native.mjs';
import {chatCapabilityNative} from './lib/chat-capability-native.mjs';
import {chatDetailNative,detailFixtureObjects} from './lib/chat-detail-native.mjs';
import { chatHistoryNative } from './lib/chat-history-native.mjs';
import { chatReferenceNative } from './lib/chat-reference-native.mjs';
import { chatIngressNative } from './lib/chat-ingress-native.mjs';
import { databaseSource } from '../services/core-baseline/dist/kernel/database/data-source.js';
import { UnitOfWork } from '../services/core-baseline/dist/kernel/tenancy/unit-of-work.js';
import { NativeAuthService } from '../services/core-baseline/dist/modules/identity/auth/native-service.js';
import { NativeAccountDrain } from '../services/core-baseline/dist/modules/identity/auth/owner-drain.js';
import { nativeConfig } from '../services/core-baseline/dist/modules/identity/auth/native-config.js';
import { passwordHash } from '../services/core-baseline/dist/modules/identity/auth/password.js';
import { hash } from '../services/core-baseline/dist/modules/identity/auth/security.js';
import { HumanDispatchEnrollment } from '../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';
import { NativeOwnerHumanAuthority } from '../services/core-baseline/dist/modules/identity/owner-authority.js';
import { NativeOwnerAdmissions } from '../services/core-baseline/dist/modules/identity/owner-admission.js';
import { identityOwnerRoutes } from '../services/core-baseline/dist/modules/identity/owner-http.js';
import { identityOwnerTargetRoute } from '../services/core-baseline/dist/modules/identity/owner-target.js';
import { IdentityAdmin } from '../services/core-baseline/dist/modules/identity/admin.js';
import { ExternalApps, parseAppToken } from '../services/core-baseline/dist/modules/identity/external-apps.js';
import { NativeIdentityPolicyDrain } from '../services/core-baseline/dist/modules/identity/owner-policy-drain.js';
import { NativeWorkloadRegistry, WorkloadRegistryOperator } from '../services/core-baseline/dist/modules/identity/workload-registry.js';
import { ChatOwnerCommands } from '../services/chat/dist/owner-command.js';
import { ChatOwnership } from '../services/chat/dist/ownership.js';
import { chatOwnershipRoutes } from '../services/chat/dist/ownership-http.js';
import { ChatOwnershipHistory, chatOwnershipHistoryRoutes } from '../services/chat/dist/ownership-history.js';
import { NativeOwnerCapacity } from '../services/core-baseline/dist/modules/agents/owner-capacity.js';
import { ChatOwnershipBff, createChatOwnershipBff } from '../services/core-baseline/dist/modules/agents/owner-bff.js';
import { routingOwnerRoutes } from '../services/core-baseline/dist/modules/agents/owner-http.js';
import { defaultSessionProcess as defaultProcess } from '../services/chat/dist/session-progress-storage.js';
import { chatOwnerRecoveryRoutes } from '../services/chat/dist/owner-http.js';
import { createWorkloadServer, ownerClient, ownerCommandClient, ownerDigest, ownerBindingDigest, OwnerError, registryAdmissionRoute, remoteRegistryAuthority,workloadReadiness } from '../packages/workload-transport/dist/index.js';

const env = parseEnv(await readFile('.local/native-auth-test.env', 'utf8'));
assert.equal(env.APP_ENV, 'test'); assert.equal(env.MYSQL_DATABASE, 'native_identity_test');
assert.equal(env.MYSQL_HOST, '127.0.0.1'); assert.equal(env.MYSQL_PORT, '13306'); Object.assign(process.env, env);
const dir = '.local/chat-ownership', out = process.argv.includes('--with-baseline-relay') ? 'artifacts/chat-extraction/t09-20261026' : process.argv.includes('--with-runtime') ? 'artifacts/chat-extraction/t08-20261025' : process.argv.some(arg => ['--focus=Chat need', '--focus=Chat funnel', '--focus=Chat classification', '--focus=Chat session', '--focus=Chat activity', '--focus=Chat notes', '--focus=Chat list', '--focus=Chat queue', '--focus=Chat detail', '--focus=Chat capabilities', '--focus=Chat inbox', '--focus=Chat catalog', '--focus=Chat workspace', '--focus=Chat outbound', '--focus=Chat messaging', '--focus=Chat references', '--focus=Chat ingress'].includes(arg)) ? 'artifacts/chat-extraction/t05' : 'artifacts/chat-extraction/t04';
await mkdir(dir, { recursive: true }); await mkdir(out, { recursive: true });
const tenant = '01900000-0000-7000-8000-000000004101', other = '01900000-0000-7000-8000-000000004102';
const system = '01900000-0000-7000-8000-000000000001', fixturePath = dir + '/identity-fixture.json';
let f;
try { f = JSON.parse(await readFile(fixturePath, 'utf8')); }
catch (e) {
  if (e.code !== 'ENOENT') throw e;
  f = Object.fromEntries(['account', 'member', 'principal', 'role', 'adminAccount', 'adminMember', 'adminPrincipal', 'adminRole', 'object', 'policy'].map(k => [k, randomUUID()]));
  Object.assign(f, { environment: 'retained-test', database: env.MYSQL_DATABASE, tenant, password: randomBytes(24).toString('base64url'), key: randomBytes(32).toString('hex'), runtime: randomBytes(32).toString('hex') });
  await writeFile(fixturePath, JSON.stringify(f), { flag: 'wx', mode: 0o600 });
}
assert.equal(f.environment, 'retained-test'); assert.equal(f.database, env.MYSQL_DATABASE); assert.equal(f.tenant, tenant);
assert.match(f.runtime, /^[a-f0-9]{64}$/);
if (!f.otherMember) {
  for (const key of ['otherMember', 'otherPrincipal', 'otherRole', 'otherObject']) f[key] = randomUUID();
  await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 });
}
if (!f.routingService) {
  f.routingService = randomUUID(); f.serviceRole = randomUUID();
  await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 });
}
if (!f.externalApp) { f.externalApp = randomUUID(); await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 }); }
if (!f.aiPrincipal) {
  for (const key of ['aiPrincipal', 'aiAgent', 'aiPolicy', 'aiRole', 'aiFieldPolicy']) f[key] = randomUUID();
  await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 });
}
const operator = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true });
const cfg = JSON.parse(await readFile(dir + '/credentials.json', 'utf8'));
assert.equal(cfg.database, 'test_crm_chat_owner'); assert.equal(cfg.host, '127.0.0.1'); assert.equal(cfg.port, 13306);
const chatPool = createPool({ host: cfg.host, port: cfg.port, database: cfg.database, user: 'chat_owner_test_runtime', password: cfg.runtime, timezone: 'Z', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true });
const chatOperator = createPool({ host: cfg.host, port: cfg.port, database: cfg.database, user: 'chat_owner_test_operator', password: cfg.operator, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true });
const routingFixture = JSON.parse(await readFile(dir + '/routing-fixture.json', 'utf8'));
assert.equal(routingFixture.database, env.MYSQL_DATABASE); assert.equal(routingFixture.tenant, tenant);
const routingPool = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: 'routing_owner_test_runtime', password: routingFixture.runtime, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true });
const ds = databaseSource(false, { user: 'identity_owner_test_runtime', password: f.runtime });
const adminSource = databaseSource(false, { user: env.MYSQL_MIGRATION_USER, password: env.MYSQL_MIGRATION_PASSWORD });
const workloadCredentials = JSON.parse(await readFile('.local/identity-workload-fixture.json', 'utf8'));
const registrySource = databaseSource(false, { user: 'workload_reader_test', password: workloadCredentials.reader });
const identityPool = createPool({ host: env.MYSQL_HOST, port: Number(env.MYSQL_PORT), database: env.MYSQL_DATABASE, user: 'identity_owner_test_runtime', password: f.runtime, timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true });
const authConfig = nativeConfig({ APP_ENV: 'test', APP_ORIGIN: 'http://localhost:18080', SESSION_ENCRYPTION_KEY: f.key });
const auth = new NativeAuthService(authConfig, operator), commands = new ChatOwnerCommands(chatPool, '1');
const grants = ['read', 'reply', 'assign', 'takeover', 'update'].map(action => ({ resource: 'conversation', action, scope: 'all' }));
const tableNames = ['identity_owner_admission', 'identity_owner_gate', 'identity_owner_barrier'];
const definitions = await readFile('docs/data/chat-extraction/owner-additions-v1.sql', 'utf8');
const ddl = tableNames.map(name => {
  const source = definitions.match(new RegExp('CREATE TABLE `crm_identity`\\.`' + name + '` \\([\\s\\S]*?;(?=\\r?\\n|$)'))?.[0];
  assert(source, 'Reviewed Identity table missing');
  return source.replace('`crm_identity`.', '');
});
const definitionDigest = createHash('sha256').update(ddl.join('\n')).digest('hex');
const accountTables = ['identity_account_gate', 'identity_account_barrier'];
const accountDDL = accountTables.map(name => {
  const sql = definitions.match(new RegExp('CREATE TABLE `crm_identity`\\.`' + name + '` \\([\\s\\S]*?;(?=\\r?\\n|$)'))?.[0];
  assert(sql); return sql.replace('`crm_identity`.', '');
});
const accountDigest = createHash('sha256').update(accountDDL.join('\n')).digest('hex');
const results = [], servers = [], transportRetries = []; let phase = 'setup';
async function retryCommand(send, request) {
  for (let attempt = 0; ; attempt++) {
    try { return await send(request); }
    catch (error) {
      if (error.code !== 'DEPENDENCY_UNAVAILABLE' || attempt >= 2) throw error;
      transportRetries.push({ phase, operation: request.operation, attempt: attempt + 1 });
      await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1000 : 5000));
    }
  }
}
const focus = process.argv.find(arg => arg.startsWith('--focus='))?.slice('--focus='.length);
if (focus !== undefined && !['Chat delivery','Chat external','Chat recovery','Chat routing facts','Chat routing sync','Chat directory','IdentityAdmin', 'ExternalApps', 'Chat assignment', 'AI target', 'Chat history', 'Chat custom', 'Routing config', 'Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue', 'Chat detail', 'Chat capabilities', 'Chat inbox', 'Chat catalog', 'Chat workspace', 'Chat outbound', 'Chat messaging', 'Chat references', 'Chat ingress'].includes(focus)) throw new Error('UNKNOWN_FOCUS');
if(process.argv.includes('--source-only')&&(focus!=='Chat need'||!process.argv.includes('--with-source')))throw new Error('NEED_SOURCE_FOCUS_REQUIRED');
if(process.argv.includes('--outcomes-only')&&(focus!=='Chat need'||!process.argv.includes('--with-outcomes')))throw new Error('OUTCOME_FOCUS_REQUIRED');
let identity, identityClient, adminSession, actorSession, enrollment, unavailable = false;
const denies = (promise, code) => assert.rejects(promise, e => e.code === code);
const check = async (name, work) => { if (process.argv.includes('--runtime-only')&&!name.includes('runtime') || process.argv.includes('--metadata-writer-only')&&!name.includes('metadata writer') || focus && !name.includes(focus) || process.argv.includes('--outcomes-only') && !name.includes('Chat need outcome')) return; phase = name; await work(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); };
async function seed() {
  const connection = await operator.getConnection();
  try {
    await connection.beginTransaction();
    for (const t of [tenant, other]) await connection.execute("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic owner candidate','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id", [t]);
    for (const admin of [false, true]) {
      const account = admin ? f.adminAccount : f.account, member = admin ? f.adminMember : f.member;
      const principal = admin ? f.adminPrincipal : f.principal, role = admin ? f.adminRole : f.role;
      if (!(await connection.execute('SELECT id FROM account WHERE tenant_id=? AND id=?', [system, account]))[0].length) {
        await connection.execute("INSERT INTO account(id,issuer,subject,display_name,login_key,created_at,updated_at) VALUES (?,'urn:agentic-crm:native',?,'Synthetic owner Human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [account, account, 'owner_' + account]);
        await connection.execute('INSERT INTO account_credential(tenant_id,account_id,password_hash,changed_at) VALUES (?,?,?,?)', [system, account, await passwordHash(f.password), Date.now()]);
        await connection.execute("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [member, tenant, account, admin ? 'admin' : 'chat']);
        await connection.execute("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [principal, tenant, member]);
        await connection.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,'Synthetic owner role',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [role, tenant, admin ? 'tenant_admin' : 'owner_test', JSON.stringify(admin ? [] : grants)]);
        await connection.execute('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)', [tenant, principal, role]);
      }
    }
    if (!(await connection.execute('SELECT id FROM object_type WHERE tenant_id=? AND id=?', [tenant, f.object]))[0].length) {
      await connection.execute("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'conversation','Conversation','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.object, tenant]);
      await connection.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.policy, tenant, f.role, f.object]);
    }
    if (!(await connection.execute('SELECT id FROM membership WHERE tenant_id=? AND id=?', [other, f.otherMember]))[0].length) {
      await connection.execute("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.otherMember, other, f.account]);
      await connection.execute("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.otherPrincipal, other, f.otherMember]);
      await connection.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'owner_test','Synthetic multi-tenant role',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.otherRole, other, JSON.stringify(grants)]);
      await connection.execute('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)', [other, f.otherPrincipal, f.otherRole]);
      await connection.execute("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'conversation','Conversation','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.otherObject, other]);
    }
    for (const t of [tenant, other]) await connection.execute("INSERT INTO identity_owner_gate(tenant_id,barrier_id,state,request_digest,version,created_at,updated_at) VALUES (?,?,'open',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id", [t, randomUUID(), ownerDigest({ fixture: 't04-identity' })]);
    if (!(await connection.execute('SELECT id FROM service_actor WHERE tenant_id=? AND id=?', [tenant, f.routingService]))[0].length) {
      await connection.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'human_routing_dispatch','Synthetic Routing actor',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.serviceRole, tenant, JSON.stringify(grants.filter(g => ['read', 'assign'].includes(g.action)))]);
      await connection.execute("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'human_routing_dispatch',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.routingService, tenant, f.serviceRole]);
    }
    if (!(await connection.execute('SELECT id FROM principal WHERE tenant_id=? AND id=?', [tenant, f.aiPrincipal]))[0].length) {
      await connection.execute("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'owner_ai_candidate',?,?,30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.aiPolicy, tenant, JSON.stringify(['conversation.propose_reply']), JSON.stringify(['conversation.read', 'conversation.reply'])]);
      await connection.execute("INSERT INTO ai_agent(id,tenant_id,name,runtime_adapter,policy_id,max_concurrency,created_at,updated_at) VALUES (?,?,'Synthetic owner AI','mock',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.aiAgent, tenant, f.aiPolicy]);
      await connection.execute("INSERT INTO principal(id,tenant_id,kind,ai_agent_id,status,created_at,updated_at) VALUES (?,?,'ai',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.aiPrincipal, tenant, f.aiAgent]);
      await connection.execute("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'owner_ai_candidate','Synthetic owner AI',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.aiRole, tenant, JSON.stringify(grants.filter(g => ['read', 'reply'].includes(g.action)))]);
      await connection.execute('INSERT INTO principal_role(tenant_id,principal_id,role_id) VALUES (?,?,?)', [tenant, f.aiPrincipal, f.aiRole]);
      await connection.execute("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text','[]',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [f.aiFieldPolicy, tenant, f.aiRole, f.object]);
    }
    await connection.commit();
  } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }
}
async function login(account) { const ip = randomUUID(), challenge = await auth.challenge(ip); return auth.login('owner_' + account, f.password, challenge.token, challenge.browser, authConfig.origin, ip); }
async function prepare(mutate = () => {}) {
  const request = { purpose: 'synthetic-owner-authority' }, b = { tenant_id: tenant, command_id: randomUUID(), owner: 'chat', operation: 'routing-assignment',
    actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId },
    resource: { resource_id: randomUUID(), object_key: 'conversation', record_version: '1', owner_revision: '1', control_revision: '1', owner_principal_id: f.principal, team_id: null, shared_team_ids: [], archived: false },
    target: { principal_id: f.principal, kind: 'human', team_id: null }, session_id: randomUUID(), fields: ['owner_principal_id', 'team_id'], payload_digest: ownerDigest(request), legacy_receipt_key: 'synthetic-owner:' + randomUUID(), graph: null, dependencies: [] };
  mutate(b); await commands.prepare(b, request); return { command_id: b.command_id, binding_digest: ownerBindingDigest(b) };
}
const admit = key => identityClient(tenant, 'admit', { owner: 'chat', command: key });
const settle = (key, receipt) => identityClient(tenant, 'settle', { owner: 'chat', command: key, admission_id: receipt.admission_id });
async function temporary(sql, args, restore, work) {
  await operator.execute(sql, args);
  try { await work(); } finally { await operator.execute(sql, restore); }
}
try {
  if (process.argv.includes('--provision')) {
    const stamp = dir + '/identity-schema.json';
    let prior; try { prior = JSON.parse(await readFile(stamp, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (prior && prior.digest !== definitionDigest) throw new Error('FIXTURE_DDL_DRIFT');
    for (let i = 0; i < tableNames.length; i++) {
      const [rows] = await operator.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [env.MYSQL_DATABASE, tableNames[i]]);
      if (!rows.length) await operator.query(ddl[i]);
    }
    const accountStamp = dir + '/identity-account-schema.json';
    let priorAccount; try { priorAccount = JSON.parse(await readFile(accountStamp, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (priorAccount && priorAccount.digest !== accountDigest) throw new Error('ACCOUNT_FIXTURE_DDL_DRIFT');
    for (let i = 0; i < accountTables.length; i++) {
      const [rows] = await operator.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [env.MYSQL_DATABASE, accountTables[i]]);
      if (!rows.length) await operator.query(accountDDL[i]);
    }
    const privileges = { tenant: 'SELECT,UPDATE(version)', account: 'SELECT', auth_session: 'SELECT', membership: 'SELECT', principal: 'SELECT,UPDATE', role: 'SELECT,INSERT,UPDATE', principal_role: 'SELECT', team: 'SELECT', team_member: 'SELECT', field_policy: 'SELECT', service_actor: 'SELECT,INSERT,UPDATE', ai_agent: 'SELECT', agent_policy: 'SELECT', identity_dispatch_delegation: 'SELECT,INSERT', identity_owner_admission: 'SELECT,INSERT,UPDATE', identity_owner_gate: 'SELECT,UPDATE', identity_owner_barrier: 'SELECT,INSERT,UPDATE', identity_account_gate: 'SELECT,UPDATE', identity_account_barrier: 'SELECT,UPDATE', audit_entry: 'INSERT', outbox_event: 'INSERT' };
    rootSQL(`CREATE USER IF NOT EXISTS 'identity_owner_test_runtime'@'%' IDENTIFIED BY '${f.runtime}';\n` + Object.entries(privileges).map(([table, access]) => `GRANT ${access} ON native_identity_test.\`${table}\` TO 'identity_owner_test_runtime'@'%';`).join('\n'));
    await writeFile(stamp, JSON.stringify({ database: env.MYSQL_DATABASE, tables: tableNames, digest: definitionDigest }));
    await writeFile(accountStamp, JSON.stringify({ database: env.MYSQL_DATABASE, tables: accountTables, digest: accountDigest }));
  }
  const pinned = JSON.parse(await readFile(dir + '/identity-schema.json', 'utf8')); assert.equal(pinned.digest, definitionDigest);
  const accountPinned = JSON.parse(await readFile(dir + '/identity-account-schema.json', 'utf8')); assert.equal(accountPinned.digest, accountDigest);
  const workloadDigest = await ownerWorkloadFixture(operator, process.argv.includes('--provision'), !focus || ['Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue', 'Chat detail', 'Chat custom', 'Chat references', 'Chat ingress'].includes(focus));
  await seed(); const projectionObjects=['Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue','Chat detail'].includes(focus)?await detailFixtureObjects(operator,tenant):new Map(); await ds.initialize(); await adminSource.initialize(); await registrySource.initialize();
  actorSession = await login(f.account); adminSession = await login(f.adminAccount);
  enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
  const localHttp = process.argv.includes('--tls') ? null : Object.fromEntries(['chat','identity','routing','bff','crm','connector','workflow','sales'].map(service => [service, randomBytes(32).toString('hex')]));
  const certs = localHttp ? { material: async (_name, service) => ({ service, ca: '', cert: '', key: '', localHttp }) } : await workloadCertificates(), chatMaterial = await certs.material('owner-native-chat', 'chat'), identityMaterial = await certs.material('owner-native-identity', 'identity'), routingMaterial = await certs.material('composed-routing', 'routing'), bffMaterial = await certs.material('composed-bff', 'bff');
  const crmMaterial = !focus || ['Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue', 'Chat detail', 'Chat custom', 'Chat references', 'Chat ingress'].includes(focus) ? await certs.material('composed-crm', 'crm') : null;
  const connectorMaterial = ['Chat routing sync','Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue', 'Chat detail', 'Chat inbox', 'Chat outbound', 'Chat messaging', 'Chat references', 'Chat ingress'].includes(focus) ? await certs.material('composed-history-connector', 'connector') : null;
  const salesMaterial = focus === 'Chat need' || focus === 'Chat classification' && process.argv.includes('--with-contributions') ? await certs.material('composed-sales', 'sales') : null;
  const workflowMaterial = (focus === 'Chat delivery' || focus === 'Chat activity' || focus === 'Chat need' && process.argv.includes('--with-source')) ? await certs.material('composed-workflow', 'workflow') : null;
  const registry = new NativeWorkloadRegistry(registrySource, identityMaterial), registryOperator = new WorkloadRegistryOperator(adminSource);
  const registryVersion = async service => String((await adminSource.query('SELECT version FROM identity_workload_service WHERE tenant_id=? AND service=?', [system, service]))[0].version);
  for (const m of [identityMaterial, chatMaterial, routingMaterial, bffMaterial, ...(crmMaterial ? [crmMaterial] : []), ...(connectorMaterial ? [connectorMaterial] : []), ...(workflowMaterial ? [workflowMaterial] : []), ...(salesMaterial ? [salesMaterial] : [])]) {
    await registryOperator.initialize(m.service); await registryOperator.setEnabled(m.service, await registryVersion(m.service), true);
    for (const t of [tenant, other]) await registryOperator.admit(m.service, await registryVersion(m.service), t, true);
    if (localHttp) continue;
    const certificate = new X509Certificate(m.cert);
    // Test host/container clocks may straddle certificate notBefore by a few ms.
    // Wait for actual DB validity; never change or relax the registered validity.
    const [[clock]] = await operator.execute('SELECT FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) now_ms');
    const wait = certificate.validFromDate.getTime() - Number(clock.now_ms);
    assert(wait < 10000, 'Test clock skew exceeds enrollment tolerance');
    if (wait >= 0) await new Promise(resolve => setTimeout(resolve, wait + 100));
    await registryOperator.rotate(m.service, await registryVersion(m.service), { fingerprint: certificate.fingerprint256.replaceAll(':', '').toLowerCase(), notBeforeMs: certificate.validFromDate.getTime(), notAfterMs: certificate.validToDate.getTime() }, 0);
  }
  const protocol = localHttp ? 'http:' : 'https:';
  const transport = (peer, t) => registry.authorize(peer.service, peer.fingerprint, t);
  const signingKey = await readFile('.local/workload-registry-signing-key.pem');
  let proofClient, routingRecoveryClient;
  const uow = new UnitOfWork(ds), authority = new NativeOwnerHumanAuthority(uow, new Map([[tenant, f.object], [other, f.otherObject]]),projectionObjects);
  identity = new NativeOwnerAdmissions(uow, authority, (t, key, abort, owner) => {
    if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE');
    return (owner === 'routing' ? routingRecoveryClient : proofClient)(t, abort ? 'command-abort' : 'command-proof', key);
  });
  const identityServer = createWorkloadServer(identityMaterial, transport, { ...identityOwnerRoutes(identity), ...identityOwnerTargetRoute(uow), '/internal/v1/workloads/ready':workloadReadiness('identity',()=>ds.query('SELECT 1')), '/internal/v1/workloads/admit': registryAdmissionRoute(identityMaterial, signingKey, 'local-test-v1', transport) }); servers.push(identityServer);
  identityServer.listen(0, '127.0.0.1'); await once(identityServer, 'listening');
  const registryConfig = { url: new URL(protocol + '//127.0.0.1:' + identityServer.address().port + '/internal/v1/workloads/admit'), publicKey: createPublicKey(signingKey).export({ type: 'spki', format: 'pem' }), keyId: 'local-test-v1' };
  const chatAuthority = remoteRegistryAuthority(chatMaterial, registryConfig), routingAuthority = remoteRegistryAuthority(routingMaterial, registryConfig);
  let noteRecovery,outcomeRecovery;
  const chatServer = createWorkloadServer(chatMaterial, chatAuthority, chatOwnerRecoveryRoutes(commands,(t,ref)=>noteRecovery?noteRecovery(t,ref):commands.abort(t,ref),(t,ref)=>outcomeRecovery?outcomeRecovery(t,ref):commands.abort(t,ref))); servers.push(chatServer);
  chatServer.listen(0, '127.0.0.1'); await once(chatServer, 'listening');
  proofClient = ownerClient(identityMaterial, transport, 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
  identityClient = ownerClient(chatMaterial, chatAuthority, 'identity', new URL(protocol + '//127.0.0.1:' + identityServer.address().port + '/'));
  const recovery = {
    abort: (t, command, owner) => { if (unavailable) throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return (owner === 'routing' ? routingRecoveryClient : proofClient)(t, 'command-abort', command); },
    settle: (t, command, admission, owner) => identity.settle(t, command, admission, owner),
  };
  const accountDrain = new NativeAccountDrain(identityPool, recovery), drainingAuth = new NativeAuthService(authConfig, operator, Date.now, accountDrain);
  if(focus==='Chat delivery')await chatDeliveryRuntimeNative({check,operator,chatOperator,commands,chatMaterial,workflowMaterial,registryConfig,registryOperator,registryVersion,servers,f});
  if(focus==='Chat external')await chatExternalNative({chatServer,check,operator,chatOperator,chatPool,commands,tenant,other,f,ds,adminSource,identity,identityClient,identityMaterial,transport,proofClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers});
  if(focus==='Chat routing facts')await chatRoutingFactsNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,routingMaterial,routingAuthority,chatAuthority,protocol,servers,ds,auth,actorSession,login,drainingAuth});
  if(focus==='Chat routing sync')await chatRoutingSyncNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,identityClient,chatMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,protocol,servers,chatServer,env,registryConfig,connectorMaterial,identityMaterial,transport,authority,ds,auth,actorSession,login,drainingAuth,setRecovery:client=>{routingRecoveryClient=client;}});
  if(focus==='Chat directory')await chatAssignmentDirectoryNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,routingMaterial,routingPool,routingAuthority,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession,login,drainingAuth});
  if (focus === 'Chat outbound') await chatOutboundNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers,chatServer,identityMaterial,registrySource,auth,ds,actorSession,login,drainingAuth,authConfig});
  if (focus === 'Chat workspace') await chatWorkspaceNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession,chatServer});
  if (['Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue','Chat detail'].includes(focus)) await chatDetailNative({identity,adminSessionHash:hash(adminSession),routingPool,routingMaterial,routingAuthority,check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,crmMaterial,connectorMaterial,workflowMaterial,salesMaterial,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession,login,drainingAuth,env,projectionObjects,chatServer,accountDrain,setNoteRecovery:resolver=>{noteRecovery=resolver;},setOutcomeRecovery:resolver=>{outcomeRecovery=resolver;}});
  if (focus === 'Chat capabilities') await chatCapabilityNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession});
  if (focus === 'Chat inbox') await chatInboxNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,connectorMaterial,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession,adminSession,login,drainingAuth,env,chatServer});
  if (focus === 'Chat catalog') await chatCatalogNative({check,operator,chatOperator,chatPool,commands,tenant,other,f,enrollment,identityClient,chatMaterial,bffMaterial,chatAuthority,registryConfig,protocol,servers,ds,auth,actorSession,login,drainingAuth,chatServer});
  if (focus === 'Chat messaging') await chatHistoryNative({ check, operator, chatOperator, chatPool, commands, tenant, other, f, ds, auth, actorSession, adminSession,
    enrollment, identity, identityClient, chatMaterial, bffMaterial, connectorMaterial, chatAuthority, registryConfig, protocol, servers, drainingAuth, login, grants,chatServer });
  if (focus === 'Chat references') await chatReferenceNative({ check, operator, chatPool, commands, tenant, other, f, env,
    crmMaterial, connectorMaterial, chatMaterial, chatAuthority, registryConfig, chatServer, protocol, servers });
  if (focus === 'Chat ingress') await chatIngressNative({ check, operator, chatOperator, chatPool, commands, tenant, other, f, env,
    crmMaterial, connectorMaterial, chatMaterial, chatAuthority, registryConfig, chatServer, protocol, servers, identity, identityClient, routingMaterial,routingAuthority,routingPool,adminSessionHash: hash(adminSession) });
  if (crmMaterial && !['Chat need', 'Chat funnel', 'Chat classification', 'Chat session', 'Chat activity', 'Chat notes', 'Chat list', 'Chat queue', 'Chat detail', 'Chat references', 'Chat ingress'].includes(focus)) await chatCustomNative({ check, operator, chatOperator, chatPool, commands, tenant, other, f, enrollment, env,
    crmMaterial, bffMaterial, chatMaterial, registryConfig, chatAuthority, chatServer, identityClient, servers, identity, adminSessionHash: hash(adminSession), grants,
    protocol, ds,auth,actorSession,login,drainingAuth,reEnroll: () => new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession)), retryCommand });
  await check('Chat recovery native Identity settles an interrupted command without a replacement actor', async () => {
    const key=await prepare(),receipt=await admit(key);await commands.rememberDependency(tenant,key,'identity-admission',receipt);
    const unused={recover:async()=>{throw new Error('Unexpected child recovery');}},handlers=chatCommandRecoveryHandlers(commands,{call:(t,owner,operation,input)=>{assert.equal(owner,'identity');return identityClient(t,operation,input);}},{ingress:unused,notes:unused,outcomes:unused});
    await temporary('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND token_hash=?',[Date.now(),system,hash(actorSession)],[null,system,hash(actorSession)],async()=>{
      await handlers.get('routing-assignment')(tenant,key,await commands.proof(tenant,key));
    });
    assert.equal((await commands.proof(tenant,key)).state,'aborted');assert.equal((await identity.read(tenant,key,receipt.admission_id)).state,'settled');
    await handlers.get('routing-assignment')(tenant,key,await commands.proof(tenant,key));
  });
  await check('Chat recovery native Identity outage retains terminal proof and repeated settle completes', async () => {
    const key=await prepare(),receipt=await admit(key);await commands.rememberDependency(tenant,key,'identity-admission',receipt);
    let outage=true;const unused={recover:async()=>{throw new Error('Unexpected child recovery');}},handlers=chatCommandRecoveryHandlers(commands,{call:(t,owner,operation,input)=>{assert.equal(owner,'identity');if(outage)throw new OwnerError('DEPENDENCY_UNAVAILABLE');return identityClient(t,operation,input);}},{ingress:unused,notes:unused,outcomes:unused});
    await denies(handlers.get('routing-assignment')(tenant,key,await commands.proof(tenant,key)),'DEPENDENCY_UNAVAILABLE');
    const proof=await commands.proof(tenant,key);assert.equal(proof.state,'aborted');assert.equal((await identity.read(tenant,key,receipt.admission_id)).state,'admitted');outage=false;
    await handlers.get('routing-assignment')(tenant,key,proof);assert.deepEqual(await commands.proof(tenant,key),proof);assert.equal((await identity.read(tenant,key,receipt.admission_id)).state,'settled');
  });
  await check('Chat recovery committed native command stays committed while admission reconciliation repeats', async () => {
    const key=await prepare(),receipt=await admit(key);await commands.rememberDependency(tenant,key,'identity-admission',receipt);
    await commands.commit(tenant,key,receipt.admission_id,async()=>({effect_id:randomUUID(),effect_revision:'2'}));const proof=await commands.proof(tenant,key);
    const unused={recover:async()=>{throw new Error('Unexpected child recovery');}},handlers=chatCommandRecoveryHandlers(commands,{call:(t,owner,operation,input)=>{assert.equal(owner,'identity');return identityClient(t,operation,input);}},{ingress:unused,notes:unused,outcomes:unused});
    await handlers.get('routing-assignment')(tenant,key,proof);await handlers.get('routing-assignment')(tenant,key,proof);
    assert.deepEqual(await commands.proof(tenant,key),proof);assert.equal((await identity.read(tenant,key,receipt.admission_id)).state,'settled');
  });
  await check('native Human admission over configured transport is immutable, concurrent and tenant scoped', async () => {
    const preflight = await prepare(), local = await identity.admit(tenant, preflight);
    await commands.abort(tenant, preflight); await identity.settle(tenant, preflight, local.admission_id);
    const key = await prepare(), receipts = await Promise.all(Array.from({ length: 4 }, () => admit(key)));
    assert(receipts.every(x => x.admission_id === receipts[0].admission_id && x.state === 'admitted'));
    await denies(identity.read(other, key, receipts[0].admission_id), 'NOT_FOUND');
    await denies(identity.read(tenant, { ...key, binding_digest: 'f'.repeat(64) }, receipts[0].admission_id), 'CONFLICT');
    await denies(settle(key, receipts[0]), 'DEPENDENCY_UNAVAILABLE');
    await commands.abort(tenant, key); assert.equal((await settle(key, receipts[0])).state, 'settled');
    assert.equal((await settle(key, receipts[0])).state, 'settled');
  });
  await check('native current target membership, seat, availability and text field denial fail closed', async () => {
    const key = await prepare();
    await temporary('UPDATE auth_session SET revoked_at=? WHERE tenant_id=? AND token_hash=?', [Date.now(), system, hash(actorSession)], [null, system, hash(actorSession)], () => denies(admit(key), 'REVOKED'));
    await temporary('UPDATE membership SET status=? WHERE tenant_id=? AND id=?', ['suspended', tenant, f.member], ['active', tenant, f.member], () => denies(admit(key), 'FORBIDDEN'));
    await temporary('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?', ['viewer', tenant, f.member], ['chat', tenant, f.member], () => denies(admit(key), 'FORBIDDEN'));
    await temporary('UPDATE principal SET availability=? WHERE tenant_id=? AND id=?', ['unavailable', tenant, f.principal], ['available', tenant, f.principal], () => denies(admit(key), 'FORBIDDEN'));
    for (const action of ['read', 'write']) await temporary('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', [JSON.stringify([action]), tenant, f.policy], ['[]', tenant, f.policy], () => denies(admit(key), 'FORBIDDEN'));
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', ['[]', tenant, f.role], [JSON.stringify(grants), tenant, f.role], () => denies(admit(key), 'FORBIDDEN'));
    await denies(admit(await prepare(b => { b.actor.kind = 'service'; })), 'FORBIDDEN');
    await denies(admit(await prepare(b => { b.target.principal_id = f.adminPrincipal; b.operation = 'routing-takeover'; })), 'FORBIDDEN');
    await commands.abort(tenant, key);
  });
  await check('native AI target policy requires current availability, role, text fields and action/tool policy without granting execution capacity', async () => {
    const key = await prepare(b => { b.target = { principal_id: f.aiPrincipal, kind: 'ai', team_id: null }; });
    for (const [column, value, original] of [['allowed_actions', ['conversation.read'], ['conversation.read', 'conversation.reply']], ['allowed_tools', [], ['conversation.propose_reply']]]) {
      await temporary(`UPDATE agent_policy SET ${column}=? WHERE tenant_id=? AND id=?`, [JSON.stringify(value), tenant, f.aiPolicy], [JSON.stringify(original), tenant, f.aiPolicy], () => denies(admit(key), 'FORBIDDEN'));
    }
    await temporary('UPDATE principal SET availability=? WHERE tenant_id=? AND id=?', ['unavailable', tenant, f.aiPrincipal], ['available', tenant, f.aiPrincipal], () => denies(admit(key), 'FORBIDDEN'));
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', ['[]', tenant, f.aiRole], [JSON.stringify(grants.filter(g => ['read', 'reply'].includes(g.action))), tenant, f.aiRole], () => denies(admit(key), 'FORBIDDEN'));
    for (const action of ['read', 'write']) await temporary('UPDATE field_policy SET denied_actions=? WHERE tenant_id=? AND id=?', [JSON.stringify([action]), tenant, f.aiFieldPolicy], ['[]', tenant, f.aiFieldPolicy], () => denies(admit(key), 'FORBIDDEN'));
    const allowed = await admit(key); assert.equal(allowed.state, 'admitted'); await commands.abort(tenant, key); await settle(key, allowed);
    const actorAttempt = await prepare(b => { b.actor.kind = 'ai'; b.actor.principal_id = f.aiPrincipal; }); await denies(admit(actorAttempt), 'FORBIDDEN'); await commands.abort(tenant, actorAttempt);
    const wrongKind = await prepare(b => { b.target = { principal_id: f.aiPrincipal, kind: 'human', team_id: null }; }); await denies(admit(wrongKind), 'FORBIDDEN'); await commands.abort(tenant, wrongKind);
  });
  await check('revocation holds on owner outage then drains committed and aborted native commands before policy completion', async () => {
    const a = await prepare(), b = await prepare(), ra = await admit(a), rb = await admit(b);
    await commands.commit(tenant, a, ra.admission_id, async () => ({ effect_id: randomUUID(), effect_revision: '2' }));
    const barrier = randomUUID();
    assert.equal((await identity.beginRoleChange(tenant, hash(adminSession), barrier, f.role, [])).state, 'closing');
    unavailable = true; await denies(identity.drainRoleChange(tenant, barrier), 'DEPENDENCY_UNAVAILABLE'); unavailable = false;
    const [[roleBefore]] = await operator.execute('SELECT permissions FROM `role` WHERE tenant_id=? AND id=?', [tenant, f.role]); assert.deepEqual(typeof roleBefore.permissions === 'string' ? JSON.parse(roleBefore.permissions) : roleBefore.permissions, grants);
    await denies(admit(await prepare()), 'REVOKED');
    await denies(identity.beginRoleChange(tenant, hash(adminSession), barrier, f.role, grants), 'CONFLICT');
    assert.equal((await identity.drainRoleChange(tenant, barrier)).state, 'completed');
    assert.equal((await identity.read(tenant, a, ra.admission_id)).state, 'settled');
    assert.equal((await identity.read(tenant, b, rb.admission_id)).state, 'settled');
    assert.equal((await commands.proof(tenant, a)).state, 'committed'); assert.equal((await commands.proof(tenant, b)).state, 'aborted');
    await denies(admit(await prepare()), 'REVOKED');
    assert.equal((await identity.drainRoleChange(tenant, barrier)).state, 'completed');
    const [[count]] = await operator.execute('SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND correlation_id=?', [tenant, barrier]); assert.equal(Number(count.n), 1);
    const restore = randomUUID(); await identity.beginRoleChange(tenant, hash(adminSession), restore, f.role, grants); await identity.drainRoleChange(tenant, restore);
    enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    const key = await prepare(), receipt = await admit(key); await commands.abort(tenant, key); await settle(key, receipt);
  });
  await check('runtime credential cannot read Chat, CRM metadata, password hashes or dispatch grants and cannot DDL', async () => {
    const denied = e => ['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(e.code);
    for (const sql of ['SELECT id FROM test_crm_chat_owner.crm_record LIMIT 1', 'SELECT id FROM object_type LIMIT 1', 'SELECT password_hash FROM account_credential LIMIT 1', 'SELECT id FROM identity_dispatch_grant LIMIT 1', 'CREATE TABLE identity_forbidden(tenant_id CHAR(36))']) await assert.rejects(ds.query(sql), denied);
  });
  await check('actual native logout closes all-tenant admission and survives owner outage/restart without false completion', async () => {
    const key = await prepare(), receipt = await admit(key);
    const secondSession = await login(f.account), secondEnrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(secondSession));
    const csrf = await auth.csrf(actorSession);
    unavailable = true;
    try { await denies(drainingAuth.logout(actorSession, authConfig.origin, csrf), 'DEPENDENCY_UNAVAILABLE'); } finally { unavailable = false; }
    await denies(auth.session(actorSession), 'AUTH_SESSION_REQUIRED');
    const blocked = await prepare(b => { b.actor.delegation_id = secondEnrollment.delegationId; });
    await denies(admit(blocked), 'REVOKED');
    const [[gate]] = await operator.execute('SELECT state,barrier_id FROM identity_account_gate WHERE tenant_id=? AND account_id=?', [system, f.account]);
    assert.equal(gate.state, 'closing');
    const ref = { accountId: f.account, barrierId: gate.barrier_id };
    await new NativeAccountDrain(identityPool, recovery).drain(ref); await accountDrain.drain(ref);
    assert.equal((await commands.proof(tenant, key)).state, 'aborted'); assert.equal((await identity.read(tenant, key, receipt.admission_id)).state, 'settled');
    const accepted = await admit(blocked); await commands.abort(tenant, blocked); await settle(blocked, accepted);
    actorSession = secondSession; enrollment = secondEnrollment;
  });
  await check('native password change and one-use reset drain both tenant admissions before success', async () => {
    const own = await prepare(); await admit(own);
    const otherEnrollment = await new HumanDispatchEnrollment(ds).enroll(other, hash(actorSession));
    const foreign = await prepare(b => { b.tenant_id = other; b.actor.principal_id = f.otherPrincipal; b.actor.delegation_id = otherEnrollment.delegationId; b.resource.owner_principal_id = f.otherPrincipal; b.target.principal_id = f.otherPrincipal; });
    await identityClient(other, 'admit', { owner: 'chat', command: foreign });
    await drainingAuth.changePassword(actorSession, authConfig.origin, await auth.csrf(actorSession), f.password, f.password);
    for (const [t, command] of [[tenant, own], [other, foreign]]) assert.equal((await commands.proof(t, command)).state, 'aborted');
    await denies(auth.session(actorSession), 'AUTH_SESSION_REQUIRED');
    actorSession = await login(f.account); enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    const key = await prepare(); await admit(key);
    const token = await auth.issueRecovery(f.account, 'reset');
    await drainingAuth.resetPassword(token, f.password, authConfig.origin, randomUUID());
    assert.equal((await commands.proof(tenant, key)).state, 'aborted');
    await denies(drainingAuth.resetPassword(token, f.password, authConfig.origin, randomUUID()), 'AUTH_TOKEN_INVALID');
    const [[pending]] = await operator.execute("SELECT COUNT(*) n FROM identity_owner_admission WHERE account_id=? AND state='admitted'", [f.account]); assert.equal(Number(pending.n), 0);
  });
  await check('same-account and cross-account login replacement revoke and drain after SQL commit', async () => {
    for (const target of [f.account, f.adminAccount]) {
      actorSession = await login(f.account); enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
      const key = await prepare(), receipt = await admit(key);
      let probes = 0;
      const checkedDrain = new NativeAccountDrain(identityPool, {
        ...recovery,
        abort: async (t, command) => {
          const c = await operator.getConnection();
          try {
            await c.query('SET SESSION innodb_lock_wait_timeout=1'); await c.beginTransaction();
            await c.execute('SELECT id FROM account WHERE tenant_id=? AND id IN (?,?) FOR UPDATE', [system, f.account, target]);
            await c.commit(); probes++;
          } finally { await c.rollback(); c.release(); }
          return recovery.abort(t, command);
        },
      });
      const service = new NativeAuthService(authConfig, operator, Date.now, checkedDrain);
      const ip = randomUUID(), challenge = await service.challenge(ip);
      const replacement = await service.login('owner_' + target, f.password, challenge.token, challenge.browser, authConfig.origin, ip, actorSession);
      assert(probes > 0); await denies(auth.session(actorSession), 'AUTH_SESSION_REQUIRED');
      assert.equal((await auth.session(replacement)).account_id, target);
      assert.equal((await commands.proof(tenant, key)).state, 'aborted');
      assert.equal((await identity.read(tenant, key, receipt.admission_id)).state, 'settled');
    }
  });
  await check('Chat history uses native session and current Identity rights, Chat ACL CAS, bounded uint64 ordering and fresh replay admission', async () => {
    actorSession = await login(f.account); enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    const id = randomUUID();
    await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,?,7,9007199254741099,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [id, tenant, f.object, f.principal]);
    await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at,closed_at) VALUES (?,?,?,?,?,'closed',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, id, randomUUID(), randomUUID(), randomUUID()]);
    await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [tenant, id]);
    for (let n = 0; n < 105; n++) await chatOperator.execute(`INSERT INTO ownership_history(id,tenant_id,record_id,from_owner_id,to_owner_id,from_team_id,to_team_id,owner_revision,reason,actor_kind,actor_id,created_at)
      VALUES (?,?,?,NULL,?,NULL,NULL,?,'manual','human',?,UTC_TIMESTAMP(6))`, [randomUUID(), tenant, id, f.principal, String(9007199254740995n + BigInt(n)), f.principal]);
    const peers = {
      admit: (t, command) => identityClient(t, 'admit', { owner: 'chat', command }),
      settle: (t, command, admission_id) => identityClient(t, 'settle', { owner: 'chat', command, admission_id }),
    };
    const history = new ChatOwnershipHistory(commands, peers);
    const historyServer = createWorkloadServer(chatMaterial, chatAuthority, chatOwnershipHistoryRoutes(history)); servers.push(historyServer);
    historyServer.listen(0, '127.0.0.1'); await once(historyServer, 'listening');
    const bffAuthority = remoteRegistryAuthority(bffMaterial, registryConfig);
    const send = ownerCommandClient(bffMaterial, bffAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + historyServer.address().port + '/'));
    const publicServer = createChatOwnershipBff(new ChatOwnershipBff(auth, new HumanDispatchEnrollment(ds), send)); servers.push(publicServer);
    publicServer.listen(0, '127.0.0.1'); await once(publicServer, 'listening');
    const url = 'http://127.0.0.1:' + publicServer.address().port + '/api/v1/records/' + id + '/ownership-history';
    const get = async (headers = { 'X-Tenant-Id': tenant, Cookie: 'crm_session=' + actorSession }, suffix = '') => {
      const r = await fetch(url + suffix, { headers }); return { status: r.status, cache: r.headers.get('cache-control'), body: await r.json() };
    };
    assert.equal((await get({ 'X-Tenant-Id': tenant })).status, 401);
    assert.equal((await get(undefined, '?unexpected=1')).status, 400);
    assert.equal((await get({ 'X-Tenant-Id': other, Cookie: 'crm_session=' + actorSession })).status, 404);
    const good = await get(); assert.equal(good.status, 200, good.body.error?.code); assert.equal(good.cache, 'no-store');
    assert.equal(good.body.data.length, 100); assert.equal(good.body.data[0].owner_revision, '9007199254741099'); assert.equal(good.body.data[99].owner_revision, '9007199254741000');
    const input = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: 'routing-history', actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId }, command_id: randomUUID(), payload: { id } };
    assert.deepEqual((await send(input)).data, good.body.data);
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', [JSON.stringify(grants.filter(g => g.action === 'read')), tenant, f.role], [JSON.stringify(grants), tenant, f.role], async () => {
      await denies(send(input), 'FORBIDDEN'); const denied = await get(); assert.equal(denied.status, 403); assert.equal(denied.body.data, undefined);
    });
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', ['[]', tenant, f.role], [JSON.stringify(grants), tenant, f.role], () => denies(send(input), 'NOT_FOUND'));
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', [JSON.stringify(grants.filter(g => ['read', 'takeover'].includes(g.action))), tenant, f.role], [JSON.stringify(grants), tenant, f.role], async () => assert.equal((await send(input)).data.length, 100));
    // Closed and archived registry history follow the original Routing.read policy.
    await chatOperator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6),version=version+1 WHERE tenant_id=? AND id=?', [tenant, id]);
    assert.equal((await send(input)).data.length, 100);
    unavailable = true;
    try { const denied = await get(); assert.equal(denied.status, 503); assert.equal(denied.body.data, undefined); } finally { unavailable = false; }
    assert.equal((await send(input)).data.length, 100);
    let raced;
    const racing = new ChatOwnershipHistory(commands, { ...peers, admit: async (t, command) => {
      const receipt = await peers.admit(t, command); raced = { command, receipt };
      // This separate DB connection must not block: Identity RPC runs outside Chat SQL.
      const c = await chatOperator.getConnection();
      try { await c.query('SET innodb_lock_wait_timeout=1'); await c.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?', [tenant, id]); } finally { c.release(); }
      return receipt;
    } });
    await denies(racing.read(input), 'STALE_VERSION'); assert.equal((await commands.proof(tenant, raced.command)).state, 'aborted');
    assert.equal((await identity.read(tenant, raced.command, raced.receipt.admission_id)).state, 'settled');
    const aborting = new ChatOwnershipHistory(commands, { ...peers, admit: async (t, command) => {
      const receipt = await peers.admit(t, command); await commands.abort(t, command); return receipt;
    } });
    await denies(aborting.read(input), 'INVALID_TRANSITION');
    await denies(send({ ...input, actor: { ...input.actor, kind: 'service' } }), 'FORBIDDEN');
    const revoking = new ChatOwnershipHistory(commands, { ...peers, admit: async (t, command) => {
      const receipt = await peers.admit(t, command), barrier = randomUUID();
      await identity.beginRoleChange(tenant, hash(adminSession), barrier, f.role, grants.filter(g => g.action === 'read'));
      assert.equal((await identity.drainRoleChange(tenant, barrier)).state, 'completed');
      return receipt;
    } });
    try { await denies(revoking.read(input), 'INVALID_TRANSITION'); }
    finally {
      const restore = randomUUID(); await identity.beginRoleChange(tenant, hash(adminSession), restore, f.role, grants); await identity.drainRoleChange(tenant, restore);
      enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    }
    const logoutSession = await login(f.account), logoutHeaders = { 'X-Tenant-Id': tenant, Cookie: 'crm_session=' + logoutSession };
    assert.equal((await get(logoutHeaders)).status, 200);
    await drainingAuth.logout(logoutSession, authConfig.origin, await auth.csrf(logoutSession));
    const loggedOut = await get(logoutHeaders); assert.equal(loggedOut.status, 401); assert.equal(loggedOut.body.data, undefined);
    const [[pending]] = await operator.execute("SELECT COUNT(*) n FROM identity_owner_admission a WHERE tenant_id=? AND state='admitted' AND command_id IN (SELECT command_id FROM identity_owner_admission WHERE tenant_id=? AND principal_id=?)", [tenant, tenant, f.principal]);
    assert.equal(Number(pending.n), 0);
  });
  await check('actual Chat assignment composes native Identity and Routing over configured transport, replays lost confirmation and rejects revoked rights', async () => {
    for (const dataset of ['conversion', 'stage', 'progress', 'routing', 'registry']) await chatOperator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant, dataset]);
    actorSession = await login(f.account); enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    await operator.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled) VALUES (?,?,1,1) ON DUPLICATE KEY UPDATE principal_id=principal_id', [tenant, f.principal]);
    const routingProof = ownerClient(routingMaterial, routingAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
    const capacity = new NativeOwnerCapacity(routingPool, (t, command, abort) => routingProof(t, abort ? 'command-abort' : 'command-proof', command));
    const routingServer = createWorkloadServer(routingMaterial, routingAuthority, routingOwnerRoutes(capacity)); servers.push(routingServer);
    routingServer.listen(0, '127.0.0.1'); await once(routingServer, 'listening');
    const routingClient = ownerClient(chatMaterial, chatAuthority, 'routing', new URL(protocol + '//127.0.0.1:' + routingServer.address().port + '/'));
    const [pendingFixture] = await operator.execute("SELECT command_id,binding_digest,session_id,id FROM routing_capacity_reservation WHERE tenant_id=? AND principal_id IN (?,?) AND state='reserved'", [tenant, f.adminPrincipal, f.principal]);
    phase = 'recover retained fixture reservations';
    for (const pending of pendingFixture) {
      const key = { command_id: pending.command_id, binding_digest: pending.binding_digest };
      const proof = await commands.proof(tenant, key);
      assert('binding' in proof);
      const [[record]] = await chatOperator.execute('SELECT object_type_id FROM crm_record WHERE tenant_id=? AND id=?', [tenant, proof.binding.resource.resource_id]);
      assert.equal(record.object_type_id, f.object, 'Only this retained synthetic fixture may be recovered');
      const terminal = await routingProof(tenant, 'command-abort', key);
      await routingClient(tenant, terminal.state === 'aborted' ? 'capacity-release' : 'capacity-confirm', { command: key, session_id: pending.session_id, reservation_id: pending.id });
    }
    const id = randomUUID(), session = randomUUID();
    await chatOperator.execute("INSERT INTO crm_record(id,tenant_id,object_type_id,owner_principal_id,version,owner_revision,custom_values,created_at,updated_at) VALUES (?,?,?,NULL,7,3,'{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [id, tenant, f.object]);
    await chatOperator.execute("INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,status,opened_at) VALUES (?,?,?,?,?,'open',UTC_TIMESTAMP(6))", [tenant, id, randomUUID(), randomUUID(), randomUUID()]);
    await chatOperator.execute("INSERT INTO conversation_acquisition_session(tenant_id,id,conversation_id,sequence,version,status,opening_reason,opened_at,opening_occurred_at,source_classification,policy_version) VALUES (?,?,?,1,1,'active','first_inbound',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'unknown','inbox_v2')", [tenant, session, id]);
    await chatOperator.execute('INSERT INTO chat_control_head(tenant_id,conversation_id,registry_revision,control_revision,cancel_through,pause_through,version,created_at,updated_at) VALUES (?,?,1,1,0,0,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))', [tenant, id]);
    await chatOperator.execute('INSERT INTO conversation_activity_counter(tenant_id,conversation_id,last_seq,backfilled) VALUES (?,?,0,1)', [tenant, id]);
    let lost = true;
    const peers = {
      reserve: (t, command, sessionId) => routingClient(t, 'capacity-reserve', { command, session_id: sessionId, reservation_id: null }),
      admit: (t, command) => identityClient(t, 'admit', { owner: 'chat', command }),
      confirm: async (t, command, reservation) => {
        const current = await commands.proof(t, command);
        await routingClient(t, 'capacity-confirm', { command, session_id: current.binding.session_id, reservation_id: reservation });
        if (lost) { lost = false; throw new Error('SYNTHETIC_LOST_CONFIRMATION_ACK'); }
      },
      settle: (t, command, admission) => identityClient(t, 'settle', { owner: 'chat', command, admission_id: admission }),
    };
    const candidate = new ChatOwnership(commands, peers);
    phase = 'recover retained fixture close';
    const kindForClose = async (t, principal) => (await identityClient(t, 'principal-kind-read', { principal_id: principal })).kind;
    // Recover retained synthetic work from interrupted close tests via the real command path.
    // Do not free allocations or reset ledgers directly.
    const [interrupted] = await chatOperator.execute(`SELECT r.id,r.version FROM crm_record r JOIN conversation c ON c.tenant_id=r.tenant_id AND c.record_id=r.id
      WHERE r.tenant_id=? AND r.object_type_id=? AND r.owner_principal_id IN (?,?) AND c.status<>'closed'
        AND EXISTS (SELECT 1 FROM conversation_acquisition_session s WHERE s.tenant_id=r.tenant_id AND s.conversation_id=r.id AND s.status='active')
        AND EXISTS (SELECT 1 FROM chat_owner_command cmd WHERE cmd.tenant_id=r.tenant_id AND cmd.resource_id=r.id AND cmd.operation IN ('routing-assignment','routing-takeover'))`, [tenant, f.object, f.adminPrincipal, f.principal]);
    for (const previous of interrupted) {
      const recovery = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: 'conversation-post-conversations-id-transition', actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId }, command_id: randomUUID(), payload: { id: previous.id, body: { target_status: 'closed', reason: 'Recover interrupted synthetic close test' }, expected_version: String(previous.version), idempotency_key: randomUUID() } };
      const preparedRecovery = await candidate.prepareClose(recovery, kindForClose), recoveryKey = { command_id: recovery.command_id, binding_digest: preparedRecovery.binding_digest };
      await candidate.execute(tenant, recoveryKey); await candidate.execute(tenant, recoveryKey);
    }
    lost = true;
    phase = 'composed assignment and current receipt';
    const candidateServer = createWorkloadServer(chatMaterial, chatAuthority, chatOwnershipRoutes(candidate, async (t, principal, team) => (await identityClient(t, 'target-read', { principal_id: principal, team_id: team })).target)); servers.push(candidateServer);
    candidateServer.listen(0, '127.0.0.1'); await once(candidateServer, 'listening');
    const bffTransport = ownerCommandClient(bffMaterial, remoteRegistryAuthority(bffMaterial, registryConfig), 'chat', new URL(protocol + '//127.0.0.1:' + candidateServer.address().port + '/'));
    const bff = request => retryCommand(bffTransport, request);
    const input = { schema_version: 1, request_id: randomUUID(), correlation_id: randomUUID(), tenant_id: tenant, operation: 'routing-assignment', actor: { kind: 'human', principal_id: f.principal, delegation_id: enrollment.delegationId }, command_id: randomUUID(), payload: { id, body: { owner_principal_id: f.principal, reason: 'manual' }, expected_version: '7', idempotency_key: randomUUID() } };
    const prepared = await candidate.prepare(input, { principal_id: f.principal, kind: 'human', team_id: null });
    const command = { command_id: prepared.binding.command_id, binding_digest: prepared.binding_digest };
    assert.equal((await candidate.execute(tenant, command)).reconciliation, 'pending');
    assert.equal((await new ChatOwnership(commands, peers).execute(tenant, command)).reconciliation, 'complete');
    const [[record]] = await chatOperator.execute('SELECT owner_principal_id,version,owner_revision FROM crm_record WHERE tenant_id=? AND id=?', [tenant, id]);
    assert.equal(record.owner_principal_id, f.principal); assert.equal(String(record.version), '8'); assert.equal(String(record.owner_revision), '4');
    const [[head]] = await operator.execute('SELECT principal_id,owner_revision FROM routing_allocation_head WHERE tenant_id=? AND session_id=?', [tenant, session]);
    assert.equal(head.principal_id, f.principal); assert.equal(String(head.owner_revision), '4');
    const [[history]] = await chatOperator.execute('SELECT COUNT(*) n FROM ownership_history WHERE tenant_id=? AND record_id=?', [tenant, id]); assert.equal(Number(history.n), 1);
    const freshSession = await login(f.account), freshEnrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(freshSession));
    const freshActor = { ...input.actor, delegation_id: freshEnrollment.delegationId };
    assert.equal((await candidate.prepare({ ...input, actor: freshActor }, { principal_id: f.principal, kind: 'human', team_id: null })).state, 'committed');
    const replay = await candidate.readReceipt(tenant, command, freshActor); assert.equal(replay.version, '8'); assert.equal(replay.owner_revision, '4');
    assert.deepEqual((await bff({ ...input, actor: freshActor })).data, replay);
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', ['[]', tenant, f.role], [JSON.stringify(grants), tenant, f.role], () => denies(candidate.readReceipt(tenant, command, freshActor), 'FORBIDDEN'));
    await temporary('UPDATE field_policy SET property_key=?,denied_actions=? WHERE tenant_id=? AND id=?', ['owner_principal_id', '["read"]', tenant, f.policy], ['text', '[]', tenant, f.policy], () => denies(candidate.readReceipt(tenant, command, freshActor), 'FORBIDDEN'));
    const next = { ...input, command_id: randomUUID(), payload: { ...input.payload, body: { owner_principal_id: null, reason: 'manual' }, expected_version: '8', idempotency_key: randomUUID() } };
    const pending = await candidate.prepare(next, { principal_id: null, kind: null, team_id: null }), key = { command_id: pending.binding.command_id, binding_digest: pending.binding_digest };
    await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', ['[]', tenant, f.role], [JSON.stringify(grants), tenant, f.role], () => denies(candidate.execute(tenant, key), 'FORBIDDEN'));
    assert.equal((await commands.proof(tenant, key)).state, 'prepared');
    const viaBff = await bff(next); assert.equal(viaBff.data.owner_principal_id, null); assert.equal(viaBff.data.version, '9');
    await denies(identityClient(other, 'target-read', { principal_id: f.principal, team_id: null }), 'NOT_FOUND');
    const assignedViaBff = await bff({ ...input, command_id: randomUUID(), payload: { ...input.payload, expected_version: '9', idempotency_key: randomUUID() } });
    assert.equal(assignedViaBff.data.owner_principal_id, f.principal); assert.equal(assignedViaBff.data.version, '10');
    const unassignedViaBff = await bff({ ...next, command_id: randomUUID(), payload: { ...next.payload, expected_version: '10', idempotency_key: randomUUID() } });
    assert.equal(unassignedViaBff.data.owner_principal_id, null); assert.equal(unassignedViaBff.data.version, '11');
    const routingTransport = ownerCommandClient(routingMaterial, routingAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + candidateServer.address().port + '/'));
    const routingCommand = request => retryCommand(routingTransport, request);
    const serviceInput = { ...input, command_id: randomUUID(), actor: { kind: 'service', principal_id: f.routingService, delegation_id: f.routingService }, payload: { ...input.payload, expected_version: '11', idempotency_key: randomUUID() } };
    await denies(bff(serviceInput), 'FORBIDDEN'); await denies(routingCommand({ ...serviceInput, actor: input.actor }), 'FORBIDDEN');
    assert.equal((await routingCommand(serviceInput)).data.version, '12');
    assert.equal((await routingCommand({ ...serviceInput, command_id: randomUUID(), payload: { ...next.payload, expected_version: '12', idempotency_key: randomUUID() } })).data.version, '13');
    const [[load]] = await operator.execute('SELECT COUNT(*) n FROM routing_human_allocation WHERE tenant_id=? AND principal_id=? AND released_at IS NULL', [tenant, f.principal]); assert.equal(Number(load.n), 0);
    // Close uses current actor authority, but preserves even a now-inactive owner's history.
    phase = 'native public assignment retry';
    await operator.execute('INSERT INTO routing_human_profile(tenant_id,principal_id,capacity,enabled) VALUES (?,?,1,1) ON DUPLICATE KEY UPDATE principal_id=principal_id', [tenant, f.adminPrincipal]);
    let publicLost = true; const publicCommands = [];
    const publicAdapter = new ChatOwnershipBff(auth, new HumanDispatchEnrollment(ds), async request => {
      publicCommands.push(request.command_id);
      const response = await bffTransport(request);
      if (publicLost) { publicLost = false; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); }
      return response;
    });
    const publicServer = createChatOwnershipBff(publicAdapter); servers.push(publicServer); publicServer.listen(0, '127.0.0.1'); await once(publicServer, 'listening');
    const publicUrl = 'http://127.0.0.1:' + publicServer.address().port + '/api/v1/records/' + id + '/assignment';
    const publicBody = { owner_principal_id: f.adminPrincipal, reason: 'manual' };
    const publicHeaders = { 'Content-Type': 'application/json', 'X-Tenant-Id': tenant, 'Idempotency-Key': randomUUID(), 'If-Match': '"13"', Origin: authConfig.origin, 'X-CSRF-Token': await auth.csrf(freshSession), Cookie: 'crm_session=' + freshSession };
    const publicCall = async (headers = publicHeaders, body = publicBody, url = publicUrl) => {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      return { status: response.status, etag: response.headers.get('etag'), body: await response.json() };
    };
    assert.equal((await publicCall({ ...publicHeaders, Origin: 'http://invalid.example' })).status, 403);
    assert.equal((await publicCall({ ...publicHeaders, 'X-CSRF-Token': 'invalid' })).status, 403); assert.equal(publicCommands.length, 0);
    unavailable = true; try { const pending = await publicCall(); assert.equal(pending.status, 503, pending.body.error?.code); } finally { unavailable = false; }
    const lostReply = await publicCall(); assert.equal(lostReply.status, 503, lostReply.body.error?.code); // Committed effect, lost boundary ACK.
    const publicReply = await publicCall(); assert.equal(publicReply.status, 200); assert.equal(publicReply.etag, '"14"');
    let owned = publicReply.body; assert.equal(owned.data.owner_principal_id, f.adminPrincipal); assert.equal(new Set(publicCommands).size, 1);
    assert.equal((await publicCall(publicHeaders, { ...publicBody, owner_principal_id: null })).status, 409);
    const [[publicEffects]] = await chatOperator.execute('SELECT COUNT(*) n FROM ownership_history WHERE tenant_id=? AND record_id=? AND owner_revision=?', [tenant, id, owned.data.owner_revision]); assert.equal(Number(publicEffects.n), 1);
    const takeoverHeaders = { ...publicHeaders, 'If-Match': '"14"', 'Idempotency-Key': randomUUID() };
    const takeoverReply = await publicCall(takeoverHeaders, { reason: 'human_takeover' }, publicUrl.replace('/records/', '/conversations/').replace('/assignment', '/takeover'));
    assert.equal(takeoverReply.status, 200, takeoverReply.body.error?.code); assert.equal(takeoverReply.body.data.version, '15'); assert.equal(takeoverReply.body.data.owner_principal_id, f.principal);
    const concurrentHeaders = { ...publicHeaders, 'If-Match': '"15"', 'Idempotency-Key': randomUUID() };
    const concurrent = await Promise.all([publicCall(concurrentHeaders), publicCall(concurrentHeaders)]);
    assert(concurrent.every(r => [200, 503].includes(r.status)), concurrent.map(r => r.body.error?.code).join(','));
    const reassigned = await publicCall(concurrentHeaders); assert.equal(reassigned.status, 200, reassigned.body.error?.code); owned = reassigned.body;
    const revokedHeaders = { ...publicHeaders, 'If-Match': '"16"', 'Idempotency-Key': randomUUID() };
    unavailable = true; try { assert.equal((await publicCall(revokedHeaders, { owner_principal_id: null, reason: 'manual' })).status, 503); } finally { unavailable = false; }
    const revokedCommandId = publicCommands.at(-1);
    await auth.logout(freshSession, authConfig.origin, publicHeaders['X-CSRF-Token']);
    const replacementSession = await login(f.account), replacementHeaders = { ...revokedHeaders, Cookie: 'crm_session=' + replacementSession, 'X-CSRF-Token': await auth.csrf(replacementSession) };
    const revokedRetry = await publicCall(replacementHeaders, { owner_principal_id: null, reason: 'manual' }); assert.equal(revokedRetry.status, 403); assert.equal(publicCommands.at(-1), revokedCommandId);
    const revokedProof = await commands.existing(tenant, revokedCommandId), revokedKey = { command_id: revokedCommandId, binding_digest: revokedProof.binding_digest };
    await routingProof(tenant, 'command-abort', revokedKey);
    await routingClient(tenant, 'capacity-release', { command: revokedKey, session_id: session, reservation_id: null });
    await chatOperator.execute('INSERT INTO session_process_head(tenant_id,version,created_at,updated_at) VALUES (?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant]);
    await chatOperator.execute("INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,revision,last_cause,updated_at) VALUES (?,?,TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),1,'manual',UTC_TIMESTAMP(6))", [tenant, id]);
    await chatOperator.execute("INSERT INTO conversation_workspace(tenant_id,conversation_id,last_message_at,waiting_since,waiting_metric_state,snoozed_until,snooze_revision) VALUES (?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'ready',TIMESTAMPADD(HOUR,1,UTC_TIMESTAMP(6)),1)", [tenant, id]);
    const need = randomUUID();
    await chatOperator.execute('INSERT INTO session_process_version(tenant_id,version,definition,created_at) VALUES (?,1,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE version=version', [tenant, JSON.stringify(defaultProcess)]);
    await chatOperator.execute("INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,1,'received','full',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, session]);
    await chatOperator.execute("INSERT INTO session_need(tenant_id,id,session_id,label,created_at,actor_id) VALUES (?,?,?,'Synthetic close assessment',UTC_TIMESTAMP(6),?)", [tenant, need, session, f.principal]);
    await chatOperator.execute("INSERT INTO need_assessment(tenant_id,need_id,conversation_id,session_id,values_json,pinned_json,proposal_json,version,created_at,updated_at) VALUES (?,?,?,?,'{}','{}','{}',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", [tenant, need, id, session]);
    const [[channel]] = await chatOperator.execute('SELECT connection_id FROM conversation WHERE tenant_id=? AND record_id=?', [tenant, id]);
    for (const state of ['queued', 'remote_queued', 'sending', 'unknown']) {
      const intent = randomUUID();
      await chatOperator.execute("INSERT INTO outbound_intent(id,tenant_id,conversation_id,actor_kind,actor_id,owner_revision,text,status,idempotency_key,created_at) VALUES (?,?,?,'human',?,?,'synthetic',?,?,UTC_TIMESTAMP(6))", [intent, tenant, id, f.principal, owned.data.owner_revision, state, intent]);
      await chatOperator.execute("INSERT INTO message(id,tenant_id,conversation_id,connection_id,direction,text,status,occurred_at,received_at,outbound_intent_id) VALUES (?,?,?,?,'outbound','synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)", [randomUUID(), tenant, id, channel.connection_id, state === 'remote_queued' ? 'queued' : state, intent]);
    }
    const closeInput = { ...input, command_id: randomUUID(), operation: 'conversation-post-conversations-id-transition', payload: { id, body: { target_status: 'closed', reason: 'Synthetic native close' }, expected_version: '16', idempotency_key: randomUUID() } };
    phase = 'native ownership close';
    const resolveKind = async (t, principal) => (await identityClient(t, 'principal-kind-read', { principal_id: principal })).kind;
    await denies(identityClient(other, 'principal-kind-read', { principal_id: f.adminPrincipal }), 'NOT_FOUND');
    await temporary('UPDATE principal SET status=? WHERE tenant_id=? AND id=?', ['suspended', tenant, f.adminPrincipal], ['active', tenant, f.adminPrincipal], async () => {
      await denies(identityClient(tenant, 'target-read', { principal_id: f.adminPrincipal, team_id: null }), 'REVOKED');
      const preparedClose = await candidate.prepareClose(closeInput, resolveKind), closeKey = { command_id: closeInput.command_id, binding_digest: preparedClose.binding_digest };
      await temporary('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?', [JSON.stringify(grants.filter(g => g.action !== 'update')), tenant, f.role], [JSON.stringify(grants), tenant, f.role], () => denies(candidate.execute(tenant, closeKey), 'FORBIDDEN'));
      lost = true; assert.equal((await candidate.execute(tenant, closeKey)).reconciliation, 'pending');
      assert.equal((await new ChatOwnership(commands, peers).execute(tenant, closeKey)).reconciliation, 'complete');
      assert.equal((await candidate.prepareClose(closeInput, resolveKind)).state, 'committed');
    });
    const [[closed]] = await chatOperator.execute('SELECT r.version,r.owner_revision,r.owner_principal_id,c.status FROM crm_record r JOIN conversation c ON c.tenant_id=r.tenant_id AND c.record_id=r.id WHERE r.tenant_id=? AND r.id=?', [tenant, id]);
    assert.equal(String(closed.version), '17'); assert.equal(String(closed.owner_revision), owned.data.owner_revision); assert.equal(closed.owner_principal_id, f.adminPrincipal); assert.equal(closed.status, 'closed');
    const [[closedHead]] = await operator.execute('SELECT state,owner_revision FROM routing_allocation_head WHERE tenant_id=? AND session_id=?', [tenant, session]); assert.equal(closedHead.state, 'closed'); assert.equal(String(closedHead.owner_revision), owned.data.owner_revision);
    const [states] = await chatOperator.execute('SELECT status FROM outbound_intent WHERE tenant_id=? AND conversation_id=?', [tenant, id]); assert.deepEqual(states.map(x => x.status).sort(), ['cancelled', 'cancelled', 'sending', 'unknown']);
    const [[contribution]] = await chatOperator.execute("SELECT owner_id,owner_revision FROM session_contribution WHERE tenant_id=? AND session_id=? AND kind='closed'", [tenant, session]); assert.equal(contribution.owner_id, f.adminPrincipal); assert.equal(String(contribution.owner_revision), owned.data.owner_revision);
    const [[closedEvent]] = await chatOperator.execute("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='acquisition_session.closed'", [tenant, session]); assert.equal(Number(closedEvent.n), 1);
    const [[control]] = await chatOperator.execute("SELECT payload FROM outbox_event WHERE tenant_id=? AND correlation_id=? AND event_type='chat.registry.changed.v1'", [tenant, closeInput.command_id]);
    const wire = typeof control.payload === 'string' ? JSON.parse(control.payload) : control.payload; assert.equal(wire.snapshot.active_session_id, null); assert.equal(wire.snapshot.status, 'closed'); assert.equal(wire.snapshot.owner_kind, 'human');
    const [[snooze]] = await chatOperator.execute('SELECT until_at,last_cause FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?', [tenant, id]); assert.equal(snooze.until_at, null); assert.equal(snooze.last_cause, 'closed');
    const [[workspace]] = await chatOperator.execute('SELECT waiting_since,waiting_metric_state,snoozed_until,snooze_revision FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?', [tenant, id]); assert.equal(workspace.waiting_since, null); assert.equal(workspace.waiting_metric_state, 'ready'); assert.equal(workspace.snoozed_until, null); assert.equal(String(workspace.snooze_revision), '2');
    const [[assessmentEvent]] = await chatOperator.execute("SELECT schema_version,payload,actor_kind FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='need.assessed'", [tenant, need]); assert.equal(Number(assessmentEvent.schema_version), 2); assert.equal(assessmentEvent.actor_kind, 'system');
    const assessmentPayload = typeof assessmentEvent.payload === 'string' ? JSON.parse(assessmentEvent.payload) : assessmentEvent.payload; assert.equal(assessmentPayload.session_id, session); assert.equal(assessmentPayload.conversation_id, id); assert.equal(assessmentPayload.assessment_version, '1');
    await denies(candidate.prepareClose({ ...closeInput, command_id: randomUUID(), payload: { ...closeInput.payload, expected_version: '17', idempotency_key: randomUUID() } }, resolveKind), 'INVALID_TRANSITION');
  });
  await check('actual IdentityAdmin membership/seat policy waits for owner drain, preserves replay and rolls back last-admin rejection', async () => {
    const adminUow = new UnitOfWork(adminSource);
    const admin = new IdentityAdmin(adminSource, f.key, undefined, new NativeIdentityPolicyDrain(adminUow, t => identity.drainTenant(t)));
    const adminEnrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(await login(f.adminAccount)));
    const anotherActor = b => { b.actor = { kind: 'human', principal_id: f.adminPrincipal, delegation_id: adminEnrollment.delegationId }; };
    const key = await prepare(anotherActor), receipt = await admit(key);
    const [[member]] = await operator.execute('SELECT version,status FROM membership WHERE tenant_id=? AND id=?', [tenant, f.member]);
    const request = [f.adminAccount, tenant, 'memberships', f.member, { status: 'suspended' }, randomUUID(), String(member.version), randomUUID()];
    unavailable = true; try { await denies(admin.mutate(...request), 'DEPENDENCY_UNAVAILABLE'); } finally { unavailable = false; }
    const [[before]] = await operator.execute('SELECT status FROM membership WHERE tenant_id=? AND id=?', [tenant, f.member]); assert.equal(before.status, 'active');
    await denies(admit(await prepare()), 'REVOKED');
    const result = await admin.mutate(...request); assert.equal(result.body.data.status, 'suspended');
    assert.deepEqual(await admin.mutate(...request), result);
    assert.equal((await commands.proof(tenant, key)).state, 'aborted'); assert.equal((await identity.read(tenant, key, receipt.admission_id)).state, 'settled');
    const revokedTarget = await prepare(anotherActor); await denies(admit(revokedTarget), 'FORBIDDEN'); await commands.abort(tenant, revokedTarget);
    await admin.mutate(f.adminAccount, tenant, 'memberships', f.member, { status: 'active' }, randomUUID(), result.body.data.version, randomUUID());
    enrollment = await new HumanDispatchEnrollment(ds).enroll(tenant, hash(actorSession));
    const [[adminMember]] = await operator.execute('SELECT version FROM membership WHERE tenant_id=? AND id=?', [tenant, f.adminMember]);
    const denied = [f.adminAccount, tenant, 'memberships', f.adminMember, { seat_code: 'viewer' }, randomUUID(), String(adminMember.version), randomUUID()];
    await denies(admin.mutate(...denied), 'LAST_ADMIN_REQUIRED'); await denies(admin.mutate(...denied), 'LAST_ADMIN_REQUIRED');
    const [[unchanged]] = await operator.execute('SELECT seat_code,version FROM membership WHERE tenant_id=? AND id=?', [tenant, f.adminMember]); assert.equal(unchanged.seat_code, 'admin'); assert.equal(String(unchanged.version), String(adminMember.version));
    const [[gate]] = await operator.execute('SELECT state FROM identity_owner_gate WHERE tenant_id=?', [tenant]); assert.equal(gate.state, 'open');
    const accepted = await prepare(), admitted = await admit(accepted); await commands.abort(tenant, accepted); await settle(accepted, admitted);
  });
  await check('actual ExternalApps policy/token/revoke drains native admissions and never replays or stores the one-time token', async () => {
    const appUow = new UnitOfWork(adminSource);
    const apps = new ExternalApps(adminSource, async () => [{ key: 'conversation', scope: 'conversations.read', properties: [{ key: 'id' }] }], new NativeIdentityPolicyDrain(appUow, t => identity.drainTenant(t)));
    // A retained app is reused while active; revoked fixture history is retained.
    const [[previous]] = await operator.execute('SELECT status FROM external_app WHERE tenant_id=? AND id=?', [tenant, f.externalApp]);
    if (previous?.status === 'revoked') { f.externalApp = randomUUID(); await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 }); }
    const config = { name: 'Synthetic owner app', description: 'Retained drain fixture', status: 'active', grants: [{ object: 'conversation', scope: 'conversations.read', properties: ['id'], record_scope: 'all', team_ids: [] }] };
    const [[exists]] = await operator.execute('SELECT version FROM external_app WHERE tenant_id=? AND id=?', [tenant, f.externalApp]);
    let version = exists ? String(exists.version) : (await apps.change(f.adminAccount, tenant, 'create', f.externalApp, config, undefined, randomUUID())).data.version;
    const key = await prepare(), receipt = await admit(key);
    unavailable = true;
    try { await denies(apps.change(f.adminAccount, tenant, 'update', f.externalApp, { ...config, status: 'disabled' }, version, randomUUID()), 'DEPENDENCY_UNAVAILABLE'); }
    finally { unavailable = false; }
    const [[before]] = await operator.execute('SELECT version,status FROM external_app WHERE tenant_id=? AND id=?', [tenant, f.externalApp]); assert.equal(String(before.version), version); assert.equal(before.status, 'active');
    const disabled = await apps.change(f.adminAccount, tenant, 'update', f.externalApp, { ...config, status: 'disabled' }, version, randomUUID());
    assert.equal(disabled.data.status, 'disabled');
    await denies(apps.change(f.adminAccount, tenant, 'update', f.externalApp, { ...config, status: 'disabled' }, version, randomUUID()), 'VERSION_CONFLICT');
    assert.equal((await commands.proof(tenant, key)).state, 'aborted'); assert.equal((await identity.read(tenant, key, receipt.admission_id)).state, 'settled');
    version = (await apps.change(f.adminAccount, tenant, 'update', f.externalApp, config, disabled.data.version, randomUUID())).data.version;
    const issued = await apps.change(f.adminAccount, tenant, 'token', f.externalApp, {}, version, randomUUID()); assert.equal(typeof issued.token, 'string');
    const credential = parseAppToken('Bearer ' + issued.token);
    await apps.admit(credential);
    await denies(apps.change(f.adminAccount, tenant, 'token', f.externalApp, {}, version, randomUUID()), 'VERSION_CONFLICT');
    const [barriers] = await operator.execute('SELECT request_json FROM identity_owner_barrier WHERE tenant_id=? AND account_id=?', [tenant, f.adminAccount]);
    assert.equal(barriers.some(row => JSON.stringify(row.request_json).includes(issued.token)), false);
    const pending = await prepare(), admission = await admit(pending);
    const revoked = await apps.change(f.adminAccount, tenant, 'revoke', f.externalApp, {}, issued.data.version, randomUUID()); assert.equal(revoked.data.status, 'revoked');
    assert.equal((await commands.proof(tenant, pending)).state, 'aborted'); assert.equal((await identity.read(tenant, pending, admission.admission_id)).state, 'settled');
    await denies(apps.admit(credential), 'INVALID_TOKEN');
  });
  await check('native Routing workload tenant revocation denies Chat recovery and recovers only after explicit readmission', async () => {
    const key = await prepare(), routingProof = ownerClient(routingMaterial, routingAuthority, 'chat', new URL(protocol + '//127.0.0.1:' + chatServer.address().port + '/'));
    await registryOperator.admit('routing', await registryVersion('routing'), tenant, false);
    try { await assert.rejects(routingProof(tenant, 'command-proof', key)); } finally { await registryOperator.admit('routing', await registryVersion('routing'), tenant, true); }
    assert.equal((await routingProof(tenant, 'command-proof', key)).state, 'prepared'); await commands.abort(tenant, key);
  });
  if (!focus || focus === 'Routing config') await routingConfigNative({ check, operator, routingPool, tenant, other, f, ds, auth, authConfig, authority, identity, adminSession, login, drainingAuth, routingMaterial, identityMaterial, routingAuthority, transport, identityServer, chatServer, protocol, servers, grants, prepare, commands, setRecovery: client => { routingRecoveryClient = client; } });
  await writeFile(out + (focus ? '/identity-focused-' + focus.replaceAll(' ', '-') + (process.argv.includes('--with-reroute') ? '-reroute' : process.argv.includes('--with-view') ? '-view' : process.argv.includes('--with-dispatch') ? '-dispatch' : process.argv.includes('--with-metadata-writer') ? '-metadata-writer' : process.argv.includes('--with-transitions') ? '-transitions' : process.argv.includes('--with-transport') ? '-transport' : process.argv.includes('--with-records') ? '-records' : process.argv.includes('--outcomes-only') ? '-outcomes-only' : process.argv.includes('--with-outcomes') ? '-outcomes' : process.argv.includes('--with-notifications') ? '-notifications' : process.argv.includes('--with-write') ? '-write' : process.argv.includes('--with-status') ? '-status' : process.argv.includes('--with-denials') ? '-denials' : process.argv.includes('--with-referral') ? '-referral' : process.argv.includes('--with-processor') ? '-processor' : '') + '.json' : '/identity.json'), JSON.stringify({ results, transportRetries, focus: focus ?? null, transport: protocol === 'http:' ? 'http-local' : 'tls', definitionDigest, accountDigest, workloadDigest, runtimeImage: process.env.CHAT_TEST_IMAGE ?? null, scope: process.argv.includes('--with-baseline-relay') ? 'T09 native Channels relay accepts and reads the durable Chat receipt through owner HTTP; retained MySQL, current Identity/CRM/Channels proofs and actual Chat processor. No main cutover or complete baseline process composition claim.' : process.argv.includes('--with-runtime') ? 'T08 actual Chat runtime through native owner HTTP and retained MySQL; runtime-labelled cases only certify standalone execution. Synthetic provider where stated; no main cutover or downstream business acceptance.' : process.argv.includes('--with-reroute') ? 'T06 partial: native Routing source and Human public reroute saga, original child/work/queue pins, proof-driven capacity and atomic public receipt, loss/replay/logout. No main mounting or cutover; operational worker wiring remains required.' : process.argv.includes('--with-view') ? 'T06 partial: native Routing source and public admin/mine view composition with Identity root admission and Chat/Channels sources; reroute and main mounting remain pending.' : focus === 'Chat routing facts' ? 'T06 partial: actual Chat submitted-reply facts and aggregate through native Identity/Routing workload HTTP; no public Routing/report mounting or main cutover.' : process.argv.includes('--with-dispatch') ? 'T06 partial: native Routing reconciliation plus full ChatOwnership dispatch saga with durable Routing job and exact child pin, lost ACK and aborted proof. Public work/facts and main worker mounting remain pending.' : focus === 'Chat routing sync' ? 'T06 partial: native service source snapshot and Routing own work reconciliation. Assignment commit boundary is synthetic, actual owner proof/reservation HTTP is native; public work/facts/dispatch and runtime mounting remain pending.' : focus === 'Chat directory' ? 'T06 partial: native Identity and Routing directory capacity with current Human session and final Chat CAS; main mount and remaining consumers pending.' : process.argv.includes('--with-metadata-writer') ? 'T06 partial: CRM public property writer metadata barrier with actual native Chat proof recovery; candidate injection only, main activation and other integrations pending.' : process.argv.includes('--with-transitions') ? 'T05 candidate lifecycle with current native Identity/CRM/Channels and Routing close, public replay and recovery. No main mount or cutover.' : process.argv.includes('--with-transport') ? 'T05 candidate global Channels/Connector connection status barrier; no main rollout.' : process.argv.includes('--with-records') ? 'T05 candidate custom values and generic Conversation record GET/PATCH; no main mount.' : focus === 'Chat need' ? (process.argv.includes('--outcomes-only') ? 'T05 partial: focused durable Human Sales outcome saga; assessment/enrichment composition separately recorded. No main runtime/cutover.' : process.argv.includes('--with-outcomes') ? 'T05 partial: Human need assessment, deferred-enrichment compatibility and durable Sales outcome saga. Provider execution deferred; T06 consumer fences and T07-T09 runtime/cutover remain.' : 'T05 partial: Human need assessment and deferred-enrichment compatibility with Sales outcome reads. Outcome saga requires with-outcomes; no main runtime/cutover.') : focus === 'Chat funnel' ? 'T05 partial: native authorized session funnel with own committed watermark and bounded facts, Identity and active CRM Contact checks; no main routing or Reporting consumer activation.' : focus === 'Chat classification' ? (process.argv.includes('--with-contributions') ? 'T05 partial: native classification plus bounded contribution history with independent CRM Activity and Sales Lead/Deal source ACL, actual owner outages, coverage/history and public native session routes. Operational producers/metadata writer integration and main cutover remain T06-T09.' : 'T05 partial: native session classification read/write with CRM metadata reservation, Identity field rights, Chat CAS and legacy receipts; contribution history requires with-contributions acceptance. Remaining T05/T06 runtime and main cutover pending.') : focus === 'Chat session' ? 'T05 partial: native process and session progress read/write with current Identity and CRM Contact, immutable pins, CAS/evidence/contribution/receipt semantics and public native session/CSRF. Classification, assessment/funnel and remaining T05 scope pending; no main mount.' : focus === 'Chat activity' ? (process.argv.includes('--with-notifications') ? 'T05 partial: Activity feed and native notification inbox/source binding, duplicate/gap/quarantine recovery. Operational relay/replay, generic source producer switch and old consumer removal remain T06; no main mount.' : 'T05 partial: native Activity feed with owning sources; notification acceptance is a separate with-notifications run. No main mount.') : focus === 'Chat notes' ? (process.argv.includes('--with-write') ? 'T05 partial: native CRM note reads and durable creation/reconciliation, original-session contribution, real outage and native logout barrier recovery; scoped candidate CRM receipt/FK schema only. Activity notifications/stream, other T05 operations and main activation pending.' : 'T05 partial: native CRM note list, independent Activity ACL and Chat admission delivery fence. Write verification is a separate with-write scope; main activation pending.') : focus === 'Chat list' ? 'T05 partial: legacy Conversation list and Channel options preserve native viewer rights and signed account cursor with owning HTTP hydration. Main activation and remaining T05 scope pending.' : focus === 'Chat queue' ? 'T05 partial: own queue/sidebar with native Identity, CRM and Channels batch HTTP. Main mounting and remaining T05 operations pending.' : focus === 'Chat detail' ? 'T05 partial: authorized Conversation detail, CRM Contact summary and Channels metadata through real native owner HTTP. Canonical field object IDs are fixture configured; runtime bootstrap validation/main routing and broader queue/activity/session hydration remain pending.' : focus === 'Chat capabilities' ? 'T05 partial: own lineage validation, mounted-handler and backfill readiness gates, native Human session/current Identity and writer checks. No business handler is mounted in this readiness composition; all workspace features correctly remain false.' : focus === 'Chat inbox' ? 'T05 partial: Chat-owned inbox definitions/shares with current native Identity and Channels HTTP, quota, receipt/version/cursor, public session/CSRF and revoke/logout. Queue/content and main cutover remain pending.' : focus === 'Chat catalog' ? 'T05 partial: own tag/snippet catalog CRUD and public native session/CSRF, current Identity decisions, retained receipts/version/uniqueness and cursor checks. Inbox/queue and main cutover pending.' : focus === 'Chat workspace' ? 'T05 partial: native Identity admission, Chat-own read-state/cohort, snooze/deadline, tag links and public session/CSRF adapters. Queue/catalog/notes/session hydration and main cutover remain pending.' : focus === 'Chat outbound' ? 'T05 partial: native public session/CSRF send, Identity admission and Channels HTTP, Chat-owned intent/job/claims/results/coverage, native Identity-Connector HTTP synthetic delivery, lost begin/consume ACK, native logout and crash-boundary unknown-to-late-sent recovery. The crash boundary uses native Connector primitives and synthetic provider evidence; it is not an OS kill. Repository proof callbacks remain separately labeled. Remaining workspace/session/connection-disable/generic hydration and main cutover pending.' : focus === 'Chat ingress' && process.argv.includes('--with-denials') ? 'T05 partial: native organic/referral processor plus durable explicit-owner denial classification, aborted-command cleanup and receipt CAS/audit. Main mounting and other T05 writers remain pending.' : focus === 'Chat ingress' && process.argv.includes('--with-referral') ? 'T05 partial: native organic and referral Message/session processing with Channels staged evidence, terminal proof binding and recovery. Other T05 writers and main mounting remain pending.' : focus === 'Chat ingress' && process.argv.includes('--with-processor') ? 'T05 partial: real organic text/rich Message/session processor with current native Identity, CRM metadata/Contact/mapping and Channels connection reservations, atomic local projections/events and retained recovery. Referral/touchpoint saga, other T05 writers and main mounting remain pending.' : focus === 'Chat ingress' ? 'T05 partial: durable accept/read inbox on Chat forward003 with current native Identity service admission, CRM/Channels reference reservations, dedup/conflict/revoke/recovery. No message/session processor or main mounting.' : focus === 'Chat references' && process.argv.includes('--with-status') ? 'T05 partial: eight native reference groups plus three scoped Channels status/drain groups. Global Connector attempt-disable composition and main mounting remain pending; generic commit proof is not Message evidence.' : focus === 'Chat references' ? 'T05 partial: canonical CRM Contact/mapping and Channels reference reads/reserve/status/release/drains over native HTTP/MySQL, current signed Identity workload registry. Command commit fixture has no ingress message effect. Ingress processing, end-user/service admission and archive/disable writer mounting remain pending.' : focus === 'Chat messaging' ? 'T05 partial: five native public history/intent/acquisition read routes, current Identity and Channels HTTP boundaries. Ingress/send/workspace/session writers and main mounting pending.' : 'T04 Human candidate: native Chat custom/assignment/history/close and public Routing configuration; current Identity account/policy drains; native signed workload registry. Main mounting, generic hydration, consumers and automatic dispatch remain T05/T06/T09; AI capacity deferred' }, null, 2));
} catch (e) {
  await writeFile(out + '/identity-failure-' + Date.now() + '.json', JSON.stringify({ results, phase, code: e.code ?? e.message, stack: e.stack }, null, 2));
  throw new Error(e.code ?? 'IDENTITY_OWNER_TEST_FAILED');
} finally {
  unavailable = false;
  for (const server of servers.reverse()) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (ds.isInitialized) await ds.destroy();
  if (adminSource.isInitialized) await adminSource.destroy();
  if (registrySource.isInitialized) await registrySource.destroy();
  await Promise.all([operator.end(), chatPool.end(), chatOperator.end(), identityPool.end(), routingPool.end()]);
}
