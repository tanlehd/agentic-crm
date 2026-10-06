import { createHash, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { DurableCommands } from '../../kernel/reliability/commands.js';
import { migrations } from '../../kernel/database/migrations.js';
import { validateJournal } from '../../kernel/database/migration-runner.js';

export const seedUsers = ['alpha_admin','beta_admin','chat_anna','sales_binh','sales_chi','read_only'] as const;
export type SeedUser = typeof seedUsers[number];
export interface SeedInput { issuer: string; subjects: Record<SeedUser,string> }
export function fixtureId(alias: string): string {
  // Fixed local fixture namespace; wire values are UUIDs, never aliases.
  if(alias==='alpha:human:sales_binh')return '00900000-0000-5000-a000-000000000001';
  if(alias==='alpha:human:sales_chi')return '00900000-0000-5000-a000-000000000002';
  const h=createHash('sha256').update(`agentic-crm:identity-fixture:v1:${alias}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function seedGuard(env: NodeJS.ProcessEnv): string {
  const url=new URL(env.APP_ORIGIN ?? '');
  if (!['development','test'].includes(env.APP_ENV ?? '') || url.protocol!=='http:' || !['localhost','127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname!=='/' || url.search || url.hash) throw new Error('SEED_LOCAL_ONLY');
  if (env.MYSQL_HOST!=='mysql' || (env.APP_ENV==='development' ? env.MYSQL_DATABASE!=='agentic_crm' : env.MYSQL_DATABASE!=='seed_test')) throw new Error('SEED_DATABASE_DENIED');
  return `${url.origin}/identity/realms/agentic-crm-dev`;
}
const grants=(resource:string, actions:string[], scope='team')=>actions.map(action=>({resource,action,scope}));
const roles={
  tenant_admin: [...['membership','role','team','agent'].flatMap(r=>grants(r,['read','create','update'],'all')),...grants('integration',['read','configure'],'all'),...grants('chat_inbox',['manage','share'],'all'),...grants('conversation_tag',['manage'],'all'),...grants('chat_snippet',['read','manage'],'all')],
  chat_agent: [...grants('chat_inbox',['manage','share'],'own'),...grants('chat_snippet',['read'],'all'),...grants('conversation',['update']),...grants('conversation',['read','reply','note','takeover']),...grants('contact',['read']),...grants('lead',['create','qualify','handoff'])],
  sales_agent: [...grants('lead',['read','accept']),...grants('contact',['read'])],
  supervisor: [...grants('chat_inbox',['manage','share'],'own'),...grants('conversation_tag',['manage'],'all'),...grants('chat_snippet',['read','manage'],'all'),...grants('conversation',['update']),...grants('conversation',['read','reply','note','takeover','assign']),...grants('lead',['read','assign']),...grants('contact',['read'])],
  viewer: ['contact','lead','conversation'].flatMap(r=>grants(r,['read'])),
  intake_ai: [...grants('conversation',['read','reply'],'own'),...grants('contact',['read']),...grants('lead',['create','qualify'],'own')],
  ctm_automation: [...grants('conversation',['route','start_session']),...grants('lead',['create','qualify','handoff']),...grants('contact',['share'])],
};
export async function seedIdentity(source: DataSource, input: SeedInput, env=process.env) {
  const issuer=seedGuard(env);
  if(source.options.type!=='mysql'||source.options.host!==env.MYSQL_HOST||source.options.database!==env.MYSQL_DATABASE)throw new Error('SEED_DATABASE_DENIED');
  if (input.issuer!==issuer || !input.subjects || Object.keys(input.subjects).length!==seedUsers.length || seedUsers.some(u=>typeof input.subjects[u]!=='string'||!input.subjects[u]||input.subjects[u].length>255||!/^[\x21-\x7e]+$/.test(input.subjects[u])) || new Set(Object.values(input.subjects)).size!==seedUsers.length) throw new Error('SEED_INVALID_MAPPING');
  const runner=source.createQueryRunner(); let locked=false;
  const scopes:TransactionScope[]=[];
  try {
    await runner.connect();
    const [lock]=await runner.query("SELECT GET_LOCK('crm:seed:identity:v1',10) AS acquired");
    if (Number(lock.acquired)!==1) throw new Error('SEED_BUSY'); locked=true;
    validateJournal(await runner.query('SELECT * FROM schema_migration ORDER BY version'),migrations,true);
    await runner.startTransaction('READ COMMITTED');
    const accounts={} as Record<SeedUser,string>;
    for (const user of seedUsers) {
      const rows=await runner.query('SELECT id FROM account WHERE issuer=? AND subject=?',[issuer,input.subjects[user]]);
      accounts[user]=rows[0]?.id ?? fixtureId(`account:${user}`);
      if (!rows.length) await runner.query('INSERT INTO account(id,issuer,subject,display_name,email,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[accounts[user],issuer,input.subjects[user],user,`${user}@example.invalid`]);
    }
    let created=0;
    for (const label of ['alpha','beta'] as const) {
      const tenant=fixtureId(`clinic_${label}`), id=(key:string)=>fixtureId(`${label}:${key}`);
      const scope=new TransactionScope({tenantId:tenant},runner);scopes.push(scope);
      const users:SeedUser[]=label==='alpha'?['alpha_admin','chat_anna','sales_binh','sales_chi','read_only']:['beta_admin','read_only'];
      const [existing]=await runner.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]);
      if (existing) {
        // Do not silently repair a partially deleted or re-bound fixture, or restore revoked access.
        const required:Record<string,string[]>={role:Object.keys(roles).map(k=>id(`role:${k}`)),team:['intake','sales'].map(k=>id(`team:${k}`)),membership:users.map(u=>id(`member:${u}`)),principal:[...users.map(u=>id(`human:${u}`)),id('intake_ai')],agent_policy:[id('policy')],ai_agent:[id('ai')],service_actor:[id('ctm_service')]};
        for (const [table,ids] of Object.entries(required)) {
          const rows=await runner.query(`SELECT id FROM \`${table}\` WHERE tenant_id=? AND id IN (${ids.map(()=>'?').join(',')})`,[tenant,...ids]);
          if (rows.length!==ids.length) throw new Error('SEED_INCOMPLETE');
        }
        for (const user of users) {
          const [member]=await runner.query('SELECT account_id FROM membership WHERE tenant_id=? AND id=?',[tenant,id(`member:${user}`)]);
          if(member.account_id!==accounts[user])throw new Error('SEED_MAPPING_CHANGED');
        }
        continue;
      }
      await runner.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,`Clinic ${label==='alpha'?'Alpha':'Beta'}`]);
      for (const [key,permissions] of Object.entries(roles)) await runner.query('INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id(`role:${key}`),tenant,key,key,JSON.stringify(permissions)]);
      for(const [key,name,purpose] of [['intake','Intake','chat'],['sales','Sales','sales']]) await runner.query('INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[id(`team:${key}`),tenant,name,purpose]);
      const principals:string[]=[];
      for(const user of users){
        const admin=user.endsWith('_admin'),sales=user.startsWith('sales_');
        const seat=admin?'admin':sales?'sales':user==='chat_anna'?'chat':'viewer';
        const role=admin?'tenant_admin':sales?'sales_agent':user==='chat_anna'?'chat_agent':'viewer';
        await runner.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id(`member:${user}`),tenant,accounts[user],seat]);
        // Explicit ordered fixture IDs support later deterministic Sales routing.
        const principal=id(`human:${user}`);principals.push(principal);
        await runner.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,tenant,id(`member:${user}`)]);
        await runner.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,principal,id(`role:${role}`)]);
        for(const team of admin||user==='read_only'?['intake','sales']:[sales?'sales':'intake'])await runner.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,id(`team:${team}`),principal]);
      }
      await runner.query("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'intake_mock',JSON_ARRAY(),JSON_ARRAY(),30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id('policy'),tenant]);
      await runner.query("INSERT INTO ai_agent(id,tenant_id,name,runtime_adapter,policy_id,max_concurrency,created_at,updated_at) VALUES (?,?,'Intake AI','mock',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id('ai'),tenant,id('policy')]);
      await runner.query("INSERT INTO principal(id,tenant_id,kind,ai_agent_id,status,created_at,updated_at) VALUES (?,?,'ai',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id('intake_ai'),tenant,id('ai')]);
      await runner.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,id('intake_ai'),id('role:intake_ai')]);
      await runner.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,id('team:intake'),id('intake_ai')]);
      await runner.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'ctm_service',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id('ctm_service'),tenant,id('role:ctm_automation')]);
      await new DurableCommands().bootstrapRecorded(scope,randomUUID(),[...principals,id('intake_ai')]);created++;
    }
    await runner.commitTransaction();return {created,existing:2-created};
  } catch(error){if(runner.isTransactionActive)await runner.rollbackTransaction();throw error;}
  finally{for(const scope of scopes)scope.close();if(locked)await runner.query("SELECT RELEASE_LOCK('crm:seed:identity:v1')");await runner.release();}
}
