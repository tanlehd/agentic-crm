import 'reflect-metadata';
import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { IdentityAdmin } from '../src/modules/identity/admin.js';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { DurableCommands } from '../src/kernel/reliability/commands.js';
import type { TransactionScope } from '../src/kernel/tenancy/unit-of-work.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IdentityController, IdentityRuntime } from '../src/modules/identity/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { AuthError } from '../src/modules/identity/auth/security.js';
import { identitySchema } from '@agentic-crm/contracts';
import { Ajv } from 'ajv';
const grants=['membership','role','team','agent'].flatMap(resource=>['read','create','update'].map(action=>({resource,action,scope:'all'})));
export function identityAdminCases(create:()=>Promise<DataSource>){
  let source:DataSource;
  async function fixture(){
    if(!source){source=await create();await migrate(source);}
    const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),member=randomUUID(),principal=randomUUID(),role=randomUUID();
    for(const id of [tenant,beta])await source.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    await source.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://admin.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    await source.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,tenant,account]);
    await source.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,tenant,member]);
    await source.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'tenant_admin','Admin',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
    await source.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,principal,role]);
    const admin=new IdentityAdmin(source,'synthetic-cursor-key');
    const command=(route:any,id:string|undefined,body:unknown,version?:string,key=randomUUID(),actor=account)=>admin.mutate(actor,tenant,route,id,body,key,version,randomUUID());
    return {tenant,beta,account,member,principal,role,admin,command};
  }
  async function newAccount(){const id=randomUUID();await source.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://admin.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id,id]);return id;}
  it('admin atomic create, CAS, same-key replay and all-or-nothing audit/outbox/receipt',async()=>{
    const f=await fixture(),account=await newAccount();
    const team=await f.command('teams',undefined,{name:'Intake',purpose:'chat'});
    const key=randomUUID(),body={account_id:account,seat_code:'chat',role_ids:[],team_ids:[team.body.data.id]};
    const first=await f.command('memberships',undefined,body,undefined,key);
    expect(await f.command('memberships',undefined,body,undefined,key)).toEqual(first);
    await expect(f.command('memberships',undefined,{...body,seat_code:'viewer'},undefined,key)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    const id=first.body.data.id as string;
    const patchKey=randomUUID();const patched=await f.command('memberships',id,{seat_code:'viewer'},'1',patchKey);
    expect(patched.body.data).toMatchObject({version:'2',auth_revision:'2'});
    expect(await f.command('memberships',id,{seat_code:'viewer'},'1',patchKey)).toEqual(patched);
    await expect(f.command('memberships',id,{seat_code:'chat'},'1')).rejects.toThrow('VERSION_CONFLICT');
    expect((await source.query('SELECT COUNT(*) n FROM principal WHERE tenant_id=? AND membership_id=?',[f.tenant,id]))[0].n).toBe('1');
    expect((await source.query("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND aggregate_id=?",[f.tenant,first.body.data.principal_id]))[0].n).toBe('2');
    await expect(source.query('UPDATE outbox_event SET schema_version=0 WHERE tenant_id=?',[f.tenant])).rejects.toThrow();
    await expect(source.query('UPDATE outbox_event SET aggregate_version=0 WHERE tenant_id=?',[f.tenant])).rejects.toThrow();
    expect((await source.query("SELECT COUNT(*) n FROM audit_entry WHERE tenant_id=? AND outcome='accepted'",[f.tenant]))[0].n).toBe('3');
    class BrokenOutbox extends DurableCommands {override async accessChanged(_s:TransactionScope,_a:string,_c:string,_p:any):Promise<void>{throw new Error('injected storage failure');}}
    const broken=new IdentityAdmin(source,'synthetic',new BrokenOutbox());const doomed=await newAccount();
    await expect(broken.mutate(f.account,f.tenant,'memberships',undefined,{...body,account_id:doomed},'rollback-key',undefined,randomUUID())).rejects.toThrow('injected');
    expect(await source.query('SELECT id FROM membership WHERE tenant_id=? AND account_id=?',[f.tenant,doomed])).toEqual([]);
    expect(await source.query('SELECT id FROM idempotency_record WHERE tenant_id=? AND `key`=?',[f.tenant,'rollback-key'])).toEqual([]);
  });
  it('last admin guards seat, status, assignments and role definition; two self-demotions race',async()=>{
    const f=await fixture();
    for(const body of [{seat_code:'viewer'},{status:'suspended'},{role_ids:[]}])await expect(f.command('memberships',f.member,body,'1')).rejects.toThrow('LAST_ADMIN_REQUIRED');
    await expect(f.command('roles',f.role,{permissions:[]},'1')).rejects.toThrow('LAST_ADMIN_REQUIRED');
    const secondAccount=await newAccount();
    const second=await f.command('memberships',undefined,{account_id:secondAccount,seat_code:'admin',role_ids:[f.role],team_ids:[]});
    const results=await Promise.allSettled([
      f.command('memberships',f.member,{seat_code:'viewer'},'1'),
      f.command('memberships',second.body.data.id as string,{seat_code:'viewer'},'1',randomUUID(),secondAccount),
    ]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    expect((await source.query("SELECT COUNT(*) n FROM membership WHERE tenant_id=? AND seat_code='admin' AND status='active'",[f.tenant]))[0].n).toBe('1');
    expect((await source.query("SELECT COUNT(*) n FROM audit_entry WHERE tenant_id=? AND outcome='denied'",[f.tenant]))[0].n).toBe('5');
  });
  it('role/team revisions invalidate Human and service access; foreign references rollback; AI policy atomic',async()=>{
    const f=await fixture();const team=await f.command('teams',undefined,{name:'Team',purpose:'chat'});
    const role=await f.command('roles',undefined,{key:'chat_agent',name:'Chat',permissions:[{resource:'conversation',action:'reply',scope:'team'}]});
    const account=await newAccount();const member=await f.command('memberships',undefined,{account_id:account,seat_code:'chat',role_ids:[role.body.data.id],team_ids:[team.body.data.id]});
    const service=randomUUID();await source.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[service,f.tenant,role.body.data.id]);
    await f.command('roles',role.body.data.id as string,{permissions:[]},'1');
    await f.command('teams',team.body.data.id as string,{active:false},'1');
    await expect(f.admin.authorization.runHuman(account,f.tenant,async()=>{}, {tenantId:f.tenant,principalId:member.body.data.principal_id as string,revision:'1'})).rejects.toThrow('STALE_AUTHORIZATION');
    expect((await source.query('SELECT auth_revision FROM service_actor WHERE id=?',[service]))[0].auth_revision).toBe('2');
    expect((await source.query('SELECT auth_revision FROM principal WHERE id=?',[member.body.data.principal_id]))[0].auth_revision).toBe('3');
    const foreign=randomUUID();await source.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Hidden','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[foreign,f.beta]);
    await expect(f.command('memberships',member.body.data.id as string,{team_ids:[foreign]},'1')).rejects.toThrow('NOT_FOUND');
    const policy=randomUUID();await source.query("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'synthetic',JSON_ARRAY(),JSON_ARRAY(),30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,f.tenant]);
    const ai=await f.command('ai-agents',undefined,{name:'Synthetic AI',policy_id:policy,runtime_adapter:'mock',max_concurrency:2,role_ids:[role.body.data.id],team_ids:[]});
    expect(ai.body.data.principal_id).toBeTruthy();
    await f.command('principals',ai.body.data.principal_id as string,{status:'suspended'},'1');
    await expect(f.command('principals',member.body.data.principal_id as string,{status:'suspended'},'3')).rejects.toThrow('INVALID_REQUEST');
    await f.command('ai-agents',ai.body.data.id as string,{max_concurrency:3},'1');
    const aiPrincipal=(await source.query('SELECT status,auth_revision FROM principal WHERE id=?',[ai.body.data.principal_id]))[0];
    expect(aiPrincipal).toMatchObject({status:'suspended',auth_revision:'3'});
  });
  it('signed pagination binds account/tenant/filter and revocation denies receipt replay',async()=>{
    const f=await fixture();const key=randomUUID();
    const first=await f.command('teams',undefined,{name:'One',purpose:'chat'},undefined,key);
    await f.command('teams',undefined,{name:'Two',purpose:'chat'});
    const page=await f.admin.list(f.account,f.tenant,'teams',{limit:1});expect(page.data).toHaveLength(1);expect(page.next_cursor).toBeTypeOf('string');
    const next=await f.admin.list(f.account,f.tenant,'teams',{limit:1,cursor:page.next_cursor});expect(next.data[0]!.id).not.toBe(page.data[0]!.id);
    await expect(f.admin.list(f.account,f.tenant,'roles',{cursor:page.next_cursor})).rejects.toThrow('INVALID_CURSOR');
    await expect(f.admin.list(f.account,f.tenant,'teams',{cursor:page.next_cursor+'x'})).rejects.toThrow('INVALID_CURSOR');
    await expect(f.admin.list(f.account,f.beta,'teams',{})).rejects.toThrow('FORBIDDEN');
    expect((await f.admin.mine(f.account,{})).data).toHaveLength(1);
    const secondAccount=await newAccount();await f.command('memberships',undefined,{account_id:secondAccount,seat_code:'admin',role_ids:[f.role],team_ids:[]});
    await f.command('memberships',f.member,{seat_code:'viewer'},'1');
    await expect(f.command('teams',undefined,{name:'One',purpose:'chat'},undefined,key)).rejects.toThrow('FORBIDDEN');
    expect(first.status).toBe(201);
  });
  it('HTTP routes enforce tenant, validation, CSRF, ETag and schema with real MySQL',async()=>{
    const f=await fixture();
    const session={account_id:f.account};
    const auth={service:{session:async(id:unknown)=>{if(id!=='synthetic')throw new AuthError(401,'AUTH_SESSION_REQUIRED');return session;},requireMutation:async(id:unknown,origin:unknown,csrf:unknown)=>{if(id!=='synthetic')throw new AuthError(401,'AUTH_SESSION_REQUIRED');if(origin!=='http://synthetic.invalid'||csrf!=='synthetic-csrf')throw new AuthError(403,'AUTH_CSRF_INVALID');return session;}}};
    class TestModule{}
    Module({controllers:[IdentityController],providers:[{provide:AuthRuntime,useValue:auth},{provide:IdentityRuntime,useValue:{admin:f.admin,ready:async()=>{}}}]})(TestModule);
    const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
    const origin=await app.getUrl();const headers={Cookie:'crm_session=synthetic','X-Tenant-Id':f.tenant,'Content-Type':'application/json',Origin:'http://synthetic.invalid','X-CSRF-Token':'synthetic-csrf','Idempotency-Key':randomUUID()};
    const request=(path:string,method='GET',body?:unknown,extra:Record<string,string>=headers)=>fetch(origin+'/api/v1/'+path,{method,headers:extra,body:body===undefined?undefined:JSON.stringify(body)});
    const validator=new Ajv({strict:true});validator.addFormat('uuid',/^[0-9a-f-]{36}$/);validator.addSchema(identitySchema,'identity');
    try{
      expect((await request('me/memberships','GET',undefined,{})).status).toBe(401);
      const mine=await request('me/memberships');expect(mine.status).toBe(200);expect(validator.getSchema('identity#/definitions/my-membership-list')!(await mine.json())).toBe(true);
      expect((await request('admin/teams','GET',undefined,{...headers,'X-Tenant-Id':f.beta})).status).toBe(403);
      expect((await request('admin/teams','POST',{name:'Test',purpose:'chat'},{...headers,Origin:'http://evil.invalid'})).status).toBe(403);
      expect((await request('admin/teams','POST',{name:'Test',purpose:'chat',tenant_id:f.beta})).status).toBe(400);
      const created=await request('admin/teams','POST',{name:'Test',purpose:'chat'});expect(created.status).toBe(201);expect(created.headers.get('etag')).toBe('"1"');
      const body=await created.json();expect(validator.getSchema('identity#/definitions/teams-response')!(body)).toBe(true);
      expect((await request(`admin/teams/${body.data.id}`,'PATCH',{active:false})).status).toBe(428);
      const patched=await request(`admin/teams/${body.data.id}`,'PATCH',{active:false},{...headers,'If-Match':'"1"'});expect(patched.status).toBe(200);expect(patched.headers.get('etag')).toBe('"2"');
      const listed=await request('admin/teams?limit=1');expect(listed.headers.get('cache-control')).toBe('no-store');expect(validator.getSchema('identity#/definitions/teams-list')!(await listed.json())).toBe(true);
    }finally{await app.close();}
  });
}
