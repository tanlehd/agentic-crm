// T02 design model only. Never opens a database or applies DDL.
import {readFileSync} from 'node:fs';
export const systemTenant='01900000-0000-7000-8000-000000000001';
export const source=JSON.parse(readFileSync('docs/data/chat-extraction/source-v42.json','utf8'));
export const catalog=JSON.parse(readFileSync('docs/architecture/chat-owner-operations.json','utf8'));
const uuid='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin';
const ascii=n=>`VARCHAR(${n}) CHARACTER SET ascii COLLATE ascii_bin`;
const uint='BIGINT UNSIGNED', time='DATETIME(6)';
const col=(name,type,meaning,nullable=false)=>({name,type,meaning,nullable});
const id=(name,meaning,nullable=false)=>col(name,uuid,meaning,nullable);
const num=(name,meaning)=>col(name,uint,meaning);
const txt=(name,n,meaning,nullable=false)=>col(name,ascii(n),meaning,nullable);
const digest=(name,meaning,nullable=false)=>col(name,hash,meaning,nullable);
const json=(name,meaning,nullable=false)=>col(name,'JSON',meaning,nullable);
const stamp=(name,meaning,nullable=false)=>col(name,time,meaning,nullable);
const common=[num('version','CAS revision; positive, never reset'),stamp('created_at','UTC creation instant'),stamp('updated_at','UTC last local commit')];
export const owners={chat:'crm_chat',crm:'crm_core',connector:'crm_connector',identity:'crm_identity',routing:'crm_routing',sales:'crm_sales','ai-runtime':'crm_ai',workflow:'crm_workflow',reporting:'crm_reporting'};
export const prefix=o=>o.replaceAll('-','_');
export const additions=[];
function table(owner,suffix,purpose,columns,pk,options={}){
 const name=owner==='chat'&&suffix==='schema_migration'?suffix:`${prefix(owner)}_${suffix}`;
 const t={owner,schema:owners[owner],name,purpose,scope:'business',kind:'source of truth',columns:[id('tenant_id','Authenticated business tenant; never a default/system fallback'),...columns],pk:['tenant_id',...pk],unique:[],indexes:[],checks:[],...options};
 if(t.scope==='system')t.columns[0].meaning='Explicit registered platform system tenant; never business API context or default';
 t.checks.push(t.scope==='system'?`tenant_id = '${systemTenant}'`:`tenant_id <> '${systemTenant}' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`);
 if(t.columns.some(c=>c.name==='version'))t.checks.push('version >= 1');
 additions.push(t);return t;
}
table('chat','schema_migration','Own schema lineage, not copied baseline journal',[
 col('version','INT UNSIGNED','Chat DDL version'),txt('name',128,'Migration artifact name'),digest('checksum','SHA256 exact migration bytes'),txt('state',16,'started/applied/failed'),stamp('started_at','UTC operator start'),stamp('applied_at','UTC verified completion',true),txt('error_code',64,'Sanitized failure category',true)
],['version'],{scope:'system',checks:["state IN ('started','applied','failed')"],kind:'immutable ledger'});

// Every owner with command-proof needs the same durable prepare/abort representation.
// Identity uses admission/gates instead and retains its native delegation/quota records.
for(const owner of Object.keys(owners).filter(o=>o!=='identity')){
 table(owner,'owner_command','Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant',[
 id('command_id','Owner command UUID, including pre-prepare abort key'),txt('operation',160,'Exact T01 operation; null only for pre-prepare abort',true),digest('binding_digest','T01 canonical binding digest'),txt('actor_kind',16,'human/ai/service/app/system; null only for pre-prepare abort',true),id('actor_id','Logical Identity actor; null only for pre-prepare abort',true),id('delegation_id','Logical Identity delegation',true),
 txt('resource_kind',64,'Registered kind; null only for pre-prepare abort',true),id('resource_id','Aggregate ID; null only for pre-prepare abort',true),col('record_version',uint,'Expected version; null only for pre-prepare abort',true),col('owner_revision',uint,'Expected owner revision; null only for pre-prepare abort',true),col('control_revision',uint,'Expected control revision; null only for pre-prepare abort',true),
 txt('legacy_route',512,'Exact legacy route key, no alias rewriting',true),txt('legacy_key',128,'Exact caller receipt key',true),digest('legacy_request_hash','Original body/version hash, not new binding digest',true),
 json('binding_json','OwnerCommandBinding v1 strict schema; immutable fields/pins/digests, max256KiB',true),json('request_json','Immutable exact operation input for recovery; null only for abort-before-prepare or legacy terminal import; max256KiB',true),json('result_json','Operation-specific strict response; private encrypted storage, max256KiB',true),id('admission_id','Identity admission logical reference',true),
 txt('state',16,'prepared/committed/aborted'),digest('terminal_digest','Immutable terminal proof hash',true),stamp('terminal_at','UTC terminal commit',true),...common
 ],['command_id'],{indexes:[['state','updated_at','tenant_id','command_id'],['tenant_id','actor_id','state','command_id']],checks:["state IN ('prepared','committed','aborted')","(state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)","state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)","binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144","request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144","result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144"]});
 table(owner,'owner_dependency','Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown',[
 id('command_id','Local parent command'),txt('slot',64,'Operation-fixed slot; not caller-controlled'),txt('remote_owner',32,'Authenticated owner'),id('remote_command_id','Stable child UUID derived from permanent child key'),txt('child_key',255,'Exact parent-command:note:v1 or need-recovery:<need> etc'),digest('binding_digest','Parent core digest'),id('receipt_id','Remote reservation/admission/result ID',true),
 txt('state',16,'prepared/pending/committed/aborted/released'),json('request_json','Strict child operation input; max256KiB'),json('proof_json','Strict authenticated terminal proof; max256KiB',true),num('remote_revision','Monotonic remote resource revision'),stamp('next_attempt_at','UTC durable recovery schedule'),id('lease_token','Worker claim UUID',true),stamp('lease_until','Transport scheduling lease only',true),...common
 ],['command_id','slot'],{unique:[['tenant_id','remote_owner','child_key']],indexes:[['state','next_attempt_at','tenant_id','command_id']],checks:["state IN ('prepared','pending','committed','aborted','released')","JSON_STORAGE_SIZE(request_json)<=262144","proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144"]});
 table(owner,'owner_selection','Immutable per-row policy context for admitted bounded read; result snapshot is never permission',[
 id('command_id','Local prepared read'),col('ordinal','SMALLINT UNSIGNED','Candidate position 0..99'),txt('resource_kind',64,'Object type'),id('resource_id','Exact candidate resource'),id('owner_id','Historical local owner at preparation',true),id('team_id','Local team',true),num('record_version','Candidate version'),num('owner_revision','Owner fence'),num('control_revision','Control fence'),json('context_json','Strict T01 ResourceContext fields/shares; max256KiB'),digest('candidate_digest','Immutable page selection hash')
 ],['command_id','ordinal'],{kind:'immutable ledger',checks:['ordinal < 100','JSON_STORAGE_SIZE(context_json)<=262144']});
}

// Only actual T01 producers get a subscription ledger; other owners keep existing
// child/job ledgers and do not acquire an unused event stream table.
for(const owner of ['chat','crm','identity','workflow','sales']){
 table(owner,'event_stream','Per-tenant subscriber stream, ACK and replay low-watermark',[
 txt('consumer_name',128,'Exact registered consumer'),txt('aggregate_type',64,'Stream aggregate kind'),id('aggregate_id','Stream aggregate ID'),num('next_sequence','Next allocated sequence, starting at1'),num('acked_through','Contiguous consumer ACK high-watermark'),num('retained_from','Earliest replayable sequence'),digest('registration_digest','Versioned type/version/caller allowlist digest'),...common
 ],['consumer_name','aggregate_type','aggregate_id'],{checks:['next_sequence >= 1','retained_from >= 1','acked_through < next_sequence','retained_from <= next_sequence']});
 table(owner,'event_delivery','Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved',[
 txt('consumer_name',128,'Owning stream subscriber'),txt('aggregate_type',64,'Stream aggregate kind'),id('aggregate_id','Stream aggregate ID'),num('sequence','Stream-local positive order'),id('event_id','Original producer outbox event'),digest('event_digest','Canonical complete legacy envelope digest'),digest('registration_digest','Immutable subscriber registration at emission'),json('envelope_json','Strict versioned legacy envelope, max256KiB; correlation is opaque'),txt('state',16,'pending/acked/quarantined'),stamp('next_attempt_at','UTC retry due'),num('attempts','Transport retries, not business retries'),id('lease_token','Worker claim UUID',true),stamp('lease_until','UTC scheduler lease',true),stamp('acked_at','UTC authenticated consumer ACK',true),...common
 ],['consumer_name','aggregate_type','aggregate_id','sequence'],{unique:[['tenant_id','consumer_name','event_id']],indexes:[['state','next_attempt_at','tenant_id','consumer_name','sequence']],checks:['sequence >= 1',"state IN ('pending','acked','quarantined')","JSON_STORAGE_SIZE(envelope_json)<=262144","(state='acked') = (acked_at IS NOT NULL)"]});
}
for(const owner of ['chat','crm','identity','routing','ai-runtime','workflow']){
 table(owner,'event_inbox','Authenticated remote envelope and stream offset; no FK to producer database',[
 txt('producer',32,'Verified workload owner, never inferred only from event prefix'),txt('consumer_name',128,'Registered local handler'),id('event_id','Retained event dedup identity'),txt('aggregate_type',64,'Stream aggregate kind'),id('aggregate_id','Stream aggregate ID'),num('sequence','Producer subscription stream position'),digest('event_digest','Immutable envelope digest'),json('envelope_json','Strict versioned envelope, max256KiB'),txt('state',16,'pending/applied/quarantined'),stamp('next_attempt_at','UTC recovery schedule'),num('attempts','Delivery attempts'),id('lease_token','Local worker claim',true),stamp('lease_until','Scheduler lease only',true),stamp('applied_at','UTC effect/inbox commit',true),...common
 ],['producer','consumer_name','event_id'],{unique:[['tenant_id','producer','consumer_name','aggregate_type','aggregate_id','sequence']],indexes:[['state','next_attempt_at','tenant_id','producer','consumer_name']],checks:['sequence >= 1',"state IN ('pending','applied','quarantined')","(state='applied') = (applied_at IS NOT NULL)",'JSON_STORAGE_SIZE(envelope_json)<=262144']});
}
table('chat','control_head','Cumulative Chat registry/control state used by D2; existing owner revision remains in crm_record',[
 id('conversation_id','Local Conversation'),num('registry_revision','Cumulative registry watermark'),num('control_revision','Current cancellation generation'),num('cancel_through','Cumulative cancelled generation'),num('pause_through','Cumulative paused generation'),...common
],['conversation_id'],{checks:['registry_revision >= 1','control_revision >= 1','cancel_through < control_revision','pause_through < control_revision']});
table('chat','dataset_head','Tenant fact watermark changed in every relevant local fact/registry transaction',[
 txt('dataset',32,'conversion/stage/progress/routing/registry'),num('revision','Monotonic dataset watermark'),...common
],['dataset'],{checks:["dataset IN ('conversion','stage','progress','routing','registry')"]});
table('chat','contact_guard','Contact archive tombstone/closing fence; protects every delayed ingress and reopen',[
 id('contact_id','Core Contact logical reference'),id('archive_command_id','Core archive command'),digest('binding_digest','Archive binding'),txt('state',16,'closing/archived/released'),num('core_revision','Core terminal revision'),...common
],['contact_id'],{checks:["state IN ('closing','archived','released')"]});
table('chat','report_snapshot','Temporary immutable report candidate and source watermark; no authority cache',[
 id('snapshot_id','Snapshot UUID'),id('command_id','Prepared command'),txt('dataset',32,'Fact kind'),num('watermark','Head observed at prepare'),digest('query_digest','Authorized query binding'),digest('snapshot_digest','Ordered immutable page hashes'),num('row_count','Complete bounded fact count'),col('page_count','INT UNSIGNED','Complete number of pages'),txt('state',16,'prepared/released'),stamp('expires_at','Prepare+5minutes; reclaim only after admission settles'),...common
],['snapshot_id'],{unique:[['tenant_id','command_id']],indexes:[['state','expires_at','tenant_id','snapshot_id']],checks:["state IN ('prepared','released')"]});
table('chat','report_page','Immutable bounded report facts; payload discarded after release, digest remains in snapshot',[
 id('snapshot_id','Local snapshot'),col('page_number','INT UNSIGNED','Zero-based page'),col('row_count','SMALLINT UNSIGNED','Rows in this page'),json('facts_json','Strict producer fact DTO array; max100 rows/max256KiB; no transcript'),digest('page_digest','Canonical fact page hash')
],['snapshot_id','page_number'],{kind:'rebuildable projection',checks:['row_count <= 100','JSON_STORAGE_SIZE(facts_json)<=262144']});
table('identity','owner_admission','Non-send admission tied to one owner command; active rows block revoke completion',[
 id('id','Admission UUID'),txt('owner_service',32,'Command owner'),id('command_id','Remote prepared command'),digest('binding_digest','Remote prepared binding'),id('account_id','System account logical/native reference',true),id('session_id','Native session',true),id('principal_id','Business principal',true),id('app_id','Native private app',true),id('delegation_id','Existing delegation',true),num('auth_revision','Pinned authorization revision'),num('gate_revision','Business gate at admission'),txt('state',16,'admitted/committed/aborted'),json('allowed_fields','Strict admitted field list; no transcript'),digest('terminal_digest','Authenticated owner terminal proof',true),stamp('settled_at','UTC terminal settlement',true),...common
],['id'],{unique:[['tenant_id','owner_service','command_id']],indexes:[['tenant_id','state','id'],['account_id','state','tenant_id','id']],checks:["state IN ('admitted','committed','aborted')","(state='admitted' AND terminal_digest IS NULL AND settled_at IS NULL) OR (state<>'admitted' AND terminal_digest IS NOT NULL AND settled_at IS NOT NULL)"]});
table('identity','owner_gate','Conservative whole-business-tenant revoke gate; closes new admissions before drain',[
 id('barrier_id','Current durable revoke operation'),txt('state',16,'open/closing'),id('delegation_id','Original barrier requester',true),digest('request_digest','Idempotent revoke input'),...common
],[],{checks:["state IN ('open','closing')"]});
table('identity','account_gate','System account-wide revoke gate closes before enumerating business admissions',[
 id('account_id','Native system account'),id('barrier_id','Reset/logout-all operation'),txt('state',16,'open/closing'),digest('request_digest','Original revoke request'),...common
],['account_id'],{scope:'system',checks:["state IN ('open','closing')"]});
for(const scope of ['business','system'])table('identity',scope==='business'?'owner_barrier':'account_barrier','Durable revoke operation/status history; current gate may advance without erasing old completion',[
 id('barrier_id','Stable revoke UUID'),id('account_id','Affected native account; null for tenant policy',true),id('delegation_id','Original requester delegation',true),digest('request_digest','Canonical nonsecret revoke/policy intent digest'),json('request_json','Sanitized policy/revoke intent and security revision references; never password, token or credential material'),txt('state',16,'closing/completed'),stamp('completed_at','UTC drain completion',true),...common
],['barrier_id'],{scope,checks:["state IN ('closing','completed')","(state='completed') = (completed_at IS NOT NULL)",'JSON_STORAGE_SIZE(request_json)<=262144']});
for(const owner of ['crm','connector']){
 table(owner,'reference_gate','Owner resource revision/retirement barrier for Contact, mapping, metadata or channel',[
 txt('resource_kind',32,'contact/identity/schema/connection'),id('resource_id','Owner canonical resource'),num('resource_revision','Pinned canonical revision'),txt('state',16,'open/closing/retired'),id('barrier_command_id','Retirement command',true),...common
 ],['resource_kind','resource_id'],{checks:["state IN ('open','closing','retired')"]});
 table(owner,'reference_reservation','Durable liveness reservation, released only on terminal caller proof',[
 id('id','Reservation UUID'),txt('caller_owner',32,'Authenticated command owner'),id('command_id','Caller command'),digest('binding_digest','Caller prepared core'),txt('resource_kind',32,'Local gate kind'),id('resource_id','Local gate resource'),num('resource_revision','Reserved revision'),txt('state',16,'held/released'),digest('terminal_digest','Caller terminal proof',true),...common
 ],['id'],{unique:[['tenant_id','caller_owner','command_id','resource_kind','resource_id']],indexes:[['tenant_id','resource_kind','resource_id','state','id']],checks:["state IN ('held','released')","(state='released') = (terminal_digest IS NOT NULL)"]});
}
table('routing','capacity_reservation','Pending capacity is counted until terminal Chat confirmation/release; no TTL',[
 id('id','Reservation UUID'),id('command_id','Chat command'),digest('binding_digest','Chat prepared core'),id('conversation_id','Chat thread'),id('session_id','Chat episode'),id('principal_id','Target; null for unassigned',true),id('queue_id','Pinned queue',true),num('queue_version','Queue version'),num('profile_version','Target profile revision'),num('owner_revision','Expected/new Chat owner fence'),txt('mode',16,'managed/not-managed/unassign/close'),txt('state',16,'reserved/confirmed/released'),digest('terminal_digest','Chat terminal proof',true),...common
],['id'],{unique:[['tenant_id','command_id']],indexes:[['tenant_id','principal_id','state','id'],['tenant_id','session_id','owner_revision']],checks:["mode IN ('managed','not-managed','unassign','close')","state IN ('reserved','confirmed','released')"]});
table('routing','allocation_head','Monotonic Chat owner revision/terminal allocation tombstone; coordinates existing work/allocation tables',[
 id('session_id','Chat session logical reference'),id('conversation_id','Chat thread'),id('principal_id','Confirmed owner',true),id('reservation_id','Latest reservation',true),num('owner_revision','Highest applied Chat revision'),txt('state',16,'active/closed/unassigned'),...common
],['session_id'],{indexes:[['tenant_id','principal_id','state','session_id']],checks:["state IN ('active','closed','unassigned')"]});
table('routing','capacity_gate','Queue/profile/skills configuration drain barrier; conservative whole-tenant gate',[
 id('barrier_command_id','Routing config operation'),txt('state',16,'open/closing'),...common
],[],{checks:["state IN ('open','closing')"]});
table('sales','outcome_gate','Per-need/session outcome serialization and durable recovery reservation; absence is fenced',[
 id('need_id','Chat original need'),id('session_id','Chat original episode'),id('conversation_id','Chat thread'),num('outcome_revision','Latest Sales outcome revision'),id('command_id','Chat recovery command',true),digest('binding_digest','Recovery binding',true),txt('state',16,'open/held/released'),digest('terminal_digest','Chat terminal proof',true),...common
],['need_id','session_id'],{checks:["state IN ('open','held','released')"]});
for(const owner of ['crm','ai-runtime','workflow'])table(owner,'chat_projection','Minimized cumulative Chat registry/control projection; never permission or a second writer',[
 id('conversation_id','Chat thread'),num('registry_revision','Highest accepted Chat registry revision'),num('control_revision','Current observed generation'),num('cancel_through','Cumulative cancellation'),num('pause_through','Cumulative pause'),digest('snapshot_digest','Equal revision must have identical snapshot'),json('snapshot_json','Strict Chat RegistrySnapshot v1, max16KiB; no transcript/rights'),stamp('observed_at','UTC authenticated observation'),...common
],['conversation_id'],{kind:'rebuildable projection',checks:['registry_revision >= 1','control_revision >= 1','cancel_through < control_revision','pause_through < control_revision','JSON_STORAGE_SIZE(snapshot_json)<=16384']});
for(const owner of ['ai-runtime','workflow'])table(owner,'chat_work_binding','Retained execution/node generation pin; lease acquisition serializes with local cumulative Chat projection',[
 id('work_id','Existing execution/run/node ID'),txt('work_kind',32,'execution/node/run'),txt('attempt_key',128,'Exact pinned attempt identity; new key on explicit resume'),id('conversation_id','Chat thread'),id('session_id','Chat episode',true),id('graph_version_id','Existing pinned graph/version',true),num('owner_revision','Original admitted owner fence'),num('control_revision','Proved admitted generation'),txt('state',16,'pinned/paused/cancelled/terminal'),...common
],['work_id','attempt_key'],{indexes:[['tenant_id','conversation_id','control_revision','state','work_id']],checks:['control_revision >= 1',"state IN ('pinned','paused','cancelled','terminal')"]});
table('chat','writer_gate','Local startup/write epoch fence; only migration operator changes mode',[
 num('epoch','Monotonic deployment epoch'),txt('mode',16,'disabled/shadow/active/frozen'),digest('manifest_digest','Signed-off migration manifest digest'),stamp('updated_at','UTC operator transition')
],[],{checks:["mode IN ('disabled','shadow','active','frozen')"]});
table('chat','migration_run','Retained business-tenant migration checkpoint, explicit environment identity and validation evidence',[
 id('run_id','Migration UUID'),digest('manifest_digest','Design+source+binary+partition manifest hash'),digest('snapshot_digest','Encrypted immutable export index hash'),txt('source_identity',255,'Instance UUID/schema/version, no credentials'),txt('destination_identity',255,'Instance UUID/schema/lineage'),txt('source_watermark',255,'Fenced snapshot/binlog position or explicit unavailable'),txt('state',16,'exporting/copying/validated/active/frozen'),num('writer_epoch','Activation epoch'),...common
],['run_id'],{checks:["state IN ('exporting','copying','validated','active','frozen')"]});
table('chat','migration_chunk','Durable replayable import checkpoint committed with exact rows; never update past unverified differences',[
 id('run_id','Local migration run'),txt('table_name',64,'Allowlisted target table'),col('chunk_number','INT UNSIGNED','Ordered stable PK chunk'),json('last_key','Typed ordered PK tuple; max4KiB'),num('row_count','Rows in immutable chunk'),digest('source_hash','Canonical original row hash'),digest('target_hash','Readback hash'),txt('state',16,'copied/validated'),stamp('updated_at','UTC commit')
],['run_id','table_name','chunk_number'],{checks:["state IN ('copied','validated')",'JSON_STORAGE_SIZE(last_key)<=4096']});

export const purposes={
 chat_claim_request:'D2 claim request digest replay identity',chat_dispatch_claim:'D2 immutable intent/attempt/grant claim proof',chat_result_request:'D2 immutable result request digest replay',chat_outbound_job:'Durable D2 orchestration and scheduler lease',chat_inbox:'Saved inbox predicate and creator; never Conversation ACL',chat_inbox_share:'Inbox definition recipients only',chat_read_rollout_conversation:'Retained unread baseline per Conversation',chat_read_rollout_principal:'Retained Human unread rollout enrollment',chat_snippet:'Versioned text snippet catalog',chat_workspace_rollout:'Business-tenant feature rollout checkpoint; not migration journal',conversation:'Thread lifecycle and canonical Contact/connection binding',conversation_acquisition_session:'Immutable episode/source and active-session uniqueness',conversation_activity:'Minimized source reference timeline, not remote note body',conversation_activity_counter:'Per-thread activity sequence allocator',conversation_read_state:'Monotonic per-Human read marker',conversation_snooze:'Deadline overlay; not ownership/lifecycle',conversation_tag:'Versioned tenant tag definitions including archived',conversation_tag_link:'Conversation tag membership',conversation_workspace:'Retained unread/coverage/waiting projection',message:'Original message timeline and outbound state',message_acquisition_membership:'Message to episode resolution',message_content:'Versioned original rich message JSON',message_workspace:'Inbound sequence and reply coverage evidence',need_assessment:'Current need values, Human pins and AI proposal',need_assessment_revision:'Immutable assessment revision history',need_follow_up:'Permanent original-need dedup and recovery episode',outbound_intent:'Durable actor/owner-bound send intent, unknown delivery retained',session_classification:'Episode custom values and version',session_contribution:'Immutable source/version handling evidence',session_milestone_event:'Append-only need milestone correction chain',session_need:'Need identity within episode',session_process_head:'Tenant process publication head',session_process_version:'Immutable pinned process definition',session_progress:'Episode stage/process/version and coverage',session_stage_event:'Immutable stage transition evidence',session_touchpoint:'Immutable Connector touchpoint references',crm_record:'Conversation-only local metadata/owner/version/custom values',ownership_history:'Conversation-only immutable owner/team history',record_team_access:'Conversation-only explicit team shares',property_index_value:'Conversation typed custom-value query index; Core definitions remote',audit_entry:'Chat-owned accepted/denied audit, immutable',idempotency_record:'Exact legacy HTTP receipt identity/expiry/result',outbox_event:'Chat-produced legacy events and scheduler state',consumer_inbox:'Eight Chat handler legacy dedup receipts; producer is logical'
};
export function grants(t){
 const name=t.name;
 if(['schema_migration','chat_migration_run','chat_migration_chunk','chat_writer_gate'].includes(name))return {api:['SELECT'],worker:['SELECT'],migrator:['SELECT','INSERT','UPDATE']};
 if(name==='audit_entry'||name==='ownership_history'||name==='chat_claim_request'||name==='chat_dispatch_claim'||name==='chat_result_request'||/(_revision|_stage_event|_milestone_event|session_contribution|session_process_version|session_touchpoint|owner_selection)$/.test(name))return {api:['SELECT','INSERT'],worker:['SELECT','INSERT'],migrator:['SELECT','INSERT']};
 const deletable=['chat_inbox_share','conversation_tag_link','property_index_value','idempotency_record','chat_report_page'].includes(name);
 return {api:['SELECT','INSERT','UPDATE',...(deletable?['DELETE']:[])],worker:['SELECT','INSERT','UPDATE',...(deletable?['DELETE']:[])],migrator:['SELECT','INSERT','UPDATE']};
}
