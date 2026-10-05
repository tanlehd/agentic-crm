import { describe,it,expect } from 'vitest';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { MessengerIntake,type IntakeClaim } from '../src/modules/channels/intake.js';
import { Conversations } from '../src/modules/conversation/domain.js';
import { ChannelsController,ChannelsRuntime } from '../src/modules/channels/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
export function intakeCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-015 durable mock Messenger intake',()=>{
  let ds:DataSource,app:MessengerIntake,conversations:Conversations;
  const tenant=randomUUID(),beta=randomUUID(),connection=randomUUID(),betaConnection=randomUUID(),account=randomUUID(),role=randomUUID(),service=randomUUID(),serviceRole=randomUUID();
  const token=randomBytes(32).toString('hex'),betaToken=randomBytes(32).toString('hex'),bearer=`Bearer ${token}`;
  const payload=(extra:Record<string,unknown>={})=>({provider_event_id:randomUUID(),provider_message_id:randomUUID(),external_subject_id:'synthetic-subject',occurred_at:'2026-10-04T02:00:00Z',display_label:'Synthetic customer',message:{type:'text',text:'Synthetic message content'},...extra});
  const accept=(body=payload())=>app.accept(connection,bearer,body,'synthetic');
  const read=(id:string)=>app.readCredential(connection,bearer,id);
  const snapshot=()=>Promise.all(['contact','contact_identity','conversation','message','touchpoint'].map(table=>ds.query(`SELECT COUNT(*) n FROM ${table}`)));
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
    conversations=new Conversations(ds,'synthetic');app=new MessengerIntake(ds,conversations);
  });
  it('ACK persists only delivery; event replay stable; conflict rejects without payload overwrite',async()=>{
    const body=payload({referral:{source:'ctm',ad_id:'synthetic-ad',campaign_id:'synthetic-campaign'}}),one=await accept(body);expect(one.data.status).toBe('received');expect(await ds.query('SELECT * FROM contact')).toHaveLength(0);expect((await accept(body)).data).toEqual(one.data);
    const before=await ds.query('SELECT payload,payload_hash FROM inbound_delivery WHERE id=?',[one.data.delivery_id]);await expect(accept({...body,message:{type:'text',text:'Changed'}})).rejects.toThrow('IDEMPOTENCY_CONFLICT');expect(await ds.query('SELECT payload,payload_hash FROM inbound_delivery WHERE id=?',[one.data.delivery_id])).toEqual(before);
    const claims=await app.claim();await app.process(claims[0]!);const result=await read(one.data.delivery_id);expect(result).toMatchObject({status:'processed',duplicate:false,attribution:'ctm',attempts:1});expect(result).not.toHaveProperty('payload');expect((await accept(body)).data).toEqual(one.data);
    const [{contact_id,conversation_id}]=await ds.query('SELECT contact_id,conversation_id FROM touchpoint');const records=await ds.query('SELECT owner_principal_id,team_id FROM crm_record WHERE id IN (?,?)',[contact_id,conversation_id]);expect(records).toHaveLength(2);expect(records.every((r:any)=>r.owner_principal_id===null&&r.team_id!==null)).toBe(true);
    const detail:any=(await conversations.read(account,tenant,conversation_id)).data;expect(detail.attribution).toEqual({source:'ctm',ad_id:'synthetic-ad',campaign_id:'synthetic-campaign'});
    const events=await ds.query('SELECT actor_kind,actor_id,event_type FROM outbox_event');expect(events).toHaveLength(3);expect(events.every((r:any)=>r.actor_kind==='service'&&r.actor_id===service)).toBe(true);
  });
  it('different event same message is no-op before identity/contact/referral writes',async()=>{
    const [old]=await ds.query('SELECT payload,message_id,conversation_id FROM inbound_delivery WHERE status=\'processed\'');const original=typeof old.payload==='string'?JSON.parse(old.payload):old.payload,before=await snapshot();
    const duplicate=await accept({...original,provider_event_id:randomUUID(),external_subject_id:'different-subject',display_label:'Different',referral:{source:'ctm',ad_id:'other-ad'}});await processAll();expect(await snapshot()).toEqual(before);expect(await read(duplicate.data.delivery_id)).toMatchObject({status:'processed',duplicate:true,message_id:old.message_id,conversation_id:old.conversation_id,attribution:'ctm'});
  });
  it('concurrent event ACK and same identity workers create one identity/conversation',async()=>{
    const body=payload({external_subject_id:'concurrent-new'}),same=await Promise.all([accept(body),accept(body)]);expect(same[0]!.data).toEqual(same[1]!.data);
    await accept(payload({external_subject_id:'concurrent-new'}));const claims=await app.claim();expect(claims).toHaveLength(2);await Promise.all(claims.map(c=>app.process(c)));
    const rows=await ds.query("SELECT id,contact_id FROM contact_identity WHERE external_subject_id='concurrent-new'");expect(rows).toHaveLength(1);expect(await ds.query('SELECT * FROM conversation WHERE contact_identity_id=?',[rows[0].id])).toHaveLength(1);
    expect(await ds.query('SELECT * FROM message WHERE conversation_id IN (SELECT record_id FROM conversation WHERE contact_identity_id=?)',[rows[0].id])).toHaveLength(2);
  });
  it('missing referral remains usable, opaque nullable IDs, late source timestamp retained',async()=>{
    const noReferral=await accept(payload({external_subject_id:'unknown-source',occurred_at:'2020-01-01T00:00:00Z'}));await processAll();const result=await read(noReferral.data.delivery_id);expect(result.attribution).toBe('unknown');expect(await ds.query('SELECT * FROM touchpoint WHERE delivery_id=?',[result.id])).toHaveLength(0);expect((await conversations.read(account,tenant,result.conversation_id)).data).toMatchObject({attribution:{source:'unknown',ad_id:null,campaign_id:null}});
    const withNull=await accept(payload({external_subject_id:'unknown-source',referral:{source:'ctm',ad_id:null,campaign_id:null}}));await processAll();expect(await read(withNull.data.delivery_id)).toMatchObject({status:'processed',attribution:'ctm'});
    expect((await ds.query('SELECT occurred_at,received_at FROM message WHERE id=?',[result.message_id]))[0].occurred_at.getUTCFullYear()).toBe(2020);
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
  it('late failure rolls back identity/contact/message/touchpoint/events, durable backoff then retry',async()=>{
    const ack=await accept(payload({external_subject_id:'rollback-new',referral:{source:'ctm'}})),c=await claim(ack.data.delivery_id),before=await snapshot(),events=await ds.query('SELECT id FROM outbox_event');
    await ds.query("CREATE TRIGGER intake_fail BEFORE INSERT ON touchpoint FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic failure'");await app.dispatch(c);expect(await snapshot()).toEqual(before);expect(await ds.query('SELECT id FROM outbox_event')).toEqual(events);expect(await read(c.id)).toMatchObject({status:'failed',error_code:'INTAKE_TEMPORARY_FAILURE'});await ds.query('DROP TRIGGER intake_fail');
    await ds.query('UPDATE inbound_delivery SET next_attempt_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[c.id]);await processAll();expect(await read(c.id)).toMatchObject({status:'processed',attempts:2});
  });
  it('post-side-effect lease expiry rolls back all business effects',async()=>{
    const ack=await accept(payload({external_subject_id:'expired-in-transaction'})),c=await claim(ack.data.delivery_id),before=await snapshot();
    const custom=new Conversations(ds,'synthetic'),receive=custom.receive.bind(custom);custom.receive=async(s,input)=>{const result=await receive(s,input);await s.query('UPDATE inbound_delivery SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[c.id]);return result;};
    await expect(new MessengerIntake(ds,custom).process(c)).rejects.toThrow('INTAKE_LEASE_LOST');expect(await snapshot()).toEqual(before);await app.process(c);expect((await read(c.id)).status).toBe('processed');
  });
  it('HTTP bearer-only ACK/status, tenant spoof rejection, human operator auth and retry',async()=>{
    class TestModule{}Module({controllers:[ChannelsController],providers:[{provide:ChannelsRuntime,useValue:{ready:async()=>{},intake:app}},{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:account}),requireMutation:async()=>({account_id:account})}}}]})(TestModule);
    const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');
    try{const base=await server.getUrl(),headers={'Content-Type':'application/json','Authorization':bearer,'X-Connection-Id':connection},body=JSON.stringify(payload());
      const response=await fetch(`${base}/api/v1/integrations/mock-messenger/deliveries`,{method:'POST',headers,body});expect(response.status).toBe(202);const ack=await response.json() as any;
      for(const extra of [{'X-Tenant-Id':beta},{Cookie:'crm_session=synthetic'},{Origin:'http://localhost:8080'}])expect((await fetch(`${base}/api/v1/integrations/mock-messenger/deliveries`,{method:'POST',headers:{...headers,...extra},body})).status).toBe(403);
      const get=await fetch(`${base}/api/v1/integrations/deliveries/${ack.data.delivery_id}`,{headers});expect(get.status).toBe(200);expect(JSON.stringify(await get.json())).not.toContain('Synthetic message content');
      expect((await fetch(`${base}/api/v1/integrations/mock-messenger/deliveries`,{method:'POST',headers:{'Content-Type':'application/json'},body})).status).toBe(401);
      expect((await fetch(`${base}/api/v1/integrations/deliveries/${ack.data.delivery_id}/retry`,{method:'POST',headers,body:'{}'})).status).toBe(403);
      const human=await fetch(`${base}/api/v1/integrations/deliveries/${ack.data.delivery_id}`,{headers:{'X-Tenant-Id':tenant}});expect(human.status).toBe(200);
    }finally{await server.close();}await processAll();
  });
  it('audit/event/status never expose credentials or normalized message content',async()=>{const logs=JSON.stringify([await ds.query('SELECT * FROM audit_entry'),await ds.query('SELECT * FROM outbox_event')]);for(const secret of [token,betaToken,'Synthetic message content','Synthetic customer','synthetic-subject'])expect(logs).not.toContain(secret);});
});}
