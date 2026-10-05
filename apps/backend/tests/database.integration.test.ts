import { runtimeCases } from './runtime-cases.js';
import { routingCases } from './routing-cases.js';
import { intakeCases } from './intake-cases.js';
import { conversationCases } from './conversation-cases.js';
import { crmCoreCases } from './crm-core-cases.js';
import { propertiesCases } from './properties-cases.js';
import { registryCases } from './registry-cases.js';
import { seedCases } from './seed-cases.js';
import { reliabilityCases } from './reliability-cases.js';
import { identityAdminCases } from './identity-admin-cases.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createConnection } from 'mysql2/promise';
import { databaseSource } from '../src/kernel/database/data-source.js';
import { migrate, validateJournal } from '../src/kernel/database/migration-runner.js';
import { checksum, migrations } from '../src/kernel/database/migrations.js';
import { UnitOfWork, type TransactionScope } from '../src/kernel/tenancy/unit-of-work.js';
import { TenantRepository } from '../src/kernel/tenancy/tenant-repository.js';
import { randomUUID } from 'node:crypto';
import { IdentityAuthorization } from '../src/modules/identity/authorization.js';
import { permits } from '../src/modules/identity/domain/authorization.js';
import { DataSource, type DataSourceOptions } from 'typeorm';
const enabled = process.env.APP_ENV === 'test' && process.env.MYSQL_DATABASE === 'kernel_test';
describe.skipIf(!enabled)('SRC-004 real MySQL', () => {
  let source: DataSource;
  const extra: DataSource[] = [];
  const alpha=randomUUID(), beta=randomUUID(), a=randomUUID(), b=randomUUID();
  async function isolated(name: string) {
    await source.query(`CREATE DATABASE ${name}`);
    const ds=new DataSource({...databaseSource(true).options,database:name} as DataSourceOptions); await ds.initialize(); extra.push(ds); return ds;
  }
  beforeAll(async () => {
    const c=await createConnection({host:process.env.MYSQL_HOST,user:'root',password:process.env.MYSQL_MIGRATION_PASSWORD});
    await c.query('CREATE DATABASE kernel_test'); await c.end();
    source=databaseSource(true); await source.initialize();
  });
  afterAll(async () => { for (const ds of extra) await ds.destroy(); if (source?.isInitialized) await source.destroy(); });
  it('cold migration, exact repeat no-op, constraints and readiness', async () => {
    expect(await migrate(source)).toBe(migrations.length); expect(await migrate(source)).toBe(0);
    const rows=await source.query('SELECT * FROM schema_migration ORDER BY version');
    expect(() => validateJournal(rows,migrations,true)).not.toThrow();
    expect(() => validateJournal([],migrations,true)).toThrow();
    expect(() => validateJournal([{...rows[0],checksum:'bad'}],migrations,true)).toThrow();
    expect(() => validateJournal([...rows,{...rows[0],version:999}],migrations,true)).toThrow();
    for (const id of [alpha,beta]) await source.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    await expect(source.query("UPDATE tenant SET status='invalid' WHERE id=?",[alpha])).rejects.toThrow();
    await expect(source.query('UPDATE tenant SET version=0 WHERE id=?',[alpha])).rejects.toThrow();
    const account=[randomUUID(),'https://synthetic.invalid','subject','Synthetic'];
    await source.query('INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',account);
    await expect(source.query('INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[randomUUID(),...account.slice(1)])).rejects.toThrow();
  });
  it('identity same-tenant FK, principal kind, enum and role JSON constraints', async () => {
    const account=randomUUID(), membership=randomUUID(), principal=randomUUID(), role=randomUUID(), team=randomUUID();
    await source.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://identity.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    await source.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[membership,alpha,account]);
    await source.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,alpha,membership]);
    await expect(source.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),beta,membership])).rejects.toThrow();
    await expect(source.query("UPDATE principal SET kind='ai' WHERE id=?",[principal])).rejects.toThrow();
    await expect(source.query("UPDATE membership SET seat_code='root' WHERE id=?",[membership])).rejects.toThrow();
    await source.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'chat_agent','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,alpha,JSON.stringify([{resource:'conversation',action:'reply',scope:'all'}])]);
    await expect(source.query("UPDATE `role` SET permissions=JSON_OBJECT() WHERE id=?",[role])).rejects.toThrow();
    await source.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,alpha]);
    await source.query('INSERT INTO principal_role VALUES (?,?,?)',[alpha,principal,role]);
    await source.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[alpha,team,principal]);
    await expect(source.query('INSERT INTO principal_role VALUES (?,?,?)',[beta,principal,role])).rejects.toThrow();
    await expect(source.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[beta,team,principal])).rejects.toThrow();
    const auth=new IdentityAuthorization(new UnitOfWork(source));
    const stamp={tenantId:alpha,principalId:principal,revision:'1'};
    await auth.runHuman(account,alpha,async (_scope,access)=>{
      expect(access.teamIds).toEqual([team]);
      expect(permits(access,'conversation','reply')).toBe(true);
    },stamp);
    await expect(auth.runHuman(account,beta,async()=>{})).rejects.toThrow('FORBIDDEN');
    // Identity writers use tenant exclusive lock in the same transaction as revisions.
    const revoke=async () => new UnitOfWork(source).run({tenantId:alpha},async scope=>{
      await scope.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[alpha]);
      await scope.query('UPDATE principal SET auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?',[alpha,principal]);
      await scope.query("UPDATE membership SET seat_code='viewer',auth_revision=auth_revision+1 WHERE tenant_id=? AND id=?",[alpha,membership]);
    });
    await revoke();
    await expect(auth.runHuman(account,alpha,async()=>{throw new Error('must not execute');},stamp)).rejects.toThrow('STALE_AUTHORIZATION');
    await auth.runHuman(account,alpha,async (_scope,access)=>expect(permits(access,'conversation','reply')).toBe(false));
    await source.query('UPDATE team SET active=0 WHERE tenant_id=? AND id=?',[alpha,team]);
    await auth.runHuman(account,alpha,async (_scope,access)=>expect(access.teamIds).toEqual([]));
    await source.query("UPDATE membership SET status='suspended' WHERE tenant_id=? AND id=?",[alpha,membership]);
    await expect(auth.runHuman(account,alpha,async()=>{})).rejects.toThrow('FORBIDDEN');
  });
  it('holds authorization lock until transactional work ends and rejects suspended tenant', async () => {
    const account=randomUUID(), member=randomUUID(), principal=randomUUID();
    await source.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://race.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    await source.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,alpha,account]);
    await source.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,alpha,member]);
    const auth=new IdentityAuthorization(new UnitOfWork(source));
    const writer=source.createQueryRunner(); await writer.connect();
    try {
      await writer.query('SET SESSION innodb_lock_wait_timeout=1');
      await auth.runHuman(account,alpha,async()=>{
        await writer.startTransaction();
        await expect(writer.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[alpha])).rejects.toThrow();
        await writer.rollbackTransaction();
      });
      await writer.startTransaction();
      await writer.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[alpha]);
      await writer.query("UPDATE tenant SET status='suspended' WHERE id=?",[alpha]);
      await writer.commitTransaction();
      await expect(auth.runHuman(account,alpha,async()=>{})).rejects.toThrow('FORBIDDEN');
    } finally {
      if (writer.isTransactionActive) await writer.rollbackTransaction();
      await writer.query('SET SESSION innodb_lock_wait_timeout=50'); await writer.release();
      await source.query("UPDATE tenant SET status='active' WHERE id=?",[alpha]);
    }
  });
  it('upgrades v1 to identity v2 without rewriting account/tenant', async () => {
    const ds=await isolated('identity_upgrade_test');
    await migrate(ds,migrations.slice(0,1));
    const tenant=randomUUID();
    await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Preserved','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant]);
    const before=await ds.query('SELECT * FROM tenant');
    expect(await migrate(ds)).toBe(migrations.length-1);
    expect(await ds.query('SELECT * FROM tenant')).toEqual(before);
    expect(await migrate(ds)).toBe(0);
  });
  it('serializes runners with a connection-held advisory lock', async () => {
    const r=source.createQueryRunner(); await r.connect();
    try { await r.query("SELECT GET_LOCK('crm:migrate:kernel_test',0)"); await expect(migrate(source)).rejects.toThrow('lock busy'); }
    finally { await r.query("SELECT RELEASE_LOCK('crm:migrate:kernel_test')"); await r.release(); }
    expect(await migrate(source)).toBe(0);
  });
  it('records partial DDL failure and refuses automatic retry', async () => {
    const ds=await isolated('partial_test');
    const manifest=[{version:1,name:'fault',statements:['CREATE TABLE partial_probe(id INT PRIMARY KEY)','INVALID DDL']}];
    await expect(migrate(ds,manifest)).rejects.toThrow('partial DDL');
    expect((await ds.query('SELECT state,error_code FROM schema_migration'))[0]).toMatchObject({state:'failed',error_code:'DDL_FAILED'});
    expect(await ds.query('SELECT * FROM partial_probe')).toEqual([]);
    await expect(migrate(ds,manifest)).rejects.toThrow('operator inspection');
  });
  it('refuses interrupted started journal and unmanaged pre-existing schema', async () => {
    const ds=await isolated('crash_test'); await migrate(ds);
    await ds.query("UPDATE schema_migration SET state='started',applied_at=NULL");
    await expect(migrate(ds)).rejects.toThrow('operator inspection');
    const unmanaged=await isolated('unmanaged_test'); await unmanaged.query('CREATE TABLE account(id INT)');
    await expect(migrate(unmanaged)).rejects.toThrow('Unjournaled');
  });
  it('supports forward migration without losing existing tenant data', async () => {
    const manifest=[...migrations,{version:999,name:'synthetic_forward',statements:['CREATE TABLE upgrade_probe(id INT PRIMARY KEY)']}];
    expect(await migrate(source,manifest)).toBe(1);
    expect((await source.query('SELECT COUNT(*) AS n FROM tenant'))[0].n).toBe('2');
    expect(await migrate(source,manifest)).toBe(0);
    await expect(migrate(source)).rejects.toThrow('operator inspection');
  });
  it('tenant repository isolation, composite FK, shared transaction rollback, CAS and closed scope', async () => {
    await source.query('CREATE TABLE kernel_parent(id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,name VARCHAR(255) NOT NULL,version BIGINT UNSIGNED NOT NULL DEFAULT 1, UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id) REFERENCES tenant(id)) ENGINE=InnoDB');
    await source.query('CREATE TABLE kernel_child(id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,tenant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,FOREIGN KEY(tenant_id,parent_id) REFERENCES kernel_parent(tenant_id,id)) ENGINE=InnoDB');
    const uow=new UnitOfWork(source);
    const repo=(s:TransactionScope)=>new TenantRepository(s,'kernel_parent',['name']);
    await uow.run({tenantId:alpha},s=>repo(s).insert(a,{name:'Alpha'}));
    await uow.run({tenantId:beta},s=>repo(s).insert(b,{name:'Beta'}));
    await uow.run({tenantId:alpha},async s=>{
      expect(await repo(s).find(b)).toBeUndefined();
      expect(await repo(s).update(b,'1',{name:'Wrong'})).toBe(false);
      expect(await repo(s).delete(b,'1')).toBe(false);
      await expect(repo(s).insert(randomUUID(),{tenant_id:beta,name:'Wrong'})).rejects.toThrow();
      await expect(s.query('INSERT INTO kernel_child VALUES (?,?,?)',[randomUUID(),alpha,b])).rejects.toThrow();
    });
    let saved:TransactionScope|undefined;
    const rollbackId=randomUUID();
    await expect(uow.run({tenantId:alpha},async s=>{
      saved=s; await repo(s).insert(rollbackId,{name:'Rollback'});
      await s.query('INSERT INTO kernel_child VALUES (?,?,?)',[randomUUID(),alpha,rollbackId]);
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    expect(await source.query('SELECT * FROM kernel_child')).toEqual([]);
    await uow.run({tenantId:alpha},async s=>expect(await repo(s).find(rollbackId)).toBeUndefined());
    await expect(saved!.query('SELECT 1')).rejects.toThrow('closed');
    const outcomes=await Promise.all([1,2].map(i=>uow.run({tenantId:alpha},s=>repo(s).update(a,'1',{name:`Changed ${i}`}))));
    expect(outcomes.sort()).toEqual([false,true]);
    await uow.run({tenantId:beta},async s=>expect((await repo(s).find(b))?.name).toBe('Beta'));
    await expect(uow.run({tenantId:''},async()=>{})).rejects.toThrow('context');
  });
  identityAdminCases(()=>isolated('admin_test'));
  reliabilityCases(isolated);
  seedCases(isolated);
  registryCases(isolated);
  propertiesCases(isolated);
  crmCoreCases(isolated);
  conversationCases(isolated);
  routingCases(isolated);
  runtimeCases(isolated);
  intakeCases(isolated);
  it('runtime user can perform DML but cannot execute DDL', async () => {
    const user=process.env.MYSQL_USER!, password=process.env.MYSQL_PASSWORD!;
    await source.query("CREATE USER ?@'%' IDENTIFIED BY ?",[user,password]);
    await source.query("GRANT SELECT,INSERT,UPDATE,DELETE ON kernel_test.* TO ?@'%'",[user]);
    const app=databaseSource(); await app.initialize(); extra.push(app);
    expect((await app.query('SELECT COUNT(*) AS n FROM tenant'))[0].n).toBe('2');
    await expect(app.query('CREATE TABLE forbidden(id INT)')).rejects.toThrow();
    await expect(app.query('ALTER TABLE tenant ADD forbidden INT')).rejects.toThrow();
    await expect(app.query('DROP TABLE upgrade_probe')).rejects.toThrow();
  });
});
