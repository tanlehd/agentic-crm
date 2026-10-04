import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createConnection } from 'mysql2/promise';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { DurableDelivery, DeliveryError, type Consumer } from '../src/kernel/reliability/delivery.js';
import { DurableCommands } from '../src/kernel/reliability/commands.js';
import { UnitOfWork } from '../src/kernel/tenancy/unit-of-work.js';
import { applyRuntimeGrants } from '../src/kernel/database/runtime-grants.js';
import { identityAccessConsumer } from '../src/modules/identity/access-consumer.js';
export function reliabilityCases(isolated: (name:string)=>Promise<DataSource>) {
  it('SRC-008 atomic consumer rollback, duplicate publish recovery and tenant isolation',async()=>{
    const ds=await isolated('reliability_atomic'); await migrate(ds);
    const {tenant,other,event}=await fixture(ds);
    const relay=new DurableDelivery(ds), claim=(await relay.claim())[0]!;
    const consumer:Consumer={name:'test.atomic',type:'principal.access_changed',async handle(scope){
      await scope.query("UPDATE tenant SET name='Committed' WHERE id=?",[scope.context.tenantId]);
      throw new Error('synthetic fault');
    }};
    await expect(relay.consume(claim,consumer)).rejects.toThrow('synthetic fault');
    expect(await ds.query('SELECT * FROM consumer_inbox')).toEqual([]);
    expect((await ds.query('SELECT name FROM tenant WHERE id=?',[tenant]))[0].name).toBe('Synthetic');
    await expect(relay.consume({...claim,tenantId:other},consumer)).rejects.toThrow('LEASE_LOST');
    let executions=0;
    consumer.handle=async scope=>{ executions++; await scope.query('UPDATE tenant SET version=version+1 WHERE id=?',[scope.context.tenantId]); };
    await relay.consume(claim,consumer);
    // Crash after consumer commit, before dispatched; reclaim redelivers same ID.
    await ds.query('UPDATE outbox_event SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[event]);
    const recovered=(await relay.claim())[0]!;
    expect(BigInt(recovered.token)).toBe(BigInt(claim.token)+1n);
    await relay.consume(recovered,consumer); await relay.finish(recovered);
    expect(executions).toBe(1);
    expect((await ds.query('SELECT status FROM outbox_event WHERE id=?',[event]))[0].status).toBe('dispatched');
    expect((await ds.query('SELECT version FROM tenant WHERE id=?',[other]))[0].version).toBe('1');
    await expect(ds.query("INSERT INTO consumer_inbox VALUES (?,'wrong',?,'processing',NULL)",[other,event])).rejects.toThrow();
  });
  it('SRC-008 concurrent claims, stale fencing and expired-in-handler rollback',async()=>{
    const ds=await isolated('reliability_fencing');await migrate(ds);
    const {tenant,event}=await fixture(ds);const relay=new DurableDelivery(ds);
    const batches=await Promise.all([relay.claim(),relay.claim()]);
    expect(batches.flat()).toHaveLength(1);const old=batches.flat()[0]!;
    await ds.query('UPDATE outbox_event SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[event]);
    await expect(relay.finish(old)).rejects.toThrow('LEASE_LOST');
    const fresh=(await relay.claim())[0]!;
    await expect(relay.consume(old,identityAccessConsumer)).rejects.toThrow('LEASE_LOST');
    await expect(relay.finish(old,new Error('fault'))).rejects.toThrow('LEASE_LOST');
    await expect(relay.consume(fresh,{name:'test.expire',type:'principal.access_changed',async handle(scope){
      await scope.query("UPDATE tenant SET name='Must rollback' WHERE id=?",[tenant]);
      await scope.query('UPDATE outbox_event SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND id=?',[tenant,event]);
    }})).rejects.toThrow('LEASE_LOST');
    expect((await ds.query('SELECT name FROM tenant WHERE id=?',[tenant]))[0].name).toBe('Synthetic');
    expect(await ds.query('SELECT * FROM consumer_inbox')).toEqual([]);
    await relay.dispatch(fresh,[identityAccessConsumer]);
    expect((await ds.query('SELECT status FROM outbox_event'))[0].status).toBe('dispatched');
  });
  it('SRC-008 bounded retry delays, terminal validation, unknown type and lossless versions',async()=>{
    const ds=await isolated('reliability_retry');await migrate(ds);
    const {event}=await fixture(ds);const relay=new DurableDelivery(ds);
    await ds.query('UPDATE outbox_event SET aggregate_version=? WHERE id=?',['9007199254740993',event]);
    for(const [index,delay] of [1,5,30,120,600].entries()){
      const claim=(await relay.claim())[0]!;
      await relay.finish(claim,new Error('contains-sensitive-body-never-persisted'));
      const [row]=await ds.query('SELECT status,attempts,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(6),next_attempt_at) delay FROM outbox_event WHERE id=?',[event]);
      expect(row.status).toBe('pending');expect(Number(row.attempts)).toBe(index+1);
      expect(Number(row.delay)).toBeGreaterThanOrEqual(delay-1);expect(Number(row.delay)).toBeLessThanOrEqual(delay);
      expect(await relay.claim()).toEqual([]);
      await ds.query('UPDATE outbox_event SET next_attempt_at=UTC_TIMESTAMP(6) WHERE id=?',[event]);
    }
    await relay.finish((await relay.claim())[0]!,new Error('fault'));
    expect((await ds.query('SELECT status FROM outbox_event'))[0].status).toBe('failed');
    expect(await relay.claim()).toEqual([]);
    // Operator harness resets same event key; production retry API is later scope.
    await ds.query("UPDATE outbox_event SET status='pending',attempts=0 WHERE id=?",[event]);
    const claim=(await relay.claim())[0]!;
    await relay.consume(claim,{name:'test.precision',type:'principal.access_changed',async handle(_scope,envelope){expect(envelope.aggregate_version).toBe('9007199254740993');expect(envelope.data).not.toHaveProperty('body');}});
    await relay.finish(claim,new DeliveryError('FORBIDDEN'));
    expect((await ds.query('SELECT status,attempts FROM outbox_event'))[0]).toMatchObject({status:'failed',attempts:'1'});
    await ds.query("UPDATE outbox_event SET status='pending',event_type='unknown' WHERE id=?",[event]);
    await relay.dispatch((await relay.claim())[0]!,[identityAccessConsumer]);
    expect((await ds.query('SELECT status FROM outbox_event'))[0].status).toBe('failed');
    await ds.query("UPDATE outbox_event SET status='pending',event_type='principal.access_changed',schema_version=2 WHERE id=?",[event]);
    await relay.dispatch((await relay.claim())[0]!,[identityAccessConsumer]);
    expect((await ds.query('SELECT status FROM outbox_event'))[0].status).toBe('failed');
  });
  it('SRC-008 receipt expires at seven days, response authorization and hash conflict',async()=>{
    const ds=await isolated('reliability_receipts');await migrate(ds);
    const {tenant}=await fixture(ds);const uow=new UnitOfWork(ds),commands=new DurableCommands();
    const command={actorId:randomUUID(),correlationId:'synthetic',route:'POST /synthetic',key:'same',body:{b:2,a:1}};
    const response={status:201,body:{data:{tenant_id:tenant,id:randomUUID()},meta:{correlation_id:'synthetic'}}};
    const allow=async()=>{};
    await uow.run({tenantId:tenant},async scope=>{expect(await commands.replay(scope,command,allow)).toBeUndefined();await commands.complete(scope,command,response);});
    await uow.run({tenantId:tenant},async scope=>expect(await commands.replay(scope,{...command,body:{a:1,b:2}},allow)).toEqual(response));
    await expect(uow.run({tenantId:tenant},scope=>commands.replay(scope,command,async()=>{throw new Error('FORBIDDEN');}))).rejects.toThrow('FORBIDDEN');
    await expect(uow.run({tenantId:tenant},scope=>commands.replay(scope,{...command,body:{}},allow))).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    const [ttl]=await ds.query('SELECT TIMESTAMPDIFF(SECOND,updated_at,expires_at) seconds FROM idempotency_record');expect(Number(ttl.seconds)).toBe(7*86400);
    await ds.query('UPDATE idempotency_record SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6))');
    await uow.run({tenantId:tenant},async scope=>{expect(await commands.replay(scope,command,allow)).toBeUndefined();await commands.complete(scope,command,response);});
    await ds.query('UPDATE idempotency_record SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6))');
    await new DurableDelivery(ds).expireReceipts();expect(await ds.query('SELECT * FROM idempotency_record')).toEqual([]);
  });
  it('SRC-008 runtime grants allow audit append but reject update/delete/truncate and journal writes',async()=>{
    const ds=await isolated('reliability_grants');await migrate(ds);const {tenant}=await fixture(ds);
    const root=await createConnection({host:process.env.MYSQL_HOST,user:'root',password:process.env.MYSQL_MIGRATION_PASSWORD});
    const user='reliability_runtime';let app:Awaited<ReturnType<typeof createConnection>>|undefined;
    try {
      await root.query("CREATE USER ?@'%' IDENTIFIED BY ?",[user,process.env.MYSQL_PASSWORD]);
      await root.query("GRANT ALL ON reliability_grants.* TO ?@'%'",[user]);
      await applyRuntimeGrants(root,'reliability_grants',user);await applyRuntimeGrants(root,'reliability_grants',user);
      app=await createConnection({host:process.env.MYSQL_HOST,user,password:process.env.MYSQL_PASSWORD,database:'reliability_grants'});
      await app.query("INSERT INTO audit_entry(id,tenant_id,actor_kind,actor_id,action,resource_type,outcome,changed_fields,correlation_id,occurred_at,created_at) VALUES (?,?,'human',?,'test','tenant','accepted',JSON_ARRAY(),'synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,randomUUID()]);
      expect((await app.query('SELECT * FROM audit_entry'))[0]).toHaveLength(1);
      for(const sql of ['UPDATE audit_entry SET action=\'tampered\'','DELETE FROM audit_entry','TRUNCATE TABLE audit_entry','UPDATE schema_migration SET checksum=\'bad\'','CREATE TABLE forbidden(id INT)']) await expect(app.query(sql)).rejects.toThrow();
      await app.query("UPDATE tenant SET name='Allowed' WHERE id=?",[tenant]);
    } finally {await app?.end();await root.end();}
  });
}
async function fixture(ds:DataSource){
  const tenant=randomUUID(),other=randomUUID(),event=randomUUID();
  for(const id of [tenant,other])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
  await new UnitOfWork(ds).run({tenantId:tenant},scope=>new DurableCommands().accessChanged(scope,randomUUID(),'synthetic',{id:randomUUID(),version:'1',auth_revision:'1'}));
  const [row]=await ds.query('SELECT id FROM outbox_event');
  return {tenant,other,event:row?.id??event};
}
