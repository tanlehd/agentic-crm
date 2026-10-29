import { describe,it,expect } from 'vitest';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { SalesHandoffs } from '../src/modules/sales/handoff.js';
import { tools } from '../src/modules/agents/protocol.js';
import { healthcareMetrics } from './fixtures/healthcare-metrics.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains,contactReferences } from '../src/modules/crm/core.js';
import { LeadService,leadDomain } from '../src/modules/sales/leads.js';
import { LeadMerge } from '../src/modules/sales/lead-merge.js';

export function healthcareCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-023 healthcare fixture',()=>{
 const id=(n:number)=>`0199ab00-0000-7000-8000-${String(n).padStart(12,'0')}`;
 const tenant=id(1),beta=id(2),account=id(3),human=id(4),ai=id(5),role=id(6),team=id(7),policy=id(8),service=id(9),connection=id(10),salesTeam=id(11),seller=id(12),sellerAccount=id(13);
 const grants=[...['design','publish','operate','read'].map(action=>({resource:'automation',action,scope:'all'})),...['read','reply','update','assign','takeover'].map(action=>({resource:'conversation',action,scope:'all'})),...['create','read','update'].map(action=>({resource:'contact',action,scope:'all'})),...['create','read','qualify','handoff','accept'].map(action=>({resource:'lead',action,scope:'all'})),{resource:'integration',action:'deliver',scope:'all'}];
 const actions=['conversation.read','conversation.reply','contact.read','lead.create','lead.qualify','routing.request_human'];
 let ds:DataSource,sales:SalesHandoffs;
 let instant='2026-10-02T02:00:00Z';const at=(time:string)=>{instant=`2026-10-02T${time}Z`;};
 const token=randomBytes(32).toString('hex'),bearer=`Bearer ${token}`;
 const from=new Date('2026-10-02T03:00:00Z'),to=new Date('2026-10-03T03:00:00Z');
 const metrics=(t=tenant,f=from,e=to,a=to)=>healthcareMetrics(ds,t,f,e,a);
 const fixtures:Record<string,{conversation:string;contact:string;lead?:string;messages:string[]}>={};
 // Offline historical Chat rows support the retained KPI queries only. No Chat runtime
 // acceptance is claimed here; ingress/outbound/session behavior uses own-schema suites.
 async function receive(alias:string,index:number,text:string,referral?:string){
  let f=fixtures[alias];if(!f){
   const contact=String((await new CrmRecords(ds,'synthetic',coreDomains()).mutate(account,tenant,{object:'contact',kind:'records'},{fields:{display_name:'Synthetic healthcare'}},randomUUID(),undefined,'synthetic')).body.data.id),identity=randomUUID(),conversation=randomUUID();
   const [type]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[tenant]);
   await ds.query('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)',[identity,tenant,connection,contact,alias]);
   await ds.query('INSERT INTO crm_record(id,tenant_id,object_type_id,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[conversation,tenant,type.id]);
   await ds.query('INSERT INTO conversation(tenant_id,record_id,contact_id,contact_identity_id,connection_id,opened_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,conversation,contact,identity,connection]);
   f=fixtures[alias]={conversation,contact,messages:[]};
  }
  const message=randomUUID(),delivery=randomUUID();
  await ds.query("INSERT INTO message(id,tenant_id,conversation_id,connection_id,provider_message_id,direction,text,occurred_at,received_at,status) VALUES (?,?,?,?,?,'inbound',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'received')",[message,tenant,f.conversation,connection,alias+'-'+index,text]);
  if(referral){
   await ds.query("INSERT INTO inbound_delivery(id,tenant_id,connection_id,provider_event_id,payload_hash,payload,status,received_at) VALUES (?,?,?,?,REPEAT('0',64),JSON_OBJECT(),'processed',UTC_TIMESTAMP(6))",[delivery,tenant,connection,alias+'-'+index]);
   await ds.query("INSERT INTO touchpoint(id,tenant_id,connection_id,delivery_id,contact_id,conversation_id,channel,source,ad_id,occurred_at,received_at) VALUES (?,?,?,?,?,?,'mock_messenger','ctm',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),tenant,connection,delivery,f.contact,f.conversation,referral]);
  }
  return {r:{message_id:message}};
 }
 it('cold migrations and fixed synthetic actors; test clock applies to every query runner',async()=>{
  ds=await isolated('healthcare_test');await migrate(ds);
  const create=ds.createQueryRunner.bind(ds);ds.createQueryRunner=(mode)=>{const r=create(mode),query=r.query.bind(r);r.query=async(sql:string,parameters?:any[],structured?:boolean)=>{await query(`SET timestamp = ${Date.parse(instant)/1000}`);return query(sql,parameters,structured);};return r;};
  for(const t of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic clinic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t]);
    const member=id(20);await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://runtime.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[member,tenant,account]);await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[human,tenant,member]);
    await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'runtime','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[role,tenant,JSON.stringify(grants)]);await ds.query("INSERT INTO agent_policy(id,tenant_id,`key`,allowed_tools,allowed_actions,timeout_ms,max_tool_calls,created_at,updated_at) VALUES (?,?,'runtime',?,?,30000,5,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,JSON.stringify(tools),JSON.stringify(actions)]);
    const agent=id(21);await ds.query("INSERT INTO ai_agent(id,tenant_id,name,runtime_adapter,policy_id,max_concurrency,created_at,updated_at) VALUES (?,?,'Synthetic','mock',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[agent,tenant,policy]);await ds.query("INSERT INTO principal(id,tenant_id,kind,ai_agent_id,status,created_at,updated_at) VALUES (?,?,'ai',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[ai,tenant,agent]);await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic','chat',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[team,tenant]);for(const p of [ai,human]){await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,p,role]);await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,team,p]);}
    await ds.query("INSERT INTO service_actor(id,tenant_id,`key`,role_id,created_at,updated_at) VALUES (?,?,'runtime',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[service,tenant,role]);for(const key of ['contact','conversation','lead'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id(30+['contact','conversation','lead'].indexOf(key)),tenant,key,key]);
  await ds.query("INSERT INTO team(id,tenant_id,name,purpose,created_at,updated_at) VALUES (?,?,'Synthetic sales','sales',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[salesTeam,tenant]);
  await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://healthcare.invalid','sales_binh','Synthetic Sales',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[sellerAccount]);
  await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','sales',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id(22),tenant,sellerAccount]);
  await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[seller,tenant,id(22)]);
  await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[tenant,seller,role]);await ds.query('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,salesTeam,seller]);
  await ds.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,team_id,service_actor_id,credential_hash) VALUES (?,?,'mock_messenger','healthcare',?,?,?)",[connection,tenant,team,service,createHash('sha256').update(token).digest('hex')]);
  sales=new SalesHandoffs(ds);
  expect((await ds.query('SELECT UTC_TIMESTAMP() now'))[0].now.toISOString()).toBe(instant.replace('Z','.000Z'));
 });
 async function start(alias:string,opening:string,ad?:string){await receive(alias,1,'Synthetic service',ad);at(opening);await ds.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'message.sent',1,'conversation',?,1,JSON_OBJECT(),'historical-healthcare','human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'dispatched')",[randomUUID(),tenant,fixtures[alias]!.conversation,human]);}
 async function completeHuman(alias:string){
  const f=fixtures[alias]!,[c]=await ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,f.conversation]);
  const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));const leads=new LeadService(new CrmRecords(ds,'synthetic',domains),contactReferences);
  const lead=(await leads.create(account,tenant,{contact_id:c.contact_id},randomUUID(),'synthetic')).body.data;f.lead=lead.id;
  await leads.command(account,tenant,lead.id,'qualification',{qualification:{service_interest:'Synthetic service',need_summary:'Synthetic administrative need',preferred_contact_method:'messenger',contact_permission:true,consent_evidence:{kind:'manual',note:'Synthetic explicit consent'}}},randomUUID(),lead.version,'synthetic');
 }
 async function handoff(alias:string){const f=fixtures[alias]!,[r]=await ds.query('SELECT version FROM crm_record WHERE tenant_id=? AND id=?',[tenant,f.lead]);await sales.mutate(account,tenant,f.lead!,undefined,{target_team_id:salesTeam},randomUUID(),String(r.version),'synthetic');}
 async function accept(alias:string){const f=fixtures[alias]!,h=(await sales.read(sellerAccount,tenant,f.lead!)).data[0]!;await sales.mutate(sellerAccount,tenant,f.lead!,h.handoff_id,{owner_revision:h.owner_revision},randomUUID(),h.version,'synthetic');}
 it('historical healthcare cohort with current Human qualification and Sales handoff',async()=>{
  at('03:00:00');await start('a','03:00:30','ad-fixture-01');at('03:01:00');fixtures.a!.messages.push((await receive('a',2,'Synthetic administrative need')).r.message_id!);at('03:02:00');fixtures.a!.messages.push((await receive('a',3,'đồng ý')).r.message_id!);at('03:05:00');await completeHuman('a');at('03:06:00');await handoff('a');at('03:10:00');await accept('a');
  at('03:20:00');await start('b','03:20:30','ad-fixture-01');at('03:21:00');await receive('b',2,'không đồng ý');

  at('03:50:00');await start('c','03:50:30','ad-fixture-02');at('03:51:00');await receive('c',2,'Synthetic administrative need');at('03:52:00');await receive('c',3,'messenger');at('03:53:00');await receive('c',4,'đồng ý');at('04:00:00');await completeHuman('c');at('04:01:00');await handoff('c');
  at('04:50:00');await start('d','04:50:30');at('04:51:00');fixtures.d!.messages.push((await receive('d',2,'Synthetic administrative need')).r.message_id!);at('04:52:00');fixtures.d!.messages.push((await receive('d',3,'đồng ý')).r.message_id!);at('05:00:00');await completeHuman('d');at('05:01:00');await handoff('d');at('05:03:00');await accept('d');
  for(const f of Object.values(fixtures).filter(f=>f.lead))await ds.query('UPDATE `lead` SET conversation_id=? WHERE tenant_id=? AND record_id=?',[f.conversation,tenant,f.lead]);
  expect(await ds.query('SELECT record_id FROM conversation WHERE tenant_id=?',[tenant])).toHaveLength(4);expect(await ds.query('SELECT id FROM workflow_run WHERE tenant_id=?',[tenant])).toHaveLength(0);expect(await ds.query('SELECT record_id FROM `lead` WHERE tenant_id=?',[tenant])).toHaveLength(3);expect((await ds.query('SELECT lifecycle FROM contact WHERE tenant_id=?',[tenant])).every((c:any)=>c.lifecycle==='prospect')).toBe(true);
 },30000);
 it('persisted KPI baseline and historical qualification owner survive Sales transfer',async()=>{
  const result=await metrics();console.log('SRC-023 KPI',JSON.stringify(result));expect(result).toMatchObject({inbound_messages:12,new_conversations:4,unique_contacts:4,ctm_conversations:3,qualified_leads:3,ctm_to_qualified:2/3,lead_acceptance_rate:2/3,handoff_pending:1,handoff_acceptance_median_seconds:180,handoff_acceptance_p95_seconds:234,first_response_median_seconds:30,first_response_pending:0,qualification_by_owner:{[human]:3},acceptance_by_owner:{[seller]:2},customer_conversion:null});
 });
 it('empty window and isolated tenant have null ratios; as_of excludes later outcomes',async()=>{
  expect(await metrics(tenant,from,to,from)).toMatchObject({inbound_messages:1,new_conversations:1,ctm_conversations:1,qualified_leads:0,first_response_pending:1});
  expect(await metrics(beta)).toMatchObject({inbound_messages:0,new_conversations:0,ctm_to_qualified:null,lead_acceptance_rate:null,first_response_median_seconds:null});
  expect(await metrics(tenant,new Date('2026-10-03T03:00:00Z'),new Date('2026-10-04T03:00:00Z'),new Date('2026-10-04T03:00:00Z'))).toMatchObject({qualified_leads:0,ctm_to_qualified:null});
  expect(await metrics(tenant,from,to,new Date('2026-10-02T03:07:00Z'))).toMatchObject({inbound_messages:3,new_conversations:1,qualified_leads:1,ctm_to_qualified:1,lead_acceptance_rate:0,handoff_pending:1,handoff_acceptance_median_seconds:null});
 });
 it('association fan-out and late CTM on existing non-CTM cohort do not rewrite the snapshot',async()=>{
  const baseline=await metrics();
  const [contactType]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'",[tenant]),[leadType]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='lead'",[tenant]);
  await ds.query("INSERT INTO association_type(id,tenant_id,`key`,label,source_object_type_id,target_object_type_id,cardinality,created_at,updated_at) VALUES (?,?,'fixture_links','Synthetic links',?,?,'many_to_many',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id(40),tenant,contactType.id,leadType.id]);
  const contacts=await ds.query('SELECT record_id FROM contact WHERE tenant_id=?',[tenant]);
  for(const c of contacts)for(const f of Object.values(fixtures).filter(f=>f.lead))await ds.query('INSERT INTO association(id,tenant_id,association_type_id,source_record_id,target_record_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[randomUUID(),tenant,id(40),c.record_id,f.lead]);
  expect(await metrics()).toEqual(baseline);
  instant='2026-10-03T03:00:00Z';await receive('d',4,'Synthetic late follow-up','late-ad');
  expect(await metrics()).toEqual({...baseline,ctm_conversations:4,ctm_to_qualified:3/4});
  // At the exclusive window end this is not an inbound in the window, but is known at as_of.
  expect(await metrics(tenant,from,to,new Date('2026-10-03T02:59:59Z'))).toEqual({...baseline,as_of:'2026-10-03T02:59:59.000Z'});
  instant='2026-10-03T03:01:00Z';await receive('a',4,'Synthetic later follow-up','later-ad');
  expect((await metrics()).inbound_messages).toBe(12);
  await expect(metrics(tenant,to,from)).rejects.toThrow('INVALID_METRIC_WINDOW');
 });
 it('manual Sales merge keeps its own history policy without legacy Chat source',async()=>{
  const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));const records=new CrmRecords(ds,'synthetic-merge-guard',domains),leads=new LeadService(records,contactReferences);
  const create=()=>leads.create(account,tenant,{contact_id:fixtures.a!.contact},randomUUID(),'synthetic'),source=(await create()).body.data,target=(await create()).body.data;
  await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...grants,{resource:'lead',action:'archive',scope:'all'}]),tenant,role]);
  try{expect((await new LeadMerge(records).preview(account,tenant,source.id,{target_id:target.id})).data.policy).toBe('retain_target_and_preserve_source_history');}finally{await ds.query('UPDATE role SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(grants),tenant,role]);}
 });
});}
