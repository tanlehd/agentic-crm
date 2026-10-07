import { workspaceCatalogCases } from './workspace-catalog-cases.js';
import { workspaceActivityCases } from './workspace-activity-cases.js';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { Conversations } from '../src/modules/conversation/domain.js';
import { ChatWorkspace } from '../src/modules/conversation/workspace.js';
import { backfillWorkspace,prepareWorkspace } from '../src/modules/conversation/workspace-storage.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains } from '../src/modules/crm/core.js';
import { OutboundDispatcher } from '../src/modules/conversation/outbound.js';
import { MockSender } from '../src/modules/channels/mock-sender.js';
import { WorkspaceController,WorkspaceRuntime } from '../src/modules/conversation/workspace-http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';

export function workspaceCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-032 workspace read foundation',()=>{
  let ds:DataSource,chat:Conversations,ws:ChatWorkspace,records:CrmRecords,id:string,contact:string,second:string;
  const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),otherAccount=randomUUID(),principal=randomUUID(),other=randomUUID(),role=randomUUID(),team=randomUUID(),connection=randomUUID(),identity=randomUUID();
  const grants=[...['read','reply','note','update','assign'].map(action=>({resource:'conversation',action,scope:'all'})),...['create','read'].map(action=>({resource:'contact',action,scope:'all'}))];
  const receive=(key=randomUUID(),identityId=identity)=>chat.uow.run({tenantId:tenant},s=>chat.receive(s,{identityId,providerMessageId:key,text:'Synthetic workspace inbound',occurredAt:'2026-10-06T01:00:00Z',correlation:'workspace-fixture'}));
  const mark=(seq:string,who=account,key=randomUUID())=>ws.markRead(who,tenant,id,{through_inbound_seq:seq},key,'workspace-fixture');
  it('upgrades schema19 without changing history and initializes immutable read cutoff, resumable backfill',async()=>{
    ds=await isolated('workspace_test');await migrate(ds,migrations.slice(0,19));
    for(const t of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic workspace','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
    for(const [a,p] of [[account,principal],[otherAccount,other]]){const m=randomUUID();await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://workspace.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a,a]);await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,tenant,a]);await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,tenant,m]);}
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'workspace','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
    for(const p of [principal,other])await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,p,role]);
    await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic team','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,tenant]);
    for(const p of [principal,other])await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,p]);
    for(const key of ['contact','activity','conversation'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,key,key]);
    records=new CrmRecords(ds,'workspace',coreDomains());contact=String((await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Đặng Synthetic'}},randomUUID(),undefined,'workspace-fixture')).body.data.id);
    await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id) VALUES (?,?,'mock_messenger','synthetic-workspace-page',?)",[connection,tenant,team]);
    await ds.query("INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,'workspace-one')",[identity,tenant,connection,contact]);
    chat=new Conversations(ds,'workspace');ws=new ChatWorkspace(ds,'workspace');id=(await receive()).conversationId;
    await ds.query('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[principal,tenant,id]);
    await chat.mutate(account,tenant,id,'messages',{text:'Synthetic legacy coverage unknown',owner_revision:'1'},randomUUID(),undefined,'workspace-fixture');
    await ds.query('UPDATE crm_record SET owner_principal_id=NULL WHERE tenant_id=? AND id=?',[tenant,id]);
    const before=await ds.query('SELECT * FROM message'),journal=await ds.query('SELECT * FROM schema_migration');
    expect(await migrate(ds)).toBe(migrations.length-19);expect(await ds.query('SELECT * FROM message')).toEqual(before);expect((await ds.query('SELECT * FROM schema_migration ORDER BY version')).slice(0,19)).toEqual(journal);
    expect((await ws.capabilities(account,tenant)).data.features.queue_v1).toBe(false);await expect(ws.list(account,tenant,{})).rejects.toThrow('WORKSPACE_BACKFILLING');
    await expect(chat.uow.run({tenantId:tenant},async s=>{await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);await prepareWorkspace(s,id);throw new Error('synthetic-backfill-interruption');})).rejects.toThrow('synthetic-backfill-interruption');expect(await ds.query('SELECT * FROM conversation_workspace')).toHaveLength(0);expect(await ds.query('SELECT * FROM message_workspace')).toHaveLength(0);
    expect(await backfillWorkspace(ds)).toBe(1);expect(await backfillWorkspace(ds)).toBe(0);expect(await migrate(ds)).toBe(0);
    expect((await ws.list(account,tenant,{})).meta).toMatchObject({waiting_conversation_count:null,waiting_metric_coverage:'partial'});
    expect((await ws.state(account,tenant,id)).data).toMatchObject({latest_inbound_seq:'1',last_read_inbound_seq:'1',unread_message_count:'0'});
  });
  it('deduplicates inbound, rolls back sequence and keeps per-Human monotonic markers across concurrent tabs',async()=>{
    const key=randomUUID();await receive(key);await receive(key);
    await expect(chat.uow.run({tenantId:tenant},async s=>{await chat.receive(s,{identityId:identity,providerMessageId:randomUUID(),text:'Synthetic rollback',occurredAt:'2026-10-06T01:00:00Z',correlation:'workspace-fixture'});throw new Error('rollback');})).rejects.toThrow('rollback');
    expect((await ws.state(account,tenant,id)).data).toMatchObject({latest_inbound_seq:'2',unread_message_count:'1'});
    await receive();await Promise.all([mark('3'),mark('2')]);
    const eventCount=(await ds.query("SELECT COUNT(*) n FROM outbox_event WHERE event_type='chat.read_marker.updated'"))[0].n;
    expect((await ws.state(account,tenant,id)).data.last_read_inbound_seq).toBe('3');expect((await ws.state(otherAccount,tenant,id)).data.unread_message_count).toBe('2');
    const request=randomUUID();await mark('3',account,request);await receive();await mark('3',account,request);expect((await ws.state(account,tenant,id)).data.unread_message_count).toBe('1');
    await expect(mark('5')).rejects.toThrow('INVALID_READ_POSITION');await expect(mark('2',account,request)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
    expect((await ds.query("SELECT COUNT(*) n FROM outbox_event WHERE event_type='chat.read_marker.updated'"))[0].n).toBe(eventCount);
  });
  it('counts authorized server queries, Unicode prefixes, tie sort, unread filter and signed cursor binding',async()=>{
    const contact2=String((await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Zulu Synthetic'}},randomUUID(),undefined,'workspace-fixture')).body.data.id),identity2=randomUUID();
    await ds.query("INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,'workspace-two')",[identity2,tenant,connection,contact2]);second=(await receive(randomUUID(),identity2)).conversationId;
    const all=await ws.list(account,tenant,{limit:'1'});expect(all.data).toHaveLength(1);expect(all.meta.conversation_count).toBe('2');expect(all.next_cursor).not.toBeNull();
    const next=await ws.list(account,tenant,{limit:'1',cursor:all.next_cursor!});expect(next.data).toHaveLength(1);expect(next.data[0]!.conversation.id).not.toBe(all.data[0]!.conversation.id);expect(next.next_cursor).toBeNull();
    await expect(ws.list(otherAccount,tenant,{limit:'1',cursor:all.next_cursor!})).rejects.toThrow('QUERY_CHANGED');await expect(ws.list(account,tenant,{limit:'1',cursor:all.next_cursor!+'x'})).rejects.toThrow('INVALID_CURSOR');
    expect((await ws.list(account,tenant,{q:'ĐẶ'.normalize('NFD')})).data.map(r=>r.conversation.id)).toEqual([id]);expect((await ws.list(account,tenant,{q:'dang'})).data).toHaveLength(0);
    expect((await ws.list(account,tenant,{unread:'only'})).meta.conversation_count).toBe('2');expect((await ws.list(account,tenant,{scope:'mine'})).meta.conversation_count).toBe('0');
    expect((await ws.sidebar(account,tenant)).data.scopes.find(s=>s.key==='all')!.conversation_count).toBe('2');
  });
  it('rejects tenant/seat/field/query bypass and applies scoped ACL to counts',async()=>{
    await expect(ws.state(account,beta,id)).rejects.toThrow();await expect(ws.list(account,tenant,{q:'%'.repeat(101)})).rejects.toThrow('INVALID_REQUEST');
    await ds.query("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND account_id=?",[tenant,account]);await expect(ws.list(account,tenant,{})).rejects.toThrow('FORBIDDEN');await ds.query("UPDATE membership SET seat_code='chat' WHERE tenant_id=? AND account_id=?",[tenant,account]);
    await ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants.map(g=>g.resource==='conversation'?{...g,scope:'own'}:g)),tenant,role]);expect((await ws.list(account,tenant,{})).meta.conversation_count).toBe('0');await expect(mark('4')).rejects.toThrow('NOT_FOUND');
    await ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,role]);
    const policy=randomUUID(),[type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'",[tenant]);
    await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'display_name',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,type.id]);
    await expect(ws.list(account,tenant,{q:'Đặng'})).rejects.toThrow('FIELD_FORBIDDEN');await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
  });
  it('preserves new inbound waiting during send and unknown delivery until receipt reconciliation',async()=>{
    await ds.query('UPDATE crm_record SET owner_principal_id=?,owner_revision=2 WHERE tenant_id=? AND id=?',[principal,tenant,id]);
    const send=await chat.mutate(account,tenant,id,'messages',{text:'Synthetic reply',owner_revision:'2'},randomUUID(),undefined,'workspace-fixture');
    await receive();const newSeq=(await ws.state(account,tenant,id)).data.latest_inbound_seq;
    const dispatcher=new OutboundDispatcher(ds,new MockSender(ds));await dispatcher.dispatch(tenant,id,String(send.body.data.id));
    const [waiting]=await ds.query('SELECT latest_inbound_seq,answered_inbound_seq,waiting_since FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,id]);expect(String(waiting.latest_inbound_seq)).toBe(newSeq);expect(BigInt(waiting.answered_inbound_seq)).toBe(BigInt(newSeq)-1n);expect(waiting.waiting_since).not.toBeNull();
    const next=await chat.mutate(account,tenant,id,'messages',{text:'Synthetic later reply',owner_revision:'2'},randomUUID(),undefined,'workspace-fixture');
    const unknown=new OutboundDispatcher(ds,{send:async()=>({status:'unknown',errorCode:'SYNTHETIC_UNKNOWN'}),lookup:async()=>({status:'sent',providerMessageId:'synthetic-receipt'})});await unknown.dispatch(tenant,id,String(next.body.data.id));
    expect((await ws.list(account,tenant,{scope:'mine'})).data[0]!.waiting_since).not.toBeNull();await unknown.reconcile(tenant,id,String(next.body.data.id));expect((await ws.list(account,tenant,{scope:'mine'})).data[0]!.waiting_since).toBeNull();
  });
  it('closed is not waiting; hidden archived records cannot break the queue; new Human does not inherit old read cutoff',async()=>{
    await receive();const detail=(await chat.read(account,tenant,id)).data as any;await chat.mutate(account,tenant,id,'transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),detail.version,'workspace-fixture');
    expect((await ws.list(account,tenant,{status:'closed'})).data[0]!.waiting_since).toBeNull();
    await ds.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,second]);expect((await ws.list(account,tenant,{status:'closed,open,pending'})).meta.conversation_count).toBe('1');
    await ds.query('DELETE FROM chat_read_rollout_principal WHERE tenant_id=? AND principal_id=?',[tenant,other]);expect((await ws.state(otherAccount,tenant,id)).data.last_read_inbound_seq).toBe('0');
  });
  it('HTTP routes enforce protocol and return responses validated by the generated schema source',async()=>{
    const fake={service:{session:async()=>({account_id:account}),requireMutation:async()=>({account_id:account})}};
    class TestModule{}
    Module({controllers:[WorkspaceController],providers:[{provide:AuthRuntime,useValue:fake},{provide:WorkspaceRuntime,useValue:{workspace:ws,ready:async()=>{}}}]})(TestModule);
    const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
    const schema=JSON.parse(await readFile('packages/contracts/schemas/chat-workspace.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
    try{const base=await app.getUrl(),headers={'X-Tenant-Id':tenant};
      for(const [path,name] of [['capabilities','capabilities'],['sidebar','sidebar'],['conversations?status=closed','list'],[`conversations/${id}/read-state`,'read-response']]){const response=await fetch(`${base}/api/v1/chat-workspace/${path}`,{headers});expect(response.status).toBe(200);const validate=ajv.getSchema(`${schema.$id}#/definitions/workspace-${name}`)!;expect(validate(await response.json()),JSON.stringify(validate.errors)).toBe(true);}
      const invalid=await fetch(`${base}/api/v1/chat-workspace/conversations/${id}/read-state`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({through_inbound_seq:'0'})});expect(invalid.status).toBe(400);
    }finally{await app.close();}
  });
  workspaceCatalogCases(()=>({ds,tenant,beta,account,otherAccount,principal,other,role,team,id,grants}));
  workspaceActivityCases(()=>({ds,tenant,beta,account,otherAccount,principal,other,role,team,identity,grants}));
});}
