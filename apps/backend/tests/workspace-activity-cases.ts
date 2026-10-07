import { it,expect } from 'vitest';
import { faultProcess } from './fixtures/fault-process.js';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { ConversationSnooze,wakeSnooze } from '../src/modules/conversation/snooze.js';
import { ConversationActivity,activityConsumers } from '../src/modules/conversation/activity.js';
import { backfillActivity,appendActivity } from '../src/modules/conversation/activity-storage.js';
import { Conversations } from '../src/modules/conversation/domain.js';
import { ChatWorkspace } from '../src/modules/conversation/workspace.js';
import { DurableDelivery } from '../src/kernel/reliability/delivery.js';
import { RecordRegistry } from '../src/modules/crm/registry.js';
import { conversationOwnership } from '../src/modules/conversation/ownership-port.js';
import { CrmActivityPort } from '../src/modules/crm/activity-port.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains } from '../src/modules/crm/core.js';
import { WorkspaceActivityController } from '../src/modules/conversation/workspace-activity-http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
type Fixture={ds:DataSource;tenant:string;beta:string;account:string;otherAccount:string;principal:string;other:string;role:string;team:string;identity:string;grants:unknown[]};
export function workspaceActivityCases(fixture:()=>Fixture){
  let snooze:ConversationSnooze,feed:ConversationActivity,chat:Conversations,ws:ChatWorkspace,id:string,firstKey:string;
  const receive=(key=randomUUID())=>{const f=fixture();return chat.uow.run({tenantId:f.tenant},s=>chat.receive(s,{identityId:f.identity,providerMessageId:key,text:'Synthetic SRC-034 inbound',occurredAt:'2026-10-06T01:00:00Z',correlation:'src034'}));};
  const until=()=>new Date(Date.now()+3600000).toISOString();
  const detail=async()=>{const f=fixture();return (await chat.read(f.account,f.tenant,id)).data as any;};
  const command=async(op:'snooze'|'wake',body:unknown={},version?:string,key=randomUUID())=>{const f=fixture();return snooze.mutate(f.account,f.tenant,id,op,body,key,version??(await detail()).version,'src034');};
  const relay=async()=>{const f=fixture(),delivery=new DurableDelivery(f.ds);for(;;){const claims=await delivery.claim();if(!claims.length)break;for(const c of claims){const [r]=await f.ds.query('SELECT event_type FROM outbox_event WHERE id=?',[c.eventId]);if(activityConsumers.some(x=>x.type===r.event_type))await delivery.dispatch(c,activityConsumers);else await delivery.finish(c);}}};
  it('SRC-034 activity backfill is resumable and snooze overlay preserves owner/unread/outbound with strict guards',async()=>{
    const f=fixture();chat=new Conversations(f.ds,'src034');snooze=new ConversationSnooze(f.ds);feed=new ConversationActivity(f.ds,'src034');ws=new ChatWorkspace(f.ds,'src034');firstKey=randomUUID();id=(await receive(firstKey)).conversationId;
    expect(await backfillActivity(f.ds)).toBeGreaterThanOrEqual(0);expect(await backfillActivity(f.ds)).toBe(0);
    await f.ds.query('UPDATE crm_record SET owner_principal_id=? WHERE tenant_id=? AND id=?',[f.principal,f.tenant,id]);
    const before=await detail(),read=(await ws.state(f.account,f.tenant,id)).data;
    const outgoing=await chat.mutate(f.account,f.tenant,id,'messages',{text:'Synthetic queued before snooze',owner_revision:before.owner_revision},randomUUID(),undefined,'src034');
    const result=await command('snooze',{until:until(),reason:'Synthetic protected reason'});expect(result.body.data.snooze_revision).toBe('1');expect((await detail()).owner_revision).toBe(before.owner_revision);expect((await ws.state(f.account,f.tenant,id)).data).toEqual(read);
    expect((await f.ds.query('SELECT status FROM outbound_intent WHERE id=?',[outgoing.body.data.id]))[0].status).toBe('queued');
    expect((await ws.list(f.account,f.tenant,{snooze:'only'})).data.map(x=>x.conversation.id)).toContain(id);expect((await ws.list(f.account,f.tenant,{})).data.map(x=>x.conversation.id)).not.toContain(id);
    expect(JSON.stringify(await f.ds.query("SELECT payload FROM outbox_event WHERE event_type='chat.snooze.changed'"))).not.toContain('protected reason');
    await expect(command('snooze',{until:'2020-01-01T00:00:00Z'})).rejects.toThrow('VALIDATION_FAILED');await expect(command('snooze',{until:until(),unknown:1})).rejects.toThrow();await expect(command('snooze',{until:until()},before.version)).rejects.toThrow('VERSION_CONFLICT');
    await expect(snooze.mutate(f.account,f.tenant,id,'wake',{},randomUUID(),undefined,'src034')).rejects.toThrow('PRECONDITION_REQUIRED');await expect(snooze.get(f.account,f.beta,id)).rejects.toThrow();
  });
  it('SRC-034 duplicate inbound cannot wake; current inbound wakes atomically once; command replay does not reschedule',async()=>{
    const f=fixture();await receive(firstKey);expect((await snooze.get(f.account,f.tenant,id)).data.until).not.toBeNull();
    const key=randomUUID(),v=(await detail()).version,body={until:until()};const r=await command('snooze',body,v,key);expect(await command('snooze',body,v,key)).toEqual(r);
    const inbound=randomUUID();await receive(inbound);const state=(await snooze.get(f.account,f.tenant,id)).data;expect(state.until).toBeNull();await receive(inbound);expect((await snooze.get(f.account,f.tenant,id)).data).toEqual(state);
    const [events]=await f.ds.query("SELECT COUNT(*) n FROM outbox_event WHERE event_type='chat.snooze.changed' AND aggregate_id=? AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.cause'))='inbound'",[id]);expect(Number(events.n)).toBe(1);
  });
  it('SRC-034 reschedule fences stale workers and deadlines are effective before two restarted workers materialize once',async()=>{
    const f=fixture();await command('snooze',{until:until()});const old=(await snooze.get(f.account,f.tenant,id)).data.snooze_revision;
    await command('snooze',{until:new Date(Date.now()+7200000).toISOString()});
    await snooze.uow.run({tenantId:f.tenant},async s=>{await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[f.tenant,id]);expect(await wakeSnooze(s,id,'deadline',true,old)).toBe(false);});
    await f.ds.query('UPDATE conversation_snooze SET until_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]);await f.ds.query('UPDATE conversation_workspace SET snoozed_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]);
    const version=(await detail()).version;expect((await snooze.get(f.account,f.tenant,id)).data.until).toBeNull();expect((await detail()).version).toBe(version);expect((await ws.list(f.account,f.tenant,{})).data.map(x=>x.conversation.id)).toContain(id);expect((await feed.read(f.account,f.tenant,id)).meta.sources.find(x=>x.service==='chat')?.state).toBe('delayed');
    await Promise.all([new ConversationSnooze(f.ds).tick(),new ConversationSnooze(f.ds).tick()]);expect(BigInt((await detail()).version)).toBe(BigInt(version)+1n);expect((await snooze.get(f.account,f.tenant,id)).data.until).toBeNull();
    const [events]=await f.ds.query("SELECT COUNT(*) n FROM outbox_event WHERE event_type='chat.snooze.changed' AND aggregate_id=? AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.cause'))='deadline'",[id]);expect(Number(events.n)).toBe(1);
  });
  it('SRC-034 SIGKILL after deadline commit, restart and unavailable Redis preserve exactly one wake',async()=>{
    const f=fixture();await command('snooze',{until:until()});const revision=(await snooze.get(f.account,f.tenant,id)).data.snooze_revision;
    await f.ds.query('UPDATE conversation_snooze SET until_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]);
    const redis=new Redis({host:'127.0.0.1',port:1,lazyConnect:true,connectTimeout:200,retryStrategy:()=>null,maxRetriesPerRequest:0});redis.on('error',()=>{});try{await expect(redis.connect()).rejects.toThrow();await faultProcess(f.ds,{mode:'snooze-crash'},true);await faultProcess(f.ds,{mode:'snooze-recover'},false);}finally{redis.disconnect();}
    expect((await snooze.get(f.account,f.tenant,id)).data).toMatchObject({until:null,snooze_revision:(BigInt(revision)+1n).toString()});
  },30000);
  it('SRC-034 rollout flags block commands but retain durable deadline draining',async()=>{
    const f=fixture();await command('snooze',{until:until()});await f.ds.query("INSERT INTO chat_workspace_rollout(tenant_id,feature_key,state,updated_at) VALUES (?,'snooze_v1','disabled',UTC_TIMESTAMP(6))",[f.tenant]);
    try{expect((await ws.capabilities(f.account,f.tenant)).data.features.snooze_v1).toBe(false);await expect(command('snooze',{until:until()})).rejects.toThrow('CAPABILITY_UNAVAILABLE');await f.ds.query('UPDATE conversation_snooze SET until_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]);await snooze.tick();expect((await f.ds.query('SELECT until_at FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]))[0].until_at).toBeNull();}finally{await f.ds.query('DELETE FROM chat_workspace_rollout WHERE tenant_id=?',[f.tenant]);}
  });
  it('SRC-034 real assignment and close hooks wake/cancel without stale timers reopening or marking read',async()=>{
    const f=fixture();await command('snooze',{until:until()});const read=(await ws.state(f.account,f.tenant,id)).data;
    await chat.auth.runHuman(f.account,f.tenant,async(s,a)=>{const registry=new RecordRegistry(new Map([['conversation',conversationOwnership()]])),r=await registry.get(s,id,true);await registry.assign(s,a,id,r.version,f.principal,f.team,'src034',{reason:'Synthetic assignment'});});
    expect((await snooze.get(f.account,f.tenant,id)).data.until).toBeNull();expect((await ws.state(f.account,f.tenant,id)).data).toEqual(read);
    await command('snooze',{until:until()});await chat.mutate(f.account,f.tenant,id,'transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),(await detail()).version,'src034');await snooze.tick();expect((await detail()).status).toBe('closed');expect((await snooze.get(f.account,f.tenant,id)).data.until).toBeNull();await expect(command('snooze',{until:until()})).rejects.toThrow('INVALID_TRANSITION');
    id=(await receive()).conversationId;
  });
  it('SRC-034 concurrent commands require version CAS and replay rechecks update permission; reason stays protected',async()=>{
    const f=fixture(),v=(await detail()).version,results=await Promise.allSettled([command('snooze',{until:until()},v),command('snooze',{until:until()},v)]);expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(results.filter(x=>x.status==='rejected')).toHaveLength(1);
    const key=randomUUID(),body={until:until(),reason:'Synthetic private schedule'},version=(await detail()).version;await command('snooze',body,version,key);
    const [saved]=await f.ds.query('SELECT permissions FROM `role` WHERE id=?',[f.role]);await f.ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(f.grants.filter((g:any)=>g.resource!=='conversation'||g.action!=='update')),f.role]);
    try{expect((await snooze.get(f.account,f.tenant,id)).data).not.toHaveProperty('reason');await expect(command('snooze',body,version,key)).rejects.toThrow('FORBIDDEN');}finally{await f.ds.query('UPDATE `role` SET permissions=? WHERE id=?',[typeof saved.permissions==='string'?saved.permissions:JSON.stringify(saved.permissions),f.role]);}
    await command('wake');
  });
  it('SRC-034 note outbox, relay dedup, current source content, body denial and revoked read are enforced',async()=>{
    const f=fixture();const grants=[...f.grants,...['read','create','update','archive'].map(action=>({resource:'activity',action,scope:'all'}))];await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),f.tenant,f.role]);
    const created=await chat.mutate(f.account,f.tenant,id,'notes',{text:'Synthetic private note'},randomUUID(),undefined,'src034'),note=String(created.body.data.id);
    expect((await feed.read(f.account,f.tenant,id)).meta.state).toBe('partial');await relay();
    let page=await feed.read(f.account,f.tenant,id);expect(page.data.find(x=>x.kind==='note')?.payload.body).toBe('Synthetic private note');
    const [event]=await f.ds.query("SELECT id FROM outbox_event WHERE event_type='crm.conversation_note.changed' AND aggregate_id=?",[note]);await f.ds.query("UPDATE outbox_event SET status='pending',next_attempt_at=NULL WHERE id=?",[event.id]);await relay();expect((await feed.read(f.account,f.tenant,id)).data.filter(x=>x.kind==='note')).toHaveLength(1);
    const records=new CrmRecords(f.ds,'src034',coreDomains());await records.mutate(f.account,f.tenant,{object:'activity',kind:'records',id:note},{fields:{body:'Synthetic updated note'}},randomUUID(),'1','src034');
    page=await feed.read(f.account,f.tenant,id);expect(page.data.find(x=>x.kind==='note')?.payload.body).toBe('Synthetic updated note');
    const [type]=await f.ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='activity'",[f.tenant]),policy=randomUUID();await f.ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'body',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,f.tenant,f.role,type.id]);
    expect((await feed.read(f.account,f.tenant,id)).data.find(x=>x.kind==='note')?.payload).toEqual({activity_id:note});await f.ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
    await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(f.grants),f.tenant,f.role]);expect((await feed.read(f.account,f.tenant,id)).data.some(x=>x.kind==='note')).toBe(false);await expect(feed.read(f.account,f.tenant,id,{after:page.newer_cursor})).rejects.toThrow('QUERY_CHANGED');
    await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),f.tenant,f.role]);await records.mutate(f.account,f.tenant,{object:'activity',kind:'archive',id:note},{reason:'Synthetic archive'},randomUUID(),'2','src034');await relay();expect((await feed.read(f.account,f.tenant,id)).data.some(x=>x.kind==='note')).toBe(false);
  });
  it('SRC-034 encrypted cursors page both directions, advance suppressed items, and reject tamper/viewer/tenant reuse',async()=>{
    const f=fixture();for(let n=0;n<4;n++)await receive();const all=await feed.read(f.account,f.tenant,id),latest=await feed.read(f.account,f.tenant,id,{limit:2});expect(latest.data).toEqual(all.data.slice(-2));expect(latest.older_cursor).not.toBeNull();
    const older=await feed.read(f.account,f.tenant,id,{before:latest.older_cursor!,limit:2});expect(older.data.map(x=>x.id).some(x=>latest.data.some(y=>y.id===x))).toBe(false);
    const empty=await feed.read(f.account,f.tenant,id,{after:latest.newer_cursor});expect(empty.data).toEqual([]);await receive();expect((await feed.read(f.account,f.tenant,id,{after:empty.newer_cursor})).data).toHaveLength(1);
    await expect(feed.read(f.otherAccount,f.tenant,id,{after:empty.newer_cursor})).rejects.toThrow('QUERY_CHANGED');await expect(feed.read(f.account,f.tenant,id,{after:empty.newer_cursor+'x'})).rejects.toThrow('INVALID_CURSOR');await expect(feed.read(f.account,f.tenant,id,{before:latest.older_cursor!,after:empty.newer_cursor})).rejects.toThrow('INVALID_REQUEST');expect(JSON.stringify(all)).not.toContain('activity_seq');
  });
  it('SRC-034 source outage is partial with generic warning; activity writer and consumer reject rollback/forged binding',async()=>{
    const f=fixture();const note=await chat.mutate(f.account,f.tenant,id,'notes',{text:'Synthetic outage note'},randomUUID(),undefined,'src034');await relay();
    class Unavailable extends CrmActivityPort {override async read():Promise<never>{throw new Error('synthetic upstream unavailable');}}
    const failed=await new ConversationActivity(f.ds,'src034',new Unavailable()).read(f.account,f.tenant,id);expect(failed.meta).toMatchObject({state:'partial'});expect(failed.meta.sources.find(x=>x.service==='crm')?.state).toBe('unavailable');expect(JSON.stringify(failed)).not.toContain('synthetic upstream');
    const before=await f.ds.query('SELECT * FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[f.tenant,id]);await expect(chat.uow.run({tenantId:f.tenant},async s=>{await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[f.tenant,id]);await appendActivity(s,id,{service:'chat',sourceKind:'lifecycle',sourceId:id,revision:'999',kind:'lifecycle',payload:{from_status:'open',to_status:'pending'}});throw Error('synthetic rollback');})).rejects.toThrow('synthetic rollback');expect(await f.ds.query('SELECT * FROM conversation_activity_counter WHERE tenant_id=? AND conversation_id=?',[f.tenant,id])).toEqual(before);
    await expect(chat.uow.run({tenantId:f.tenant},s=>activityConsumers[0]!.handle(s,{event_id:randomUUID(),tenant_id:f.tenant,event_type:'crm.conversation_note.changed',schema_version:1,aggregate_type:'activity',aggregate_id:String(note.body.data.id),aggregate_version:'1',actor:{kind:'human',id:f.principal},correlation_id:'src034',causation_id:null,occurred_at:new Date().toISOString(),data:{conversation_id:randomUUID(),activity_id:note.body.data.id,operation:'created',source_revision:'1'}}))).rejects.toThrow('INVALID_EVENT');
  });
  it('SRC-034 HTTP snooze/activity protocol and strict output schemas',async()=>{
    const f=fixture(),fake={service:{session:async()=>({account_id:f.account}),requireMutation:async()=>({account_id:f.account})}};class TestModule{}
    Module({controllers:[WorkspaceActivityController],providers:[{provide:AuthRuntime,useValue:fake},{provide:'WorkspaceRuntime',useValue:{snooze,activity:feed,ready:async()=>{}}}]})(TestModule);
    const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');const schema=JSON.parse(await readFile('packages/contracts/schemas/chat-activity.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
    try{const base=(await app.getUrl())+'/api/v1/chat-workspace/conversations/'+id,headers={'X-Tenant-Id':f.tenant,'Content-Type':'application/json','Idempotency-Key':randomUUID(),'If-Match':(await detail()).version};
      const response=await fetch(base+'/snooze',{method:'PUT',headers,body:JSON.stringify({until:until()})});expect(response.status).toBe(200);
      for(const [path,name] of [['snooze','snooze-response'],['activity','activity-response']]){const r=await fetch(base+'/'+path,{headers});expect(r.status).toBe(200);const validate=ajv.getSchema(schema.$id+'#/definitions/'+name)!;expect(validate(await r.json()),JSON.stringify(validate.errors)).toBe(true);}
      expect((await fetch(base+'/wake',{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:'{}'})).status).toBe(409);
    }finally{await app.close();}
  });
}
