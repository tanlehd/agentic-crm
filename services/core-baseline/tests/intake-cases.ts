import { ChannelChatIngressRelay } from '../src/modules/channels/chat-ingress-relay.js';
import type { ExchangeIngressBinding } from '@agentic-crm/contracts';
import type { NormalizedInbound } from '../src/modules/channels/normalized.js';
import { contactResolutionCases } from './contact-resolution-cases.js';
import { describe,it,expect } from 'vitest';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { MessengerIntake } from '../src/modules/channels/intake.js';
export function intakeCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-015 durable mock Messenger intake',()=>{
  let ds:DataSource,app:MessengerIntake;
  const tenant=randomUUID(),beta=randomUUID(),connection=randomUUID(),betaConnection=randomUUID(),account=randomUUID(),role=randomUUID(),service=randomUUID(),serviceRole=randomUUID();
  const token=randomBytes(32).toString('hex'),betaToken=randomBytes(32).toString('hex'),bearer=`Bearer ${token}`;
  const payload=(extra:Record<string,unknown>={})=>({provider_event_id:randomUUID(),provider_message_id:randomUUID(),external_subject_id:'synthetic-subject',occurred_at:'2026-10-04T02:00:00Z',display_label:'Synthetic customer',message:{type:'text',text:'Synthetic message content'},...extra});
  const accept=(body=payload())=>app.accept(connection,bearer,body,'synthetic');
  const read=(id:string)=>app.readCredential(connection,bearer,id);
  const snapshot=()=>Promise.all(['contact','contact_identity','conversation','message','touchpoint'].map(table=>ds.query(`SELECT COUNT(*) n FROM ${table}`)));
  // This receiver is deliberately synthetic. Real Chat duplicate/storage/TLS coverage is
  // scripts/identity-owner-native-test.mjs --focus="Chat ingress" --with-processor --with-referral.
  class SyntheticChatRelay extends ChannelChatIngressRelay {
    override async receive(_binding:ExchangeIngressBinding,delivery:string,_intake:NormalizedInbound){return {schema_version:1 as const,request_id:delivery,state:'processed' as const,receipt_id:delivery,conversation_id:randomUUID(),message_id:randomUUID(),duplicate:false};}
  }
  const processAll=async()=>{for(const c of await app.claim())await app.process(c);};
  const claim=async(id:string)=>{const claims=await app.claim();const c=claims.find(c=>c.id===id);if(!c)throw new Error('NO_CLAIM');for(const other of claims.filter(x=>x.id!==id))await app.dispatch(other);return c;};
  it('upgrades v9 without rewriting existing connection and preserves journal',async()=>{
    ds=await isolated('intake_test');await migrate(ds,migrations.slice(0,9));
    await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://intake.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    for(const [t,c] of [[tenant,connection],[beta,betaConnection]]){
      const team=randomUUID(),member=randomUUID(),principal=randomUUID(),r=t===tenant?role:randomUUID(),sr=t===tenant?serviceRole:randomUUID(),sa=t===tenant?service:randomUUID();
      await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
      await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,t]);
      await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,t,account]);await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[principal,t,member]);
      const permissions=[...['read','retry'].map(action=>({resource:'integration',action,scope:'all'})),{resource:'conversation',action:'read',scope:'all'},{resource:'contact',action:'read',scope:'all'}];
      await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'operator','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[r,t,JSON.stringify(permissions)]);await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[t,principal,r]);
      await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'ingress','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[sr,t,JSON.stringify([{resource:'integration',action:'deliver',scope:'all'}])]);await ds.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'ingress',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[sa,t,sr]);
      await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id) VALUES (?,?,'mock_messenger','same-page',?)",[c,t,team]);
      for(const key of ['contact','conversation','activity'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),t,key,key]);
    }
    const before=await ds.query('SELECT id,tenant_id,team_id,status,provider,external_account_id FROM channel_connection ORDER BY id'),journal=await ds.query('SELECT * FROM schema_migration ORDER BY version');expect(await migrate(ds)).toBe(migrations.length-9);expect(await ds.query('SELECT id,tenant_id,team_id,status,provider,external_account_id FROM channel_connection ORDER BY id')).toEqual(before);expect((await ds.query('SELECT * FROM schema_migration ORDER BY version')).slice(0,9)).toEqual(journal);expect(await migrate(ds)).toBe(0);
    for(const [t,c,tok] of [[tenant,connection,token],[beta,betaConnection,betaToken]]){const [sa]=await ds.query("SELECT id FROM service_actor WHERE tenant_id=? AND `key`='ingress'",[t]);await ds.query('UPDATE channel_connection SET service_actor_id=?,credential_hash=? WHERE tenant_id=? AND id=?',[sa.id,createHash('sha256').update(tok!).digest('hex'),t,c]);}
    app=new MessengerIntake(ds,new SyntheticChatRelay());
  });
  it('ACK and changed-payload replay preserve the delivery; Chat effects stay remote',async()=>{
    const body=payload(),one=await accept(body);expect(one.data.status).toBe('received');expect((await accept(body)).data).toEqual(one.data);await expect(accept({...body,message:{type:'text',text:'Changed'}})).rejects.toThrow('IDEMPOTENCY_CONFLICT');await processAll();expect(await read(one.data.delivery_id)).toMatchObject({status:'processed',attempts:1});expect(await ds.query('SELECT record_id FROM conversation')).toHaveLength(0);expect(await ds.query('SELECT id FROM message')).toHaveLength(0);
  });
  it('token/connection namespace isolation, active service/tenant live checks',async()=>{
    await expect(app.accept(betaConnection,bearer,payload(),'synthetic')).rejects.toThrow('INTEGRATION_UNAUTHORIZED');await expect(app.accept(connection,`Bearer ${randomBytes(32).toString('hex')}`,payload(),'synthetic')).rejects.toThrow('INTEGRATION_UNAUTHORIZED');
    const [first]=await ds.query('SELECT id FROM inbound_delivery WHERE tenant_id=? LIMIT 1',[tenant]);await expect(app.readCredential(betaConnection,`Bearer ${betaToken}`,first.id)).rejects.toThrow('NOT_FOUND');await expect(app.readHuman(account,beta,first.id)).rejects.toThrow('NOT_FOUND');
    const b=await app.accept(betaConnection,`Bearer ${betaToken}`,payload(),'synthetic');await processAll();expect((await app.readCredential(betaConnection,`Bearer ${betaToken}`,b.data.delivery_id)).status).toBe('processed');
    await ds.query('UPDATE service_actor SET active=0 WHERE id=?',[service]);await expect(accept()).rejects.toThrow('FORBIDDEN');await ds.query('UPDATE service_actor SET active=1 WHERE id=?',[service]);
    await ds.query("UPDATE tenant SET status='suspended' WHERE id=?",[tenant]);await expect(accept()).rejects.toThrow('FORBIDDEN');await ds.query("UPDATE tenant SET status='active' WHERE id=?",[tenant]);
    await expect(ds.query('UPDATE channel_connection SET service_actor_id=? WHERE id=?',[service,betaConnection])).rejects.toThrow();
  });
  it('revocation after ACK blocks worker; human retry receipt preserves delivery ID',async()=>{
    const ack=await accept(payload({external_subject_id:'revoked-after-ack'})),c=await claim(ack.data.delivery_id),before=await snapshot();await ds.query("UPDATE `role` SET permissions=JSON_ARRAY() WHERE id=?",[serviceRole]);await app.dispatch(c);expect(await read(ack.data.delivery_id).catch(()=>null)).toBeNull();expect(await snapshot()).toEqual(before);
    expect(await app.readHuman(account,tenant,ack.data.delivery_id)).toMatchObject({status:'failed',error_code:'INTAKE_FORBIDDEN'});
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify([{resource:'integration',action:'deliver',scope:'all'}]),serviceRole]);
    await ds.query("UPDATE membership SET seat_code='viewer' WHERE tenant_id=?",[tenant]);await expect(app.retry(account,tenant,ack.data.delivery_id,{},randomUUID(),'synthetic')).rejects.toThrow('FORBIDDEN');await ds.query("UPDATE membership SET seat_code='admin' WHERE tenant_id=?",[tenant]);
    const key=randomUUID(),one=await app.retry(account,tenant,ack.data.delivery_id,{},key,'synthetic');expect(await app.retry(account,tenant,ack.data.delivery_id,{},key,'synthetic')).toEqual(one);await processAll();expect((await read(ack.data.delivery_id)).status).toBe('processed');await expect(app.retry(account,tenant,ack.data.delivery_id,{},randomUUID(),'synthetic')).rejects.toThrow('INVALID_TRANSITION');
  });
  it('expired claims fence stale workers before and after effects; crash restart reclaim',async()=>{
    const ack=await accept(payload({external_subject_id:'lease-recovery'})),old=await claim(ack.data.delivery_id);expect(await app.claim()).toHaveLength(0);await ds.query('UPDATE inbound_delivery SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[old.id]);const fresh=await claim(old.id);expect(BigInt(fresh.token)).toBeGreaterThan(BigInt(old.token));await expect(app.process(old)).rejects.toThrow('INTAKE_LEASE_LOST');await app.process(fresh);expect((await read(old.id)).status).toBe('processed');
  });
  it('audit/event/status never expose credentials or normalized message content',async()=>{const logs=JSON.stringify([await ds.query('SELECT * FROM audit_entry'),await ds.query('SELECT * FROM outbox_event')]);for(const secret of [token,betaToken,'Synthetic message content','Synthetic customer','synthetic-subject'])expect(logs).not.toContain(secret);});
 it('SRC-022 operations list sanitized, reason required, retry same delivery once',async()=>{
  const ack=await accept(),id=ack.data.delivery_id;await ds.query('UPDATE service_actor SET active=0 WHERE id=?',[service]);await app.dispatch(await claim(id));await ds.query('UPDATE service_actor SET active=1 WHERE id=?',[service]);const list=await app.failedDeliveries(account,tenant,{limit:'50'});expect(list.data.some((r:any)=>r.id===id&&r.can_retry)).toBe(true);expect(JSON.stringify(list)).not.toContain('Synthetic message content');expect((await app.failedDeliveries(account,beta,{})).data.some((r:any)=>r.id===id)).toBe(false);expect(()=>app.retry(account,tenant,id,{},randomUUID(),'synthetic',true)).toThrow('INVALID_REQUEST');const key=randomUUID(),one=await app.retry(account,tenant,id,{reason:'operator_retry'},key,'synthetic',true);expect(await app.retry(account,tenant,id,{reason:'operator_retry'},key,'synthetic',true)).toEqual(one);await processAll();expect((await read(id)).status).toBe('processed');expect(await ds.query("SELECT id FROM audit_entry WHERE resource_id=? AND action='intake.retry' AND reason='operator_retry'",[id])).toHaveLength(1);
 });
  contactResolutionCases(()=>({ds,app,tenant,connection,token,beta,betaConnection,betaToken}));
});}
