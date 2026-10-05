import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { Conversations,cancelQueued,conversationArchiveGuard } from '../src/modules/conversation/domain.js';
import { OutboundDispatcher } from '../src/modules/conversation/outbound.js';
import { MockSender } from '../src/modules/channels/mock-sender.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains } from '../src/modules/crm/core.js';
import { ConversationController,ConversationRuntime } from '../src/modules/conversation/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
export function conversationCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-014 Conversation text and mock outbound',()=>{
  let ds:DataSource,app:Conversations,records:CrmRecords,dispatcher:OutboundDispatcher;
  const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),otherAccount=randomUUID(),principal=randomUUID(),other=randomUUID(),role=randomUUID(),team=randomUUID(),connection=randomUUID(),identity=randomUUID();
  let contact:string,id:string;
  const grants=[...['read','reply','note','update','assign'].map(action=>({resource:'conversation',action,scope:'all'})),...['create','read','archive'].map(action=>({resource:'contact',action,scope:'all'}))];
  const inbound=(provider=randomUUID(),text='Synthetic inbound')=>app.uow.run({tenantId:tenant},s=>app.receive(s,{identityId:identity,providerMessageId:provider,text,occurredAt:'2026-10-04T01:00:00Z',correlation:'synthetic'}));
  const mutate=(kind:'messages'|'notes'|'transition',body:unknown,key=randomUUID(),version?:string,who=account)=>app.mutate(who,tenant,id,kind,body,key,version,'synthetic');
  const send=(text='Synthetic outbound',key=randomUUID(),rev='2')=>mutate('messages',{text,owner_revision:rev},key);
  const state=async(intent:string)=>((await app.read(account,tenant,id,'intent',{},intent)).data as any).status;
  const own=async(owner:string|null=principal)=>app.uow.run({tenantId:tenant},async s=>{
    // Test harness standing in for SRC-017 assignment; same lock + callback contract.
    await s.query('SELECT id FROM tenant WHERE id=? FOR UPDATE',[tenant]);await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
    await s.query('UPDATE crm_record SET owner_principal_id=?,owner_revision=owner_revision+1 WHERE tenant_id=? AND id=?',[owner,tenant,id]);await cancelQueued(s,id);
  });
  it('v8 to v9 additive migration preserves Contact and immutable journals',async()=>{
    ds=await isolated('conversation_test');await migrate(ds,migrations.slice(0,8));
    for(const t of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
    for(const [a,p] of [[account,principal],[otherAccount,other]]){
      const m=randomUUID();await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://conversation.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a,a]);
      await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,tenant,a]);await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,tenant,m]);
    }
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'conversation_test','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
    for(const p of [principal,other])await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,p,role]);
    await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,tenant]);
    for(const p of [principal,other])await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,p]);
    for(const key of ['contact','activity','conversation'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,key,key]);
    records=new CrmRecords(ds,'synthetic',coreDomains(),undefined,[conversationArchiveGuard]);
    contact=String((await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Synthetic contact'}},randomUUID(),undefined,'synthetic')).body.data.id);
    const before=await ds.query('SELECT * FROM contact'),journal=await ds.query('SELECT * FROM schema_migration ORDER BY version');expect(await migrate(ds)).toBe(migrations.length-8);expect(await ds.query('SELECT * FROM contact')).toEqual(before);expect((await ds.query('SELECT * FROM schema_migration ORDER BY version')).slice(0,8)).toEqual(journal);expect(await migrate(ds)).toBe(0);
    await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id) VALUES (?,?,'mock_messenger','synthetic-page',?)",[connection,tenant,team]);
    await ds.query("INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,'synthetic-subject')",[identity,tenant,connection,contact]);
    app=new Conversations(ds,'conversation-test');dispatcher=new OutboundDispatcher(ds,new MockSender(ds));
  });
  it('concurrent inbound serializes identity; duplicate no-op; payload conflict; atomic rollback',async()=>{
    const results=await Promise.all([inbound(),inbound()]);expect(new Set(results.map(r=>r.conversationId)).size).toBe(1);id=results[0]!.conversationId;
    const key=randomUUID(),first=await inbound(key);expect(await inbound(key)).toEqual({...first,duplicate:true});await expect(inbound(key,'different')).rejects.toThrow('MESSAGE_PAYLOAD_CONFLICT');
    expect(await ds.query('SELECT * FROM conversation')).toHaveLength(1);expect(await ds.query('SELECT * FROM message')).toHaveLength(3);
    const count=(await ds.query('SELECT COUNT(*) n FROM outbox_event'))[0].n;
    await expect(app.uow.run({tenantId:tenant},async s=>{await app.receive(s,{identityId:identity,providerMessageId:randomUUID(),text:'Rollback synthetic',occurredAt:'2026-10-04T01:00:00Z',correlation:'synthetic'});throw new Error('rollback');})).rejects.toThrow('rollback');
    expect((await ds.query('SELECT COUNT(*) n FROM outbox_event'))[0].n).toBe(count);expect(await ds.query('SELECT * FROM message')).toHaveLength(3);
    await expect(records.mutate(account,tenant,{object:'contact',kind:'archive',id:contact},{reason:'Synthetic'},randomUUID(),'1','synthetic')).rejects.toThrow('ACTIVE_DEPENDENCY');
  });
  it('tenant/coherence FK rejects cross references and duplicate active identity',async()=>{
    await expect(app.read(account,beta,id)).rejects.toThrow('FORBIDDEN');
    const member=randomUUID(),actor=randomUUID(),betaRole=randomUUID();
    await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,beta,account]);
    await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[actor,beta,member]);
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'conversation_test','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[betaRole,beta,JSON.stringify(grants)]);await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[beta,actor,betaRole]);
    await expect(app.read(account,beta,id)).rejects.toThrow('NOT_FOUND');expect((await app.read(account,beta)).data).toEqual([]);
    await expect(app.mutate(account,beta,id,'notes',{text:'Synthetic cross tenant'},randomUUID(),undefined,'synthetic')).rejects.toThrow('NOT_FOUND');
    await expect(ds.query("INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,'bad')",[randomUUID(),beta,connection,contact])).rejects.toThrow();
    const r=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]);await ds.query('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[r,tenant,type.id]);
    await expect(ds.query('INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,opened_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,r,contact,identity,connection])).rejects.toThrow();
    await ds.query('DELETE FROM crm_record WHERE id=?',[r]);
  });
  it('owner-only send, stale revision, immutable receipt and concurrent same-key request',async()=>{
    await expect(send()).rejects.toThrow('OWNER_CONFLICT');await own();
    await expect(send('Synthetic',randomUUID(),'1')).rejects.toThrow('OWNER_CONFLICT');
    await expect(mutate('messages',{text:'Synthetic',owner_revision:'2'},randomUUID(),undefined,otherAccount)).rejects.toThrow('OWNER_CONFLICT');
    const key=randomUUID(),result=await send('Synthetic receipt',key);expect(await send('Synthetic receipt',key)).toEqual(result);await expect(send('Changed',key)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    const raceKey=randomUUID(),race=await Promise.all([send('Synthetic race',raceKey),send('Synthetic race',raceKey)]);expect(race[0]).toEqual(race[1]);
    const intent=String(result.body.data.id);await Promise.all([dispatcher.dispatch(tenant,id,intent),dispatcher.dispatch(tenant,id,intent)]);expect(await state(intent)).toBe('sent');expect(await ds.query('SELECT * FROM mock_outbound_receipt WHERE intent_id=?',[intent])).toHaveLength(1);
  });
  it('note allowed to non-owner without activity.create, no outbound side effect',async()=>{
    const before=await ds.query('SELECT id FROM message');const result=await mutate('notes',{text:'Synthetic internal note'},randomUUID(),undefined,otherAccount);
    expect(result.status).toBe(201);expect(await ds.query('SELECT id FROM message')).toEqual(before);expect((await ds.query('SELECT kind,body,related_record_id FROM activity WHERE record_id=?',[result.body.data.id]))[0]).toMatchObject({kind:'note',related_record_id:id,body:'Synthetic internal note'});
  });
  it('SRC-016 notes and action projection enforce live scopes, fields and tenant',async()=>{
    expect((await app.read(account,tenant,id)).data).toMatchObject({owner_kind:'human',allowed_actions:['reply','note','update']});
    expect(((await app.read(otherAccount,tenant,id)).data as any).allowed_actions).not.toContain('reply');
    expect((await app.read(account,tenant,id,'notes')).data).toEqual([]);
    const activityGrant={resource:'activity',action:'read',scope:'all'};
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify([...grants,activityGrant]),role]);
    await mutate('notes',{text:'Synthetic second note'});
    const first:any=await app.read(account,tenant,id,'notes',{limit:'1'}),second:any=await app.read(account,tenant,id,'notes',{limit:'1',cursor:first.next_cursor});
    expect(first.data).toHaveLength(1);expect(first.data[0]).toHaveProperty('body');expect(second.data[0].id).not.toBe(first.data[0].id);
    const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='activity'",[tenant]),policy=randomUUID();
    await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'body',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,type.id]);
    expect(((await app.read(account,tenant,id,'notes')).data as any[])[0]).not.toHaveProperty('body');expect(((await app.read(account,tenant,id)).data as any).allowed_actions).not.toContain('note');
    await expect(app.read(account,beta,id,'notes')).rejects.toThrow('NOT_FOUND');await expect(app.read(account,tenant,id,'notes',{cursor:'invalid'})).rejects.toThrow('INVALID_REQUEST');
    await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
  });
  it('timeline signed cursor stable, rejects tampering/context, field projection and scoped queue',async()=>{
    const first:any=await app.read(account,tenant,id,'messages',{limit:'1'});const second:any=await app.read(account,tenant,id,'messages',{limit:'1',cursor:first.next_cursor});expect(first.data[0].id).not.toBe(second.data[0].id);
    await expect(app.read(otherAccount,tenant,id,'messages',{cursor:first.next_cursor})).rejects.toThrow('INVALID_CURSOR');await expect(app.read(account,tenant,id,'messages',{cursor:first.next_cursor+'x'})).rejects.toThrow('INVALID_CURSOR');
    const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]),policy=randomUUID();await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text',JSON_ARRAY('read','write'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,type.id]);
    expect(((await app.read(account,tenant,id,'messages')).data as any[])[0]).not.toHaveProperty('text');expect(((await app.read(account,tenant,id)).data as any).latest_message).not.toHaveProperty('text');expect(((await app.read(account,tenant,id)).data as any).allowed_actions).not.toContain('reply');await expect(send()).rejects.toThrow('FIELD_FORBIDDEN');await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
    const ownGrants=grants.map(g=>g.resource==='conversation'?{...g,scope:'own'}:g);await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(ownGrants),role]);expect((await app.read(otherAccount,tenant)).data).toEqual([]);await expect(app.read(otherAccount,tenant,id)).rejects.toThrow('NOT_FOUND');await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
  });
  it('transition receipt cannot replay a now-denied Contact summary',async()=>{
    const detail:any=(await app.read(account,tenant,id)).data,key=randomUUID(),body={target_status:'pending',reason:'Synthetic replay'};
    const result=await mutate('transition',body,key,detail.version);expect(result.body.data.contact).not.toBeNull();
    const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]),policy=randomUUID();await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,type.id]);
    await expect(mutate('transition',body,key,detail.version)).rejects.toThrow('FORBIDDEN');await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
    const restricted=grants.filter(g=>g.resource!=='contact'||g.action!=='read');await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(restricted),role]);
    await expect(mutate('transition',body,key,detail.version)).rejects.toThrow('FORBIDDEN');
    expect(((await app.read(account,tenant,id)).data as any).contact).toBeNull();await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);await inbound();
  });
  it('rechecks live seat before dispatch and never delivers revoked queued intent',async()=>{
    const intent=String((await send()).body.data.id);await ds.query("UPDATE membership SET seat_code='viewer' WHERE account_id=?",[account]);await dispatcher.dispatch(tenant,id,intent);expect(await state(intent)).toBe('cancelled');expect(await ds.query('SELECT * FROM mock_outbound_receipt WHERE intent_id=?',[intent])).toHaveLength(0);await ds.query("UPDATE membership SET seat_code='chat' WHERE account_id=?",[account]);
  });
  it('pre-dispatch failed retry reuses intent; unknown only reconcile, never resend',async()=>{
    const failed=String((await send()).body.data.id),failure=new OutboundDispatcher(ds,new MockSender(ds,'pre_dispatch_failure'));await failure.dispatch(tenant,id,failed);expect(await state(failed)).toBe('failed');await dispatcher.retryFailed(tenant,id,failed);await dispatcher.dispatch(tenant,id,failed);expect(await state(failed)).toBe('sent');
    const unknown=String((await send()).body.data.id),timeout=new OutboundDispatcher(ds,new MockSender(ds,'timeout_after_accept'));await timeout.dispatch(tenant,id,unknown);expect(await state(unknown)).toBe('unknown');await expect(dispatcher.retryFailed(tenant,id,unknown)).rejects.toThrow('INVALID_TRANSITION');await dispatcher.dispatch(tenant,id,unknown);expect(await state(unknown)).toBe('unknown');await dispatcher.reconcile(tenant,id,unknown);expect(await state(unknown)).toBe('sent');expect(await ds.query('SELECT * FROM mock_outbound_receipt WHERE intent_id=?',[unknown])).toHaveLength(1);
  });
  it('crash expired sending becomes unknown; late success safe and no blind resend',async()=>{
    const intent=String((await send()).body.data.id);await ds.query("UPDATE outbound_intent SET status='sending',dispatch_token=?,sending_at=TIMESTAMPADD(SECOND,-61,UTC_TIMESTAMP(6)) WHERE id=?",[randomUUID(),intent]);await ds.query("UPDATE message SET status='sending' WHERE outbound_intent_id=?",[intent]);await dispatcher.tick();expect(await state(intent)).toBe('unknown');expect(await ds.query('SELECT * FROM mock_outbound_receipt WHERE intent_id=?',[intent])).toHaveLength(0);
  });
  it('pending inbound opens, close cancels queued; sending can complete after close',async()=>{
    let detail:any=(await app.read(account,tenant,id)).data;await mutate('transition',{target_status:'pending',reason:'Synthetic'},randomUUID(),detail.version);await inbound();detail=(await app.read(account,tenant,id)).data;expect(detail.status).toBe('open');
    const queued=String((await send()).body.data.id),sending=String((await send()).body.data.id);
    let release!:()=>void,started!:()=>void;const entered=new Promise<void>(r=>{started=r;}),gate=new Promise<void>(r=>{release=r;}),mock=new MockSender(ds);
    const slow=new OutboundDispatcher(ds,{send:async input=>{started();await gate;return mock.send(input);},lookup:(t,i)=>mock.lookup(t,i)});const work=slow.dispatch(tenant,id,sending);await entered;
    try{detail=(await app.read(account,tenant,id)).data;await mutate('transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),detail.version);expect(await state(queued)).toBe('cancelled');expect(await state(sending)).toBe('sending');}finally{release();await work;}
    expect(await state(sending)).toBe('sent');await expect(send()).rejects.toThrow('INVALID_TRANSITION');await expect(mutate('transition',{target_status:'open',reason:'Synthetic'},randomUUID(),String(BigInt(detail.version)+1n))).rejects.toThrow('INVALID_TRANSITION');
    const previous=id;id=(await inbound()).conversationId;expect(id).not.toBe(previous);expect(await ds.query("SELECT * FROM conversation WHERE status<>'closed'")).toHaveLength(1);await own();
  });
  it('assignment hook cancels queued, leaves in-flight; stale result cannot undo owner',async()=>{
    const queued=String((await send()).body.data.id),sending=String((await send()).body.data.id);await ds.query("UPDATE outbound_intent SET status='sending',dispatch_token=?,sending_at=UTC_TIMESTAMP(6) WHERE id=?",[randomUUID(),sending]);await ds.query("UPDATE message SET status='sending' WHERE outbound_intent_id=?",[sending]);await own(other);expect(await state(queued)).toBe('cancelled');expect(await state(sending)).toBe('sending');await expect(send()).rejects.toThrow('OWNER_CONFLICT');
  });
  it('HTTP status, ETag, invalid paths/payloads and no public intake endpoint',async()=>{
    class TestModule{}Module({controllers:[ConversationController],providers:[{provide:ConversationRuntime,useValue:{ready:async()=>{},conversations:app}},{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:account}),requireMutation:async()=>({account_id:account})}}}]})(TestModule);
    const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');
    try{const base=await server.getUrl(),headers={'X-Tenant-Id':tenant,'Content-Type':'application/json','Idempotency-Key':randomUUID()};const get=await fetch(`${base}/api/v1/conversations/${id}`,{headers});expect(get.status).toBe(200);expect(get.headers.get('etag')).toBeTruthy();
      const missing=await fetch(`${base}/api/v1/conversations/${id}/transition`,{method:'POST',headers,body:JSON.stringify({target_status:'pending',reason:'Synthetic'})});expect(missing.status).toBe(428);
      const invalid=await fetch(`${base}/api/v1/conversations/${id}/messages`,{method:'POST',headers,body:JSON.stringify({text:' ',owner_revision:'3'})});expect(invalid.status).toBe(422);
      const intent=await fetch(`${base}/api/v1/conversations/${id}/outbound-intents/${randomUUID()}`,{headers});expect(intent.status).toBe(404);
      const note=await fetch(`${base}/api/v1/conversations/${id}/notes`,{method:'POST',headers,body:JSON.stringify({text:'HTTP synthetic note'})});expect(note.status).toBe(201);
      expect((await fetch(`${base}/api/v1/conversations`,{method:'POST',headers,body:'{}'})).status).toBe(404);
    }finally{await server.close();}
  });
  it('audit and events contain no synthetic bodies or raw reason',async()=>{const logs=JSON.stringify(await ds.query('SELECT * FROM audit_entry')),events=JSON.stringify(await ds.query('SELECT payload FROM outbox_event'));for(const text of ['Synthetic inbound','Synthetic outbound','Synthetic internal note','Synthetic close']){expect(logs).not.toContain(text);expect(events).not.toContain(text);}});
});}
