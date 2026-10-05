import { describe,it,expect } from 'vitest';
import { randomUUID,randomBytes,createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { Chatflows } from '../src/modules/chatflow/application.js';
import { Workflows } from '../src/modules/workflow/application.js';
import { workflowChildren } from '../src/modules/workflow/children.js';
import { Routing } from '../src/modules/agents/routing.js';
import { Conversations } from '../src/modules/conversation/domain.js';
import { MessengerIntake } from '../src/modules/channels/intake.js';
import { MockSender } from '../src/modules/channels/mock-sender.js';
import { OutboundDispatcher } from '../src/modules/conversation/outbound.js';
import { SalesHandoffs } from '../src/modules/sales/handoff.js';
import { tools } from '../src/modules/agents/protocol.js';
import type { Envelope } from '../src/kernel/reliability/delivery.js';
import { healthcareMetrics } from './fixtures/healthcare-metrics.js';

export function healthcareCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-023 healthcare fixture',()=>{
 const id=(n:number)=>`0199ab00-0000-7000-8000-${String(n).padStart(12,'0')}`;
 const tenant=id(1),beta=id(2),account=id(3),human=id(4),ai=id(5),role=id(6),team=id(7),policy=id(8),service=id(9),connection=id(10),salesTeam=id(11),seller=id(12),sellerAccount=id(13);
 const grants=[...['design','publish','operate','read'].map(action=>({resource:'automation',action,scope:'all'})),...['read','reply','update','assign','takeover'].map(action=>({resource:'conversation',action,scope:'all'})),...['create','read','update'].map(action=>({resource:'contact',action,scope:'all'})),...['create','read','qualify','handoff','accept'].map(action=>({resource:'lead',action,scope:'all'})),{resource:'integration',action:'deliver',scope:'all'}];
 const actions=['conversation.read','conversation.reply','contact.read','lead.create','lead.qualify','routing.request_human'];
 let ds:DataSource,app:Chatflows,workflows:Workflows,routing:Routing,conversations:Conversations,intake:MessengerIntake,sales:SalesHandoffs;
 let instant='2026-10-02T02:00:00Z';const at=(time:string)=>{instant=`2026-10-02T${time}Z`;};
 const token=randomBytes(32).toString('hex'),bearer=`Bearer ${token}`;
 const from=new Date('2026-10-02T03:00:00Z'),to=new Date('2026-10-03T03:00:00Z');
 const metrics=(t=tenant,f=from,e=to,a=to)=>healthcareMetrics(ds,t,f,e,a);
 const fixtures:Record<string,{conversation:string;session:string;run:string;lead?:string;messages:string[]}>={};
 async function flowStep(){const claims=await workflows.engine.claim();for(const c of claims){await workflows.engine.effect(c);await workflows.engine.finish(c);}}
 async function chatStep(){for(const c of await app.engine.claim())await app.engine.step(c);}
 async function receive(alias:string,index:number,text:string,referral?:string){
  const body={provider_event_id:`${alias}-event-${index}`,provider_message_id:`${alias}-message-${index}`,external_subject_id:alias,occurred_at:instant,display_label:'Synthetic healthcare',message:{type:'text',text},...(referral?{referral:{source:'ctm',ad_id:referral}}:{})};
  const ack=await intake.accept(connection,bearer,body,'healthcare-fixture');for(const c of await intake.claim())await intake.process(c);
  const r=await intake.readCredential(connection,bearer,ack.data.delivery_id);return {body,ack,r};
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
  app=new Chatflows(ds);workflows=new Workflows(ds,workflowChildren(ds));routing=new Routing(ds);conversations=new Conversations(ds,'synthetic');intake=new MessengerIntake(ds,conversations);sales=new SalesHandoffs(ds);
  expect((await ds.query('SELECT UTC_TIMESTAMP() now'))[0].now.toISOString()).toBe(instant.replace('Z','.000Z'));
 });
 async function configure(short:boolean){
  await ds.query('UPDATE workflow_definition SET enabled=0 WHERE tenant_id=?',[tenant]);
  const collect=(key:string,variable:string,type:string,next:string,choices?:string[])=>({key,type:'collect',config:{variable_key:variable,value_type:type,required:true,prompt:'Synthetic administrative question',...(choices?{choices}:{})},next});
  const graph={entry_node:'interest',nodes:[collect('interest','service_interest','string',short?'consent':'need'),...short?[]:[collect('need','need_summary','string','method'),collect('method','preferred_contact_method','enum','consent',['messenger','phone'])],collect('consent','contact_permission','boolean','validate'),{key:'validate',type:'validate_qualification',config:{on_valid:'lead',on_invalid:'human'}},{key:'lead',type:'upsert_lead',config:{},next:'end'},{key:'human',type:'request_human',config:{reason:'qualification_incomplete',target_chat_team:team},next:'end'},{key:'end',type:'end',config:{outcome:'qualified'}}]};
  const name=short?'refusal':'qualification';const d=String((await app.mutate(account,tenant,'create',{key:name,name:'Synthetic healthcare'},randomUUID(),'synthetic')).body.data.id);
  const v=String((await app.mutate(account,tenant,'version',{graph},randomUUID(),'synthetic',d)).body.data.id);await app.mutate(account,tenant,'publish',{},randomUUID(),'synthetic',d,1,'1');
  const wg={trigger:{event_type:'conversation.created',connection_id:connection},entry_node:'route',nodes:[{key:'route',type:'assign_owner',config:{record_id:{ref:'trigger.aggregate_id'},team_id:team,capability:'chat',preference:'ai'},next:'start'},{key:'start',type:'start_chatflow',config:{conversation_id:{ref:'trigger.aggregate_id'},chatflow_version_id:v},next:'wait'},{key:'wait',type:'wait_event',config:{event_type:'chatflow.completed',match_key:{ref:'outputs.start.session_id'},timeout_seconds:3600},next:'qualified',on_timeout:'end'},{key:'qualified',type:'condition',config:{left:{ref:'outputs.wait.outcome'},op:'eq',right:'qualified',on_true:'handoff',on_false:'end'}},{key:'handoff',type:'request_lead_handoff',config:{lead_id:{ref:'outputs.wait.lead_id'},target_team_id:salesTeam},next:'sale'},{key:'sale',type:'wait_event',config:{event_type:'lead.accepted',match_key:{ref:'outputs.handoff.handoff_id'},timeout_seconds:900},next:'end',on_timeout:'end'},{key:'end',type:'end',config:{outcome:'done'}}]};
  const w=String((await workflows.mutate(account,tenant,'create',{key:name,name:'Synthetic healthcare',service_actor_id:service},randomUUID(),'synthetic')).body.data.id);await workflows.mutate(account,tenant,'version',{graph:wg,execution_role_id:role},randomUUID(),'synthetic',w);await workflows.mutate(account,tenant,'publish',{},randomUUID(),'synthetic',w,1,'1');await workflows.mutate(account,tenant,'enable',{enabled:true},randomUUID(),'synthetic',w,undefined,'2');
 }
 async function start(alias:string,opening:string,ad?:string){
  const first=await receive(alias,1,'Synthetic service',ad),cid=first.r.conversation_id!;
  const [e]=await ds.query("SELECT * FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='conversation.created'",[tenant,cid]);
  const event={event_id:e.id,tenant_id:tenant,event_type:e.event_type,schema_version:1,aggregate_id:cid,data:typeof e.payload==='string'?JSON.parse(e.payload):e.payload,correlation_id:e.correlation_id} as Envelope;
  await workflows.engine.uow.run({tenantId:tenant},s=>workflows.engine.start(s,event));await workflows.engine.uow.run({tenantId:tenant},s=>workflows.engine.start(s,event));
  await flowStep();await flowStep();await flowStep();const [r]=await ds.query('SELECT id,parent_run_id FROM chatflow_session WHERE conversation_id=?',[cid]);
  fixtures[alias]={conversation:cid,session:r.id,run:r.parent_run_id,messages:[first.r.message_id!]};await chatStep();await chatStep();
  at(opening);const intents=await ds.query("SELECT id FROM outbound_intent WHERE conversation_id=? AND status='queued'",[cid]);expect(intents).toHaveLength(1);await new OutboundDispatcher(ds,new MockSender(ds)).dispatch(tenant,cid,intents[0].id);
  if(alias==='a'){expect((await intake.accept(connection,bearer,first.body,'synthetic')).data).toEqual(first.ack.data);const ack=await intake.accept(connection,bearer,{...first.body,provider_event_id:'a-replay-other-event'},'synthetic');for(const c of await intake.claim())await intake.process(c);expect((await intake.readCredential(connection,bearer,ack.data.delivery_id)).duplicate).toBe(true);}
 }
 async function completeHuman(alias:string){const f=fixtures[alias]!,[c]=await ds.query('SELECT version FROM crm_record WHERE id=?',[f.conversation]);await routing.mutate(account,tenant,f.conversation,true,{reason:'human_takeover'},randomUUID(),String(c.version),'synthetic');const [s]=await ds.query('SELECT version FROM chatflow_session WHERE id=?',[f.session]),[owner]=await ds.query('SELECT owner_revision FROM crm_record WHERE id=?',[f.conversation]);await app.mutate(account,tenant,'complete',{qualification:{service_interest:'Synthetic service',need_summary:'Synthetic administrative need',preferred_contact_method:'messenger',contact_permission:true},consent_message_id:f.messages.at(-1),owner_revision:String(owner.owner_revision)},randomUUID(),'synthetic',f.session,undefined,String(s.version));}
 async function handoff(alias:string){const f=fixtures[alias]!;await workflows.engine.uow.run({tenantId:tenant},s=>workflows.engine.wake(s,f.run));await flowStep();await flowStep();await flowStep();const [l]=await ds.query('SELECT record_id FROM `lead` WHERE qualification_session_id=?',[f.session]);f.lead=l.record_id;}
 async function accept(alias:string){const f=fixtures[alias]!,h=(await sales.read(sellerAccount,tenant,f.lead!)).data[0]!;await sales.mutate(sellerAccount,tenant,f.lead!,h.handoff_id,{owner_revision:h.owner_revision},randomUUID(),h.version,'synthetic');await workflows.engine.uow.run({tenantId:tenant},s=>workflows.engine.wake(s,f.run));await flowStep();}
 it('real intake → pinned flows → Human/AI qualification → Sales; refusal and missing referral',async()=>{
  await configure(false);at('03:00:00');await start('a','03:00:30','ad-fixture-01');at('03:01:00');fixtures.a!.messages.push((await receive('a',2,'Synthetic administrative need')).r.message_id!);at('03:02:00');fixtures.a!.messages.push((await receive('a',3,'đồng ý')).r.message_id!);at('03:05:00');await completeHuman('a');at('03:06:00');await handoff('a');at('03:10:00');await accept('a');
  await configure(true);at('03:20:00');await start('b','03:20:30','ad-fixture-01');at('03:21:00');await receive('b',2,'không đồng ý');await chatStep();await workflows.engine.uow.run({tenantId:tenant},s=>workflows.engine.wake(s,fixtures.b!.run));await flowStep();await flowStep();
  // Re-enable the immutable qualification definition rather than mutating published versions.
  await ds.query('UPDATE workflow_definition SET enabled=(`key`=?) WHERE tenant_id=?',['qualification',tenant]);
  at('03:50:00');await start('c','03:50:30','ad-fixture-02');at('03:51:00');await receive('c',2,'Synthetic administrative need','ad-fixture-02');await chatStep();at('03:52:00');await receive('c',3,'messenger');await chatStep();at('03:53:00');await receive('c',4,'đồng ý');await chatStep();at('04:00:00');await chatStep();await chatStep();await chatStep();at('04:01:00');await handoff('c');
  at('04:50:00');await start('d','04:50:30');at('04:51:00');fixtures.d!.messages.push((await receive('d',2,'Synthetic administrative need')).r.message_id!);at('04:52:00');fixtures.d!.messages.push((await receive('d',3,'đồng ý')).r.message_id!);at('05:00:00');await completeHuman('d');at('05:01:00');await handoff('d');at('05:03:00');await accept('d');
  expect(await ds.query('SELECT record_id FROM conversation WHERE tenant_id=?',[tenant])).toHaveLength(4);expect(await ds.query('SELECT id FROM workflow_run WHERE tenant_id=?',[tenant])).toHaveLength(4);expect(await ds.query('SELECT record_id FROM `lead` WHERE tenant_id=?',[tenant])).toHaveLength(3);expect((await ds.query('SELECT outcome FROM chatflow_session WHERE id=?',[fixtures.b!.session]))[0].outcome).toBe('disqualified');expect((await ds.query('SELECT lifecycle FROM contact WHERE tenant_id=?',[tenant])).every((c:any)=>c.lifecycle==='prospect')).toBe(true);
 });
 it('persisted KPI baseline and historical qualification owner survive Sales transfer',async()=>{
  const result=await metrics();console.log('SRC-023 KPI',JSON.stringify(result));expect(result).toMatchObject({inbound_messages:12,new_conversations:4,unique_contacts:4,ctm_conversations:3,qualified_leads:3,ctm_to_qualified:2/3,lead_acceptance_rate:2/3,handoff_pending:1,handoff_acceptance_median_seconds:180,handoff_acceptance_p95_seconds:234,first_response_median_seconds:30,first_response_pending:0,qualification_by_owner:{[human]:2,[ai]:1},acceptance_by_owner:{[seller]:2},customer_conversion:null});
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
});}
