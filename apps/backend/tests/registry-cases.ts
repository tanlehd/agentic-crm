import 'reflect-metadata';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFile } from 'node:fs/promises';
import { Ajv } from 'ajv';
import { migrations } from '../src/kernel/database/migrations.js';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { CrmPlatform } from '../src/modules/crm/platform.js';
import { RecordRegistry,type SubtypeAdapter } from '../src/modules/crm/registry.js';
import { CrmController,CrmRuntime } from '../src/modules/crm/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { AuthError } from '../src/modules/identity/auth/security.js';
import { withFieldPolicies,allows } from '../src/modules/crm/access.js';
import { fieldAllowed } from '../src/modules/identity/domain/authorization.js';
import { DurableCommands } from '../src/kernel/reliability/commands.js';
import { applyRuntimeGrants } from '../src/kernel/database/runtime-grants.js';
import { createConnection } from 'mysql2/promise';
const grants=['schema','association','contact','company'].flatMap(resource=>['read','create','update','assign'].map(action=>({resource,action,scope:'all'})));
export function registryCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-010 registry',()=>{
  let ds:DataSource,platform:CrmPlatform,registry:RecordRegistry;
  let tenant:string,beta:string,account:string,principal:string,role:string,team:string,ai:string,foreignOwner:string;
  let a:string,b:string,c:string,foreign:string;
  const call=(route:'object-types'|'association-types'|'associations',body:unknown,version?:string,key=randomUUID())=>platform.mutate(account,tenant,route,body,key,version,randomUUID());
  const auth=<T>(work:Parameters<CrmPlatform['authorization']['runHuman']>[2])=>platform.authorization.runHuman(account,tenant,work) as Promise<T>;
  const type=(key:string,cardinality='many_to_many')=>call('association-types',{key,label:key,source_type:'contact',target_type:'contact',cardinality});
  const link=(type_key:string,source_record_id:string,target_record_id:string,version='1',key=randomUUID())=>call('associations',{type_key,source_record_id,target_record_id},version,key);
  it('cold schema, same-tenant FK, reserved key and registry/subtype rollback',async()=>{
    ds=await isolated('registry_test');await migrate(ds);platform=new CrmPlatform(ds,'registry-test-key');
    tenant=randomUUID();beta=randomUUID();account=randomUUID();principal=randomUUID();role=randomUUID();team=randomUUID();ai=randomUUID();foreignOwner=randomUUID();
    for(const id of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://registry.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    for(const [t,p] of [[tenant,principal],[beta,foreignOwner]]){
      const m=randomUUID();await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,t,account]);
      await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,t,m]);
      await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'contact','Contact','standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),t]);
    }
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'registry_tester','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
    await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,principal,role]);
    await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','general',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,tenant]);
    await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,principal]);
    const policy=randomUUID(),agent=randomUUID();
    await ds.query("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'synthetic',JSON_ARRAY(),JSON_ARRAY(),30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant]);
    await ds.query("INSERT INTO ai_agent(id,tenant_id,name,runtime_adapter,policy_id,max_concurrency,created_at,updated_at) VALUES (?,?,'Synthetic','mock',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[agent,tenant,policy]);
    await ds.query("INSERT INTO principal(id,tenant_id,kind,ai_agent_id,status,created_at,updated_at) VALUES (?,?,'ai',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ai,tenant,agent]);
    await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,ai]);
    await ds.query('CREATE TABLE synthetic_subtype(tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,PRIMARY KEY(tenant_id,record_id),FOREIGN KEY(tenant_id,record_id) REFERENCES crm_record(tenant_id,id)) ENGINE=InnoDB');
    const adapter:SubtypeAdapter={insert:async(s,id)=>{await s.query('INSERT INTO synthetic_subtype VALUES (?,?)',[s.context.tenantId,id]);},exists:async(s,id)=>!!(await s.query('SELECT record_id FROM synthetic_subtype WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]))[0],eligible:async()=>{},assigned:async()=>{}};
    registry=new RecordRegistry(new Map([['contact',adapter]]));
    a=(await auth<any>((s,x)=>registry.create(s,x,'contact',{},team,'synthetic'))).id;
    b=(await auth<any>((s,x)=>registry.create(s,x,'contact',{},team,'synthetic'))).id;
    c=(await auth<any>((s,x)=>registry.create(s,x,'contact',{},team,'synthetic'))).id;
    expect(a[14]).toBe('7');
    const bad=new RecordRegistry(new Map([['contact',{...adapter,insert:async()=>{}}]]));
    await expect(auth((s,x)=>bad.create(s,x,'contact',{},team,'synthetic'))).rejects.toThrow('SUBTYPE_REQUIRED');
    expect((await ds.query('SELECT COUNT(*) n FROM crm_record'))[0].n).toBe('3');
    expect((await ds.query('SELECT COUNT(*) n FROM ownership_history'))[0].n).toBe('3');
    await expect(auth((s,x)=>platform.registry.create(s,x,'contact',{},team,'synthetic'))).rejects.toThrow('OBJECT_NOT_IMPLEMENTED');
    await expect(call('object-types',{key:'deal',label:'Bypass'})).rejects.toThrow('RESERVED_OBJECT_TYPE');
    await expect(ds.query('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[foreignOwner,tenant,a])).rejects.toThrow();
    foreign=randomUUID();const [otherType]=await ds.query('SELECT id FROM object_type WHERE tenant_id=?',[beta]);
    await ds.query('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[foreign,beta,otherType.id]);
    await expect(ds.query('INSERT INTO record_team_access VALUES (?,?,?)',[beta,foreign,team])).rejects.toThrow();
    await expect(ds.query('UPDATE crm_record SET object_type_id=? WHERE tenant_id=? AND id=?',[otherType.id,tenant,a])).rejects.toThrow();
  });
  it('upgrades seeded v5 without changing Identity data and repeats as a no-op',async()=>{
    const upgrade=await isolated('registry_upgrade_test');await migrate(upgrade,migrations.slice(0,5));
    const id=randomUUID();await upgrade.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Preserved','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    const before=await upgrade.query('SELECT * FROM tenant');const journal=await upgrade.query('SELECT version,checksum FROM schema_migration ORDER BY version');
    expect(await migrate(upgrade)).toBe(migrations.length-5);expect(await migrate(upgrade)).toBe(0);expect(await upgrade.query('SELECT * FROM tenant')).toEqual(before);expect((await upgrade.query('SELECT version,checksum FROM schema_migration ORDER BY version')).slice(0,5)).toEqual(journal);
  });
  it('metadata receipt, signed pagination and unknown request fields',async()=>{
    const key=randomUUID(),body={key:'appointment',label:'Appointment'};
    const first=await call('object-types',body,undefined,key);expect(await call('object-types',body,undefined,key)).toEqual(first);
    await expect(call('object-types',{...body,label:'Other'},undefined,key)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    await expect(call('object-types',{...body,tenant_id:beta})).rejects.toThrow('INVALID_REQUEST');
    const p=await platform.list(account,tenant,'object-types',{limit:1});expect(p.data).toHaveLength(1);expect(p.next_cursor).toBeTruthy();
    expect((await platform.list(account,tenant,'object-types',{limit:1,cursor:p.next_cursor})).data).toHaveLength(1);
    await expect(platform.list(account,tenant,'association-types',{cursor:p.next_cursor})).rejects.toThrow('INVALID_CURSOR');
    await type('many');await type('one_many','one_to_many');await type('one_one','one_to_one');
  });
  it('association endpoint permissions, cross-tenant FK, CAS and atomic receipt replay',async()=>{
    await expect(link('many',a,foreign)).rejects.toThrow('NOT_FOUND');
    const key=randomUUID();const response=await link('many',a,b,'1',key);expect(response.body.data.source_version).toBe('2');
    expect(await link('many',a,b,'1',key)).toEqual(response);
    await expect(link('many',a,c,'1')).rejects.toThrow('VERSION_CONFLICT');
    await expect(link('many',a,b,'2')).rejects.toThrow('ALREADY_EXISTS');
    expect((await auth<any>(s=>registry.get(s,a))).version).toBe('2');
    const [t]=await ds.query("SELECT id FROM association_type WHERE tenant_id=? AND `key`='many'",[tenant]);
    await expect(ds.query('INSERT INTO association(id,tenant_id,association_type_id,source_record_id,target_record_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[randomUUID(),tenant,t.id,a,foreign])).rejects.toThrow();
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>!(g.resource==='contact'&&g.action==='update'))),role]);
    await expect(link('many',a,c,'2')).rejects.toThrow('FORBIDDEN');
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.map(g=>g.resource==='contact'&&g.action==='read'?{...g,scope:'own'}:g)),role]);
    await ds.query('UPDATE crm_record SET owner_principal_id=NULL WHERE id=?',[b]);
    await expect(link('many',a,b,'1',key)).rejects.toThrow('NOT_FOUND');
    expect((await platform.associations(account,tenant,a,{})).data).toEqual([]);
    await ds.query('UPDATE crm_record SET owner_principal_id=? WHERE id=?',[principal,b]);await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
  });
  it('one-to-many and one-to-one races have one winner; links are visible from both ends',async()=>{
    const results=await Promise.allSettled([link('one_many',a,c,'2'),link('one_many',b,c,'1')]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    const current=await auth<any>(s=>registry.get(s,a));
    const race=await Promise.allSettled([link('one_one',a,b,current.version),link('one_one',a,c,current.version)]);
    expect(race.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const incoming=await platform.associations(account,tenant,b,{limit:1});expect(incoming.data.length).toBe(1);
    const many=await platform.associations(account,tenant,a,{limit:1});expect(many.next_cursor).toBeTruthy();
    expect((await platform.associations(account,tenant,a,{limit:1,cursor:many.next_cursor})).data[0]?.id).not.toBe(many.data[0]?.id);
    await expect(platform.associations(account,tenant,b,{cursor:many.next_cursor})).rejects.toThrow('INVALID_CURSOR');
  });
  it('rejects type mismatch/archive and serializes concurrent same-key association replay',async()=>{
    await call('association-types',{key:'wrong_type',label:'Synthetic',source_type:'contact',target_type:'appointment',cardinality:'many_to_many'});
    const current=await auth<any>(s=>registry.get(s,b));
    await expect(link('wrong_type',b,a,current.version)).rejects.toThrow('ASSOCIATION_TYPE_MISMATCH');
    await ds.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE id=?',[a]);await expect(link('many',b,a,current.version)).rejects.toThrow('INVALID_TRANSITION');await ds.query('UPDATE crm_record SET archived_at=NULL WHERE id=?',[a]);
    const key=randomUUID();const outcomes=await Promise.all([link('many',b,a,current.version,key),link('many',b,a,current.version,key)]);expect(outcomes[0]).toEqual(outcomes[1]);
    const service=randomUUID();await ds.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[service,tenant,role]);
    const record=await auth<any>(s=>registry.get(s,c));await expect(auth((scope,x)=>registry.assign(scope,x,c,record.version,service,team,'synthetic'))).rejects.toThrow();
  });
  it('ownership AI/Human/queue, revision, concurrent CAS and rollback of history/outbox',async()=>{
    let r=await auth<any>(s=>registry.get(s,c));
    const results=await Promise.allSettled([1,2].map(()=>auth((s,x)=>registry.assign(s,x,c,r.version,ai,team,'synthetic'))));
    expect(results.filter(v=>v.status==='fulfilled')).toHaveLength(1);
    r=await auth<any>(s=>registry.get(s,c));expect(r.ownerRevision).toBe('2');expect(r.ownerPrincipalId).toBe(ai);
    await expect(auth((s,x)=>registry.assign(s,x,c,r.version,foreignOwner,team,'synthetic'))).rejects.toThrow();
    await ds.query("UPDATE principal SET status='suspended' WHERE id=?",[ai]);await expect(auth((s,x)=>registry.assign(s,x,c,r.version,ai,team,'synthetic'))).rejects.toThrow();
    await ds.query("UPDATE principal SET status='active' WHERE id=?",[ai]);
    const before=await ds.query('SELECT * FROM ownership_history WHERE tenant_id=?',[tenant]);
    await expect(auth(async(s,x)=>{await registry.assign(s,x,c,r.version,null,team,'synthetic');throw new Error('late failure');})).rejects.toThrow('late failure');
    expect(await ds.query('SELECT * FROM ownership_history WHERE tenant_id=?',[tenant])).toEqual(before);
    expect((await ds.query("SELECT COUNT(*) n FROM outbox_event WHERE tenant_id=? AND event_type='record.assigned'",[tenant]))[0].n).toBe('1');
    const queue=await auth<any>((s,x)=>registry.assign(s,x,c,r.version,null,team,'synthetic'));expect(queue.ownerRevision).toBe('3');expect(queue.ownerPrincipalId).toBeNull();
    await expect(auth((s,x)=>registry.update(s,x,c,queue.version,async()=>{throw new Error('subtype failed');}))).rejects.toThrow('subtype failed');
    expect((await auth<any>(s=>registry.get(s,c))).version).toBe(queue.version);
  });
  it('own/team/shared scope and persisted field denies do not grant actions',async()=>{
    await auth(async(s,x)=>{
      const r=await registry.get(s,c);const own={...x,grants:[{resource:'contact',action:'read',scope:'own' as const}]};expect(allows(own,'contact','read',r)).toBe(false);
      const teamAccess={...x,grants:[{resource:'contact',action:'read',scope:'team' as const}]};expect(allows(teamAccess,'contact','read',r)).toBe(true);
      expect(allows({...teamAccess,teamIds:[]},'contact','read',r)).toBe(false);
      expect(allows(teamAccess,'contact','update',r)).toBe(false);
    });
    await ds.query('UPDATE crm_record SET team_id=NULL WHERE id=?',[c]);
    await ds.query('INSERT INTO record_team_access VALUES (?,?,?)',[tenant,c,team]);
    await auth(async(s,x)=>expect(allows({...x,grants:[{resource:'contact',action:'read',scope:'team'}]},'contact','read',await registry.get(s,c))).toBe(true));
    const [object]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'",[tenant]);
    await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'phone',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,role,object.id]);
    await auth(async(s,x)=>{const access=await withFieldPolicies(s,x);for(const action of ['read','filter','export'] as const)expect(fieldAllowed(access,'contact','phone',action)).toBe(false);});
    await ds.query("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND account_id=?",[tenant,account]);
    await expect(call('object-types',{key:'blocked',label:'Blocked'})).rejects.toThrow('FORBIDDEN');await expect(link('many',a,c)).rejects.toThrow('FORBIDDEN');
    await ds.query("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND account_id=?",[tenant,account]);
  });
  it('late audit failure rolls back metadata and receipt; history has append-only runtime grants',async()=>{
    class Broken extends DurableCommands{override async audit():Promise<void>{throw new Error('audit unavailable');}}
    const broken=new CrmPlatform(ds,'test',new Broken());
    await expect(broken.mutate(account,tenant,'object-types',{key:'rollback',label:'Synthetic'},'rollback',undefined,'synthetic')).rejects.toThrow('audit unavailable');
    expect(await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='rollback'",[tenant])).toEqual([]);expect(await ds.query("SELECT id FROM idempotency_record WHERE tenant_id=? AND `key`='rollback'",[tenant])).toEqual([]);
    const conn=await createConnection({host:process.env.MYSQL_HOST,user:'root',password:process.env.MYSQL_MIGRATION_PASSWORD});
    const user='registry_app';await conn.query("CREATE USER ?@'%' IDENTIFIED BY ?",[user,'synthetic-test-only']);await applyRuntimeGrants(conn,'registry_test',user);await conn.end();
    const runtime=await createConnection({host:process.env.MYSQL_HOST,user,password:'synthetic-test-only',database:'registry_test'});
    try{await runtime.query('SELECT id FROM ownership_history');await expect(runtime.query('UPDATE ownership_history SET reason=reason')).rejects.toThrow();await expect(runtime.query('DELETE FROM ownership_history')).rejects.toThrow();}finally{await runtime.end();}
  });
  it('HTTP schema, session/CSRF/tenant/If-Match and actual MySQL metadata',async()=>{
    const authRuntime={service:{session:async(token:string)=>{if(token!=='synthetic')throw new AuthError(401,'UNAUTHENTICATED');return {account_id:account};},requireMutation:async(token:string,_origin:unknown,csrf:unknown)=>{if(token!=='synthetic')throw new AuthError(401,'UNAUTHENTICATED');if(csrf!=='synthetic')throw new AuthError(403,'FORBIDDEN');return {account_id:account};}}};
    class TestModule{}Module({controllers:[CrmController],providers:[{provide:AuthRuntime,useValue:authRuntime},{provide:CrmRuntime,useValue:{platform,ready:async()=>{}}}]})(TestModule);
    const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
    try{
      const url=await app.getUrl();const headers={'Cookie':'crm_session=synthetic','X-Tenant-Id':tenant,'X-CSRF-Token':'synthetic','Idempotency-Key':randomUUID(),'Content-Type':'application/json'};
      const schema=JSON.parse(await readFile('packages/contracts/schemas/registry.json','utf8'));const ajv=new Ajv({strict:true});ajv.addFormat('uuid',/^[0-9a-f-]{36}$/);ajv.addSchema(schema,'registry');
      const created=await fetch(`${url}/api/v1/object-types`,{method:'POST',headers,body:JSON.stringify({key:'http_custom',label:'Synthetic'})});expect(created.status).toBe(201);expect(ajv.getSchema('registry#/definitions/registry-object-response')!(await created.json())).toBe(true);
      const list=await fetch(`${url}/api/v1/object-types`,{headers});expect(list.status).toBe(200);expect(ajv.getSchema('registry#/definitions/registry-object-list')!(await list.json())).toBe(true);
      expect((await fetch(`${url}/api/v1/object-types`)).status).toBe(401);
      expect((await fetch(`${url}/api/v1/object-types`,{method:'POST',headers:{...headers,'X-CSRF-Token':'wrong'},body:'{}'})).status).toBe(403);
      expect((await fetch(`${url}/api/v1/associations`,{method:'POST',headers,body:JSON.stringify({type_key:'many',source_record_id:a,target_record_id:c})})).status).toBe(428);
      expect((await fetch(`${url}/api/v1/object-types?tenant_id=${beta}`,{headers})).status).toBe(400);
      expect((await fetch(`${url}/api/v1/object-types`,{headers:{...headers,'X-Tenant-Id':randomUUID()}})).status).toBe(403);
    }finally{await app.close();}
  });
});}
