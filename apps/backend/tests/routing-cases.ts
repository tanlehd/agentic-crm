import { routingAccessConsumer } from '../src/modules/agents/access-consumer.js';
import { DurableDelivery } from '../src/kernel/reliability/delivery.js';
import { DurableCommands } from '../src/kernel/reliability/commands.js';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { Routing } from '../src/modules/agents/routing.js';
import { Conversations } from '../src/modules/conversation/domain.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains,contactReferences } from '../src/modules/crm/core.js';
import { leadDomain,LeadService } from '../src/modules/sales/leads.js';
import { OutboundDispatcher } from '../src/modules/conversation/outbound.js';
import { MockSender } from '../src/modules/channels/mock-sender.js';
import { RoutingController,RoutingRuntime } from '../src/modules/agents/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
export function routingCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-017 real routing and ownership',()=>{
  let ds:DataSource,routing:Routing,conversations:Conversations,records:CrmRecords,id:string,lead:string;
  const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),otherAccount=randomUUID(),owner=randomUUID(),other=randomUUID(),ai=randomUUID(),team=randomUUID(),otherTeam=randomUUID(),role=randomUUID(),policy=randomUUID(),service=randomUUID();
  const grants=[...['read','reply','note','update','assign','takeover'].map(action=>({resource:'conversation',action,scope:'all'})),...['contact','lead'].flatMap(resource=>['create','read','update','qualify','assign'].map(action=>({resource,action,scope:'all'})))];
  const detail=async()=>((await conversations.read(account,tenant,id)).data as any);
  const assign=async(principal:string|null,extra:Record<string,unknown>={},version?:string,key=randomUUID(),who=account)=>routing.mutate(who,tenant,id,false,{owner_principal_id:principal,reason:'manual',...extra},key,version??(await detail()).version,'synthetic');
  const route=async(preference:'human'|'ai'|'any'='human',version?:string)=>routing.uow.run({tenantId:tenant},async s=>{const a=await routing.auth.loadHuman(s,account,undefined,true);const [r]=await s.query('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,id]);return routing.route(s,a,id,version??String(r.version),team,'chat',preference,'synthetic');});
  it('v10 upgrade preserves records, capacity FK is tenant scoped, repeat no-op',async()=>{
    ds=await isolated('routing_test');await migrate(ds,migrations.slice(0,10));
    for(const t of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
    for(const [a,p] of [[account,owner],[otherAccount,other]]){const m=randomUUID();await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://routing.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[a,a]);await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,tenant,a]);await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,tenant,m]);}
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'routing','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);
    await ds.query("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'routing',JSON_ARRAY('conversation.propose_reply','qualification.save'),JSON_ARRAY('conversation.read','conversation.reply','lead.read','lead.qualify'),30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant]);
    const agent=randomUUID();await ds.query("INSERT INTO ai_agent(id,tenant_id,name,runtime_adapter,policy_id,max_concurrency,created_at,updated_at) VALUES (?,?,'Synthetic','mock',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[agent,tenant,policy]);await ds.query("INSERT INTO principal(id,tenant_id,kind,ai_agent_id,status,created_at,updated_at) VALUES (?,?,'ai',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ai,tenant,agent]);
    for(const t of [team,otherTeam])await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t,tenant]);
    for(const p of [owner,other,ai]){await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,p,role]);await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,p]);}
    await ds.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'routing',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[service,tenant,role]);
    for(const key of ['contact','lead','conversation'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,key,key]);
    const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));records=new CrmRecords(ds,'synthetic',domains);const contact=String((await records.mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Synthetic routing contact'}},randomUUID(),undefined,'synthetic')).body.data.id);
    lead=String((await new LeadService(records,contactReferences).create(account,tenant,{contact_id:contact},randomUUID(),'synthetic')).body.data.id);
    const connection=randomUUID(),identity=randomUUID();await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id) VALUES (?,?,'mock_messenger','routing',?)",[connection,tenant,team]);await ds.query("INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,'synthetic-routing')",[identity,tenant,connection,contact]);
    conversations=new Conversations(ds,'synthetic');id=(await conversations.uow.run({tenantId:tenant},s=>conversations.receive(s,{identityId:identity,providerMessageId:randomUUID(),text:'Synthetic',occurredAt:'2026-10-05T01:00:00Z',correlation:'synthetic'}))).conversationId;
    const before=await ds.query('SELECT * FROM crm_record ORDER BY id');expect(await migrate(ds)).toBe(migrations.length-10);expect(await migrate(ds)).toBe(0);expect(await ds.query('SELECT * FROM crm_record ORDER BY id')).toEqual(before);routing=new Routing(ds);
    await expect(ds.query('INSERT INTO agent_capacity_slot VALUES (?,?,?,UTC_TIMESTAMP(6),NULL)',[beta,randomUUID(),ai])).rejects.toThrow();
  });
  it('manual assignment bumps history/revision, replays once and stale CAS loses',async()=>{
    const before=await detail(),key=randomUUID(),result=await assign(ai,{},before.version,key);expect(result.body.data.owner_revision).toBe(String(BigInt(before.owner_revision)+1n));expect(await assign(ai,{},before.version,key)).toEqual(result);
    await expect(assign(owner,{},before.version,key)).rejects.toThrow('IDEMPOTENCY_CONFLICT');await expect(assign(owner,{},before.version)).rejects.toThrow('VERSION_CONFLICT');
    const events=await ds.query("SELECT * FROM outbox_event WHERE event_type='record.assigned' AND aggregate_id=?",[id]);expect(events).toHaveLength(1);
  });
  it('eligibility rejects inactive, cross tenant, team mismatch, missing seat/role/policy/field',async()=>{
    await expect(assign(randomUUID())).rejects.toThrow('TARGET_INELIGIBLE');await expect(assign(owner,{team_id:otherTeam})).rejects.toThrow('TARGET_INELIGIBLE');
    await ds.query("UPDATE principal SET status='suspended' WHERE id=?",[other]);await expect(assign(other)).rejects.toThrow('TARGET_INELIGIBLE');await ds.query("UPDATE principal SET status='active' WHERE id=?",[other]);
    await ds.query("UPDATE membership SET seat_code='sales' WHERE account_id=?",[otherAccount]);await expect(assign(other)).rejects.toThrow('TARGET_INELIGIBLE');await ds.query("UPDATE membership SET seat_code='admin' WHERE account_id=?",[otherAccount]);
    await ds.query('UPDATE agent_policy SET allowed_tools=JSON_ARRAY() WHERE id=?',[policy]);await expect(assign(ai)).rejects.toThrow('TARGET_INELIGIBLE');await ds.query("UPDATE agent_policy SET allowed_tools=JSON_ARRAY('conversation.propose_reply','qualification.save') WHERE id=?",[policy]);
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.action!=='reply')),role]);await expect(assign(other)).rejects.toThrow('TARGET_INELIGIBLE');await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
    const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]),field=randomUUID();await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'text',JSON_ARRAY('write'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[field,tenant,role,type.id]);await expect(assign(other)).rejects.toThrow('TARGET_INELIGIBLE');await ds.query('DELETE FROM field_policy WHERE id=?',[field]);
    await expect(routing.mutate(account,beta,id,false,{owner_principal_id:owner,reason:'manual'},randomUUID(),'1','synthetic')).rejects.toThrow('FORBIDDEN');
  });
  it('round robin concurrent routes use one cursor and rollback stale cursor mutation',async()=>{
    const results=await Promise.all([route(),route(),route(),route()]),sorted=[owner,other].sort();expect(results.map(r=>r.owner_principal_id).sort()).toEqual([sorted[0],sorted[0],sorted[1],sorted[1]]);const history=await ds.query('SELECT to_owner_id FROM ownership_history WHERE record_id=? ORDER BY owner_revision DESC LIMIT 4',[id]);expect(history.map((r:any)=>r.to_owner_id)).toEqual([sorted[1],sorted[0],sorted[1],sorted[0]]);
    const before=await ds.query('SELECT * FROM routing_cursor');await expect(route('human','1')).rejects.toThrow('VERSION_CONFLICT');expect(await ds.query('SELECT * FROM routing_cursor')).toEqual(before);
    const v=(await detail()).version,race=await Promise.allSettled([assign(owner,{},v),assign(other,{},v)]);expect(race.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  });
  it('unavailable humans stay in queue with attention and later routing resolves it',async()=>{
    await ds.query("UPDATE principal SET availability='unavailable' WHERE kind='human' AND tenant_id=?",[tenant]);expect((await route()).owner_principal_id).toBeNull();expect((await detail()).team_id).toBe(team);expect((await ds.query('SELECT active FROM routing_attention WHERE record_id=?',[id]))[0].active).toBe(1);
    await ds.query("UPDATE principal SET availability='available' WHERE kind='human' AND tenant_id=?",[tenant]);await route();expect((await ds.query('SELECT active FROM routing_attention WHERE record_id=?',[id]))[0].active).toBe(0);
  });
  it('capacity counts atomic execution reservations, not owned Conversations',async()=>{
    await route('ai');await route('ai');const ids=[randomUUID(),randomUUID()],results=await Promise.all(ids.map(execution=>routing.uow.run({tenantId:tenant},s=>routing.capacity.reserve(s,ai,execution))));expect(results.filter(Boolean)).toHaveLength(1);
    const winner=ids[results.indexOf(true)]!;expect(await routing.uow.run({tenantId:tenant},s=>routing.capacity.reserve(s,ai,winner))).toBe(true);expect((await route('ai')).owner_principal_id).toBeNull();await expect(assign(ai)).rejects.toThrow('TARGET_INELIGIBLE');
    await routing.uow.run({tenantId:tenant},s=>routing.capacity.release(s,ai,winner));expect(await routing.uow.run({tenantId:tenant},s=>routing.capacity.reserve(s,ai,winner))).toBe(false);expect((await route('ai')).owner_principal_id).toBe(ai);
    const expired=randomUUID();await routing.uow.run({tenantId:tenant},s=>routing.capacity.reserve(s,ai,expired));await ds.query('UPDATE agent_capacity_slot SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE execution_id=?',[expired]);expect(await routing.uow.run({tenantId:tenant},s=>routing.capacity.reserve(s,ai,expired))).toBe(false);expect((await route('ai')).owner_principal_id).toBe(ai);
  });
  it('Human takeover only needs takeover grant; Lead independent; queued cancelled, sending finishes',async()=>{
    await assign(ai);const aiBefore=await detail();await routing.mutate(account,tenant,id,true,{reason:'human_takeover'},randomUUID(),aiBefore.version,'synthetic');expect((await detail()).owner_principal_id).toBe(owner);
    await assign(owner);const before=await detail(),leadBefore=await ds.query('SELECT * FROM crm_record WHERE id=?',[lead]);
    const send=async()=>String((await conversations.mutate(account,tenant,id,'messages',{text:'Synthetic takeover outbound',owner_revision:before.owner_revision},randomUUID(),undefined,'synthetic')).body.data.id);
    const queued=await send(),sending=await send();let release!:()=>void,started!:()=>void;const entered=new Promise<void>(r=>{started=r;}),gate=new Promise<void>(r=>{release=r;}),mock=new MockSender(ds),dispatcher=new OutboundDispatcher(ds,{send:async input=>{started();await gate;return mock.send(input);},lookup:(t,i)=>mock.lookup(t,i)});const work=dispatcher.dispatch(tenant,id,sending);await entered;
    try{await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.action!=='assign')),role]);const v=(await detail()).version,result=await routing.mutate(otherAccount,tenant,id,true,{reason:'human_takeover'},randomUUID(),v,'synthetic');expect(result.body.data.owner_principal_id).toBe(other);expect((await ds.query('SELECT status FROM outbound_intent WHERE id=?',[queued]))[0].status).toBe('cancelled');expect((await ds.query('SELECT status FROM outbound_intent WHERE id=?',[sending]))[0].status).toBe('sending');expect(await ds.query('SELECT * FROM crm_record WHERE id=?',[lead])).toEqual(leadBefore);}finally{release();await work;await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);}
    expect((await ds.query('SELECT status FROM outbound_intent WHERE id=?',[sending]))[0].status).toBe('sent');
  });
  it('callback failure rolls assignment/cancellation/receipt/history back together',async()=>{
    await assign(owner);const before=await detail();const intent=String((await conversations.mutate(account,tenant,id,'messages',{text:'Synthetic atomic',owner_revision:before.owner_revision},randomUUID(),undefined,'synthetic')).body.data.id),history=await ds.query('SELECT * FROM ownership_history WHERE record_id=?',[id]);
    const broken=new Routing(ds,async()=>{throw new Error('synthetic pause failure');});await expect(broken.mutate(otherAccount,tenant,id,true,{reason:'human_takeover'},randomUUID(),before.version,'synthetic')).rejects.toThrow('synthetic pause failure');expect((await detail()).version).toBe(before.version);expect(await ds.query('SELECT * FROM ownership_history WHERE record_id=?',[id])).toEqual(history);expect((await ds.query('SELECT status FROM outbound_intent WHERE id=?',[intent]))[0].status).toBe('queued');
  });
  it('team omission preserves queue; non-admin cannot clear team; replay checks revoked privilege',async()=>{
    const v=(await detail()).version,key=randomUUID();await assign(null,{},v,key);expect((await detail()).team_id).toBe(team);
    await ds.query("UPDATE membership SET seat_code='chat' WHERE account_id=?",[account]);await expect(assign(null,{team_id:null})).rejects.toThrow('FORBIDDEN');await ds.query("UPDATE membership SET seat_code='admin' WHERE account_id=?",[account]);
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.action!=='assign')),role]);await expect(assign(null,{},v,key)).rejects.toThrow('FORBIDDEN');await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
    await assign(owner,{team_id:null});expect((await detail()).team_id).toBeNull();await assign(owner,{team_id:team});
  });
  it('service routing has live allowlist and preserves service actor in history/audit/event',async()=>{
    const v=(await detail()).version;await routing.uow.run({tenantId:tenant},s=>routing.routeService(s,service,id,v,team,'chat','human','synthetic-service'));
    expect((await ds.query('SELECT actor_kind,actor_id FROM ownership_history WHERE record_id=? ORDER BY owner_revision DESC LIMIT 1',[id]))[0]).toEqual({actor_kind:'service',actor_id:service});expect((await ds.query("SELECT actor_kind FROM outbox_event WHERE correlation_id='synthetic-service'"))[0].actor_kind).toBe('service');
    await ds.query('UPDATE service_actor SET active=0 WHERE id=?',[service]);await expect(routing.uow.run({tenantId:tenant},s=>routing.routeService(s,service,id,v,team,'chat','human','synthetic'))).rejects.toThrow('FORBIDDEN');
  });
  it('HTTP supports ETag, target/history reads, 428/400/409 and CSRF boundary',async()=>{
    class TestModule{}Module({controllers:[RoutingController],providers:[{provide:RoutingRuntime,useValue:{ready:async()=>{},routing}},{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:account}),requireMutation:async(_cookie:any,_origin:any,csrf:any)=>{if(csrf!=='synthetic')throw new CommandError(403,'CSRF_INVALID');return {account_id:account};}}}}]})(TestModule);
    const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');try{const base=await server.getUrl(),path=`${base}/api/v1/records/${id}`,headers={'X-Tenant-Id':tenant,'Content-Type':'application/json','Idempotency-Key':randomUUID(),'X-CSRF-Token':'synthetic'},body=JSON.stringify({owner_principal_id:owner,reason:'manual'});
      expect((await fetch(`${path}/assignment`,{method:'POST',headers,body})).status).toBe(428);expect((await fetch(`${path}/assignment`,{method:'POST',headers:{...headers,'X-CSRF-Token':''},body})).status).toBe(403);
      const result=await fetch(`${path}/assignment`,{method:'POST',headers:{...headers,'If-Match':`"${(await detail()).version}"`},body});expect(result.status).toBe(200);expect(result.headers.get('etag')).toBeTruthy();
      expect((await fetch(`${path}/assignment`,{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID(),'If-Match':'"1"'},body})).status).toBe(409);
      const targets=await fetch(`${path}/assignment-targets`,{headers});expect(targets.status).toBe(200);expect((await targets.json()).data).toHaveLength(3);const history=await fetch(`${path}/ownership-history`,{headers});expect(history.status).toBe(200);expect((await history.json()).data.length).toBeGreaterThan(1);
      expect((await fetch(`${path}/assignment`,{method:'POST',headers:{...headers,'If-Match':'"1"'},body:JSON.stringify({owner_principal_id:owner,reason:'private free text'})})).status).toBe(400);
    }finally{await server.close();}
  });
  it('disable marks attention without reassign; durable duplicate and old events use live state',async()=>{
    await assign(other);const before=await detail();
    await ds.query("UPDATE principal SET status='suspended',auth_revision=auth_revision+1 WHERE id=?",[other]);
    await routing.uow.run({tenantId:tenant},s=>new DurableCommands().accessChanged(s,owner,'synthetic-disable',{id:other,version:'2',auth_revision:'2'}));
    const delivery=new DurableDelivery(ds),claims=await delivery.claim(),[event]=await ds.query("SELECT id FROM outbox_event WHERE correlation_id='synthetic-disable'"),claim=claims.find(c=>c.eventId===event.id)!,consumer=routingAccessConsumer(routing);
    await delivery.consume(claim,consumer);await delivery.consume(claim,consumer);expect((await ds.query('SELECT active,reason FROM routing_attention WHERE record_id=?',[id]))[0]).toEqual({active:1,reason:'owner_ineligible'});expect((await detail()).owner_principal_id).toBe(other);expect((await detail()).owner_revision).toBe(before.owner_revision);
    await ds.query("UPDATE principal SET status='active',auth_revision=auth_revision+1 WHERE id=?",[other]);
    await routing.uow.run({tenantId:tenant},s=>new DurableCommands().accessChanged(s,owner,'synthetic-old',{id:other,version:'2',auth_revision:'2'}));
    const [old]=await ds.query("SELECT id FROM outbox_event WHERE correlation_id='synthetic-old'"),oldClaim=(await delivery.claim()).find(c=>c.eventId===old.id)!;await delivery.consume(oldClaim,consumer);expect((await ds.query('SELECT active FROM routing_attention WHERE record_id=?',[id]))[0].active).toBe(0);
  });
  it('closed rejects assignment; audit/history remain sanitized',async()=>{const v=(await detail()).version;await conversations.mutate(account,tenant,id,'transition',{target_status:'closed',reason:'Synthetic close'},randomUUID(),v,'synthetic');await expect(assign(owner)).rejects.toThrow('INVALID_TRANSITION');const persisted=JSON.stringify(await ds.query('SELECT * FROM audit_entry'))+JSON.stringify(await ds.query('SELECT payload FROM outbox_event'));expect(persisted).not.toContain('Synthetic takeover outbound');expect(persisted).not.toContain('private free text');});
});}
import { CommandError } from '../src/kernel/reliability/commands.js';
