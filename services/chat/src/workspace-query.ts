import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef,OwnerResource,OwnerWorkspacePolicy,OwnerReadPredicate,OwnerContactSummary,OwnerConversationPolicy} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,OwnerDomainError,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';

type Query={scope:'all'|'mine'|'unassigned'|'team';team_id?:string;status:string[];snooze:'exclude'|'include'|'only';unread:'any'|'only';channel?:string;channel_id?:string;page_id?:string;tag_ids?:string[];q?:string;sort:'latest_message_desc'|'latest_message_asc'|'waiting_longest';limit:number};
type Position={rank:number;time:string;id:string};
type Channel={channel:'mock_messenger'|'messenger';channel_id:string;page_id:string;channel_name:string;attribution:{source:'unknown'|'ctm';ad_id:string|null;campaign_id:string|null}};
type Peers=RecordPeers&{subject(tenant:string,ref:OwnerCommandRef,admission:string):Promise<{account_id:string}>;policy(tenant:string,ref:OwnerCommandRef,admission:string,resources:OwnerResource[]):Promise<OwnerWorkspacePolicy>;contacts(tenant:string,ref:OwnerCommandRef,admission:string,ids:string[]):Promise<{data:{contact_id:string;summary:OwnerContactSummary|null}[]}>;channels(tenant:string,items:{connection_id:string;conversation_id:string}[]):Promise<{data:{conversation_id:string;metadata:Channel}[]}>};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const stamp=(v:unknown)=>v==null?null:v instanceof Date?v.toISOString():new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
const parse=(v:any):any=>typeof v==='string'?JSON.parse(v):v;
const label=(v:string)=>v.normalize('NFC').toLowerCase();
const fields=['attribution','channel','channel_id','channel_name','page_id','tags','text'];
export function chatWorkspaceQuery(input:Record<string,unknown>):Query{
 const allowed=['scope','team_id','status','snooze','unread','channel','channel_id','page_id','q','sort','limit','cursor','tag_ids'];
 if(Object.keys(input).some(k=>!allowed.includes(k))||Object.values(input).some(v=>typeof v!=='string'&&typeof v!=='number'))ownerFail('INVALID_REQUEST');
 const q={scope:input.scope??'all',status:String(input.status??'open,pending').split(','),snooze:input.snooze??'exclude',unread:input.unread??'any',sort:input.sort??'latest_message_desc',limit:Number(input.limit??50),...Object.fromEntries(['team_id','channel','channel_id','page_id'].filter(k=>input[k]!==undefined).map(k=>[k,input[k]])),...(input.q!==undefined?{q:String(input.q).trim()}: {})} as Query;
 if(!['all','mine','unassigned','team'].includes(q.scope)||!q.status.length||q.status.some(s=>!['open','pending','closed'].includes(s))||new Set(q.status).size!==q.status.length||!['exclude','only','include'].includes(q.snooze)||!['any','only'].includes(q.unread)||!['latest_message_desc','latest_message_asc','waiting_longest'].includes(q.sort)||!Number.isInteger(q.limit)||q.limit<1||q.limit>100||q.scope==='team'&&!uuid(q.team_id)||q.team_id!==undefined&&(q.scope!=='team'||!uuid(q.team_id))||q.channel_id!==undefined&&!uuid(q.channel_id)||q.channel!==undefined&&!['messenger','mock_messenger'].includes(q.channel)||q.q!==undefined&&(!q.q.length||q.q.length>100)||q.page_id!==undefined&&(!q.page_id.trim()||q.page_id.length>255))ownerFail('INVALID_REQUEST');
 if(input.tag_ids!==undefined){q.tag_ids=String(input.tag_ids).split(',');if(q.tag_ids.length>10||q.tag_ids.some(id=>!uuid(id))||new Set(q.tag_ids).size!==q.tag_ids.length)ownerFail('INVALID_REQUEST');q.tag_ids.sort();}q.status.sort();return q;
}
function filterFields(q:Query){return ['status',...(['mine','unassigned'].includes(q.scope)?['owner_principal_id']:[]),...(q.scope==='team'?['team_id']:[]),...(['channel','channel_id','page_id'] as const).filter(f=>q[f]!==undefined),...(q.tag_ids?['tags']:[]),...(q.q!==undefined?['contact.display_name']:[])];}
function compare(a:Position,b:Position,sort:Query['sort']){const order=a.rank-b.rank||(a.time<b.time?-1:a.time>b.time?1:0)||(a.id<b.id?-1:a.id>b.id?1:0);return sort==='latest_message_desc'?-order:order;}
function permitted(rule:OwnerReadPredicate,p:OwnerWorkspacePolicy,r:OwnerResource){return rule.all||rule.own&&r.owner_principal_id===p.principal_id||rule.team_ids.some(id=>id===r.team_id||r.shared_team_ids.includes(id));}
function legacyQuery(input:Record<string,unknown>,channels:boolean){
 const allowed=channels?['limit','cursor']:['limit','cursor','state','owner','team','channel','channel_id','page_id'],limit=Number(input.limit??(channels?100:50));
 if(Object.keys(input).some(k=>!allowed.includes(k))||Object.values(input).some(v=>typeof v!=='string'&&typeof v!=='number')||!Number.isInteger(limit)||limit<1||limit>100)ownerFail('INVALID_REQUEST');
 if(channels){if(input.cursor!==undefined&&!uuid(input.cursor))ownerFail('INVALID_REQUEST');return limit;}
 if(input.state!==undefined&&!['open','pending','closed'].includes(String(input.state))||['owner','team'].some(k=>input[k]!==undefined&&input[k]!=='unassigned'&&!uuid(input[k]))||input.channel!==undefined&&!['mock_messenger','messenger'].includes(String(input.channel))||input.channel_id!==undefined&&!uuid(input.channel_id)||input.page_id!==undefined&&(typeof input.page_id!=='string'||!input.page_id.trim()||input.page_id.length>255))ownerFail('INVALID_REQUEST');return limit;
}

/** Chat-only snapshot and metrics; every foreign projection is obtained outside SQL. */
export class ChatWorkspaceQuery{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers,private readonly key:string|Buffer){}
 private async snapshot(c:PoolConnection,tenant:string,principal:string,lock=false){
  const suffix=lock?' FOR SHARE':'';
  const [records]=await c.execute<RowDataPacket[]>(`SELECT v.*,r.version,r.owner_revision,r.owner_principal_id,r.team_id,r.archived_at,h.control_revision,w.conversation_id workspace_id,w.latest_inbound_seq,w.answered_inbound_seq,w.last_message_at,w.waiting_since,w.waiting_metric_state,w.snoozed_until,w.snooze_revision,DATE_FORMAT(v.opened_at,'%Y-%m-%d %H:%i:%s.%f') opened_position,DATE_FORMAT(w.last_message_at,'%Y-%m-%d %H:%i:%s.%f') latest_position,DATE_FORMAT(w.waiting_since,'%Y-%m-%d %H:%i:%s.%f') waiting_position FROM conversation v JOIN crm_record r ON r.tenant_id=v.tenant_id AND r.id=v.record_id LEFT JOIN chat_control_head h ON h.tenant_id=v.tenant_id AND h.conversation_id=v.record_id LEFT JOIN conversation_workspace w ON w.tenant_id=v.tenant_id AND w.conversation_id=v.record_id WHERE v.tenant_id=? ORDER BY v.record_id${suffix}`,[tenant]);
  const tables=['record_team_access','conversation_read_state','chat_read_rollout_principal','chat_read_rollout_conversation','chat_workspace_rollout','chat_inbox','chat_inbox_share','conversation_tag','conversation_tag_link'] as const;
  const extra={} as Record<typeof tables[number],RowDataPacket[]>;
  for(const table of tables){const personal=['conversation_read_state','chat_read_rollout_principal'].includes(table);const [rows]=await c.execute<RowDataPacket[]>(`SELECT * FROM ${table} WHERE tenant_id=?${personal?' AND principal_id=?':''}${suffix}`,personal?[tenant,principal]:[tenant]);extra[table]=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Buffer.isBuffer(v)?v.toString('hex'):v instanceof Date?v.toISOString():v])) as RowDataPacket).sort((a,b)=>ownerCanonical(a).localeCompare(ownerCanonical(b)));}
  return {records,...extra};
 }
 private resource(s:Awaited<ReturnType<ChatWorkspaceQuery['snapshot']>>,r:RowDataPacket):OwnerResource{return {resource_id:r.record_id,object_key:'conversation',record_version:String(r.version),owner_revision:String(r.owner_revision),control_revision:String(r.control_revision??0),owner_principal_id:r.owner_principal_id,team_id:r.team_id,shared_team_ids:s.record_team_access.filter(v=>v.record_id===r.record_id).map(v=>String(v.team_id)).sort(),archived:r.archived_at!==null};}
 private visible(s:Awaited<ReturnType<ChatWorkspaceQuery['snapshot']>>,p:OwnerWorkspacePolicy,r:RowDataPacket,manager=false){return r.archived_at===null&&(r.creator_principal_id===p.principal_id||manager&&p.inbox_manage_all||s.chat_inbox_share.some(t=>t.inbox_id===r.id&&(t.target_kind==='principal'?t.target_id===p.principal_id:p.team_ids.includes(t.target_id))));}
 private normalize(s:Awaited<ReturnType<ChatWorkspaceQuery['snapshot']>>,input:Record<string,unknown>){
  let inbox:RowDataPacket|undefined;
  if(input.inbox_id!==undefined){if(!uuid(input.inbox_id)||Object.keys(input).some(k=>!['inbox_id','q','sort','limit','cursor'].includes(k)))ownerFail('INVALID_REQUEST');inbox=s.chat_inbox.find(i=>i.id===input.inbox_id);if(!inbox||inbox.archived_at!==null)ownerFail('NOT_FOUND');const p=parse(inbox.predicate);if(inbox.predicate_schema_version!==1)ownerFail('DEPENDENCY_UNAVAILABLE');input={...Object.fromEntries(Object.entries(p).filter(([k])=>k!=='tag_ids')),status:p.status.join(','),...(p.tag_ids?.length?{tag_ids:p.tag_ids.join(',')}:{}),sort:inbox.sort,...Object.fromEntries(Object.entries(input).filter(([k])=>k!=='inbox_id'))};}
  return {q:chatWorkspaceQuery(input),inbox};
 }
 private enabled(s:Awaited<ReturnType<ChatWorkspaceQuery['snapshot']>>){const row=s.chat_workspace_rollout.find(v=>v.feature_key==='snooze_v1');return !row||row.state==='ready';}
 private signature(raw:string){return createHmac('sha256',this.key).update(raw).digest('base64url');}
 private cursor(token:unknown,binding:string,correlation:string):Position|undefined{
  if(token===undefined)return;let decoded:any;
  try{if(typeof token!=='string'||token.length>8192)throw new Error();const [raw,sig,...rest]=token.split('.'),expected=this.signature(raw!);if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();decoded=JSON.parse(Buffer.from(raw!,'base64url').toString());if(!uuid(decoded.position?.id)||typeof decoded.position.time!=='string'||!Number.isInteger(decoded.position.rank)||!Number.isFinite(decoded.expires))throw new Error();}catch{throw new OwnerDomainError('INVALID_CURSOR',correlation);}
  if(decoded.expires<Date.now())throw new OwnerDomainError('CURSOR_EXPIRED',correlation);if(decoded.binding!==binding)throw new OwnerDomainError('QUERY_CHANGED',correlation);return decoded.position;
 }
 async execute(raw:OwnerCommandRequest,signal?:AbortSignal){
  const active=()=>{if(signal?.aborted)ownerFail('DEPENDENCY_UNAVAILABLE');};active();
  if(!['workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].includes(raw.operation))ownerFail('INVALID_REQUEST');const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,input.actor.principal_id)),sidebar=input.operation==='workspace-sidebar',legacy=input.operation==='conversation-get-conversations',channelOptions=input.operation==='conversation-channels',legacyLimit=legacy||channelOptions?legacyQuery(input.payload,channelOptions):0;
  const normalized=sidebar||legacy||channelOptions?null:this.normalize(snapshot,input.payload);
  const filters=legacy?['channel','channel_id','page_id'].filter(f=>input.payload[f]!==undefined):normalized?filterFields(normalized.q):[];
  // Sidebar filters are validated only for visible inboxes once current Identity policy is known.
  const command=randomUUID(),request={query_digest:ownerDigest(input.payload)};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'chat_workspace_query',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields,query_filter_fields:[...new Set(filters)].sort(),payload_digest:ownerDigest(request),legacy_receipt_key:'workspace-query:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest)ownerFail('FORBIDDEN');await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const policy=validateOwnerValue<OwnerWorkspacePolicy>('OwnerWorkspacePolicy',await this.peers.policy(tenant,ref,admission.admission_id,[]));if(policy.principal_id!==input.actor.principal_id||policy.auth_revision!==admission.auth_revision||ownerCanonical(policy.allowed_fields)!==ownerCanonical(admission.allowed_fields))ownerFail('FORBIDDEN');
   if(!legacy&&!channelOptions&&snapshot.records.some(r=>r.workspace_id===null))throw new OwnerDomainError('WORKSPACE_BACKFILLING',input.correlation_id);
   const rows=snapshot.records.filter(r=>r.archived_at===null&&permitted(policy.read,policy,this.resource(snapshot,r)));
   const channelMap=new Map<string,Channel>(),contactMap=new Map<string,OwnerContactSummary|null>(),asOf=new Date();
   // Filter metadata and full result hydration share the same owner snapshots.
   const hydrate=async(selected:RowDataPacket[],contacts:boolean,channels:boolean)=>{
    const wantedContacts=contacts?[...new Set(selected.map(r=>String(r.contact_id)))].filter(id=>!contactMap.has(id)):[],wantedChannels=channels?selected.filter(r=>!channelMap.has(r.record_id)):[];
    for(let i=0;i<Math.max(wantedContacts.length,wantedChannels.length);i+=100){
     active();
     const ids=wantedContacts.slice(i,i+100),items=wantedChannels.slice(i,i+100).map(r=>({connection_id:String(r.connection_id),conversation_id:String(r.record_id)}));
     const [contactsReply,channelsReply]=await Promise.all([ids.length?this.peers.contacts(tenant,ref,admission!.admission_id,ids):null,items.length?this.peers.channels(tenant,items):null]);
     if(contactsReply){if(contactsReply.data.length!==ids.length||new Set(contactsReply.data.map(v=>v.contact_id)).size!==ids.length||contactsReply.data.some(v=>!ids.includes(v.contact_id)))ownerFail('FORBIDDEN');for(const v of contactsReply.data)contactMap.set(v.contact_id,v.summary);}
     if(channelsReply){if(channelsReply.data.length!==items.length||new Set(channelsReply.data.map(v=>v.conversation_id)).size!==items.length||channelsReply.data.some(v=>!items.some(i=>i.conversation_id===v.conversation_id&&i.connection_id===v.metadata.channel_id)))ownerFail('FORBIDDEN');for(const v of channelsReply.data)channelMap.set(v.conversation_id,v.metadata);}
    }
   };
   const evaluate=async(queryInput:Record<string,unknown>,enumerating=false)=>{
    active();
    const {q,inbox}=this.normalize(snapshot,queryInput);if(inbox&&!this.visible(snapshot,policy,inbox,!enumerating))ownerFail('NOT_FOUND');
    if(filterFields(q).some(f=>!policy.filter_fields.includes(f)))throw new OwnerDomainError('FIELD_FORBIDDEN',input.correlation_id);
    if(q.tag_ids?.some(id=>!snapshot.conversation_tag.some(t=>t.id===id)))ownerFail('NOT_FOUND');
    if(q.snooze==='only'&&!this.enabled(snapshot))throw new OwnerDomainError('CAPABILITY_UNAVAILABLE',input.correlation_id);
    const cursorBinding=ownerDigest({version:2,tenant,policy:{...policy,rows:[]},query:q,inbox:inbox?{id:inbox.id,version:String(inbox.version)}:null}),cursor=this.cursor(queryInput.cursor,cursorBinding,input.correlation_id);
    const candidates=rows.filter(r=>q.status.includes(r.status)&&!(q.scope==='mine'&&r.owner_principal_id!==policy.principal_id||q.scope==='unassigned'&&r.owner_principal_id!==null||q.scope==='team'&&r.team_id!==q.team_id||q.channel!==undefined&&r.channel!==q.channel||q.channel_id!==undefined&&r.channel_id!==q.channel_id)&&!(q.snooze==='exclude'&&r.snoozed_until&&new Date(stamp(r.snoozed_until)!)>asOf||q.snooze==='only'&&(!r.snoozed_until||new Date(stamp(r.snoozed_until)!)<=asOf))&&(!q.tag_ids||q.tag_ids.every(id=>snapshot.conversation_tag_link.some(t=>t.conversation_id===r.record_id&&t.tag_id===id))));
    await hydrate(candidates,q.q!==undefined,q.page_id!==undefined);
    let count=0n,unread=0n,waiting=0n,partial=false;const selected:{row:RowDataPacket;position:Position;last:string;unread:string}[]=[];
    for(const original of candidates){
     if(q.page_id!==undefined&&channelMap.get(original.record_id)!.page_id!==q.page_id)continue;
     if(q.q!==undefined){const name=contactMap.get(original.contact_id)?.display_name;if(typeof name!=='string'||!label(name).startsWith(label(q.q)))continue;}
     const marker=snapshot.conversation_read_state.find(m=>m.conversation_id===original.record_id),cohort=snapshot.chat_read_rollout_principal.length? snapshot.chat_read_rollout_conversation.find(m=>m.conversation_id===original.record_id)?.baseline_inbound_seq:0,last=String(marker?.last_read_inbound_seq??cohort??0),unreadCount=(BigInt(original.latest_inbound_seq)-BigInt(last)).toString();
     if(BigInt(unreadCount)<0n)throw new OwnerDomainError('WORKSPACE_BACKFILLING',input.correlation_id);
     if(q.unread==='only'&&unreadCount==='0')continue;
     const r=original.status==='closed'?{...original,waiting_since:null,waiting_position:null,waiting_metric_state:'ready'} as RowDataPacket:original;
     count++;if(unreadCount!=='0')unread++;if(r.waiting_metric_state==='unavailable')partial=true;else if(r.waiting_since)waiting++;
     const position:Position=q.sort==='waiting_longest'?{rank:r.waiting_metric_state==='unavailable'?2:r.waiting_since?0:1,time:r.waiting_position??'',id:r.record_id}:{rank:0,time:r.latest_position,id:r.record_id};
     if(cursor&&compare(position,cursor,q.sort)<=0)continue;selected.push({row:r,position,last,unread:unreadCount});selected.sort((a,b)=>compare(a.position,b.position,q.sort));if(selected.length>q.limit+1)selected.pop();
    }
    const rawCursor=Buffer.from(JSON.stringify({binding:cursorBinding,expires:Date.now()+300000,position:selected[q.limit-1]?.position})).toString('base64url');
    return {selected:selected.slice(0,q.limit),next_cursor:selected.length>q.limit?rawCursor+'.'+this.signature(rawCursor):null,meta:{as_of:asOf.toISOString(),conversation_count:count.toString(),unread_conversation_count:unread.toString(),waiting_conversation_count:partial?null:waiting.toString(),waiting_metric_coverage:partial?'partial':'complete',metrics_state:'ready'}};
   };
   let result:Record<string,unknown>,page:Pick<Awaited<ReturnType<typeof evaluate>>,'selected'|'next_cursor'>|undefined;const decisions=new Map<string,OwnerConversationPolicy>();
   if(sidebar){
    const scopes:Record<string,unknown>[]=[],inboxes:Record<string,unknown>[]=[];
    for(const scope of ['all','mine','unassigned'])scopes.push({key:scope,...(await evaluate({scope,limit:1})).meta});
    for(const id of policy.team_ids)scopes.push({key:'team:'+id,team_id:id,...(await evaluate({scope:'team',team_id:id,limit:1})).meta});
    if(this.enabled(snapshot))scopes.push({key:'snoozed',...(await evaluate({snooze:'only',limit:1})).meta});
    for(const inbox of snapshot.chat_inbox.filter(i=>this.visible(snapshot,policy,i)).sort((a,b)=>String(a.id).localeCompare(String(b.id)))){const {meta}=await evaluate({inbox_id:inbox.id,limit:1},true);inboxes.push({id:inbox.id,name:inbox.name,creator_principal_id:inbox.creator_principal_id,shared:inbox.creator_principal_id!==policy.principal_id,version:String(inbox.version),conversation_count:meta.conversation_count,unread_conversation_count:meta.unread_conversation_count});}
    result={data:{scopes,inboxes,metrics_state:'ready'},meta:{as_of:asOf.toISOString(),correlation_id:input.correlation_id}};
   }else if(channelOptions){
    const distinct=new Map<string,RowDataPacket>();for(const row of rows)if(String(row.connection_id)>String(input.payload.cursor??''))distinct.set(String(row.connection_id),row);
    const chosen=[...distinct].sort(([a],[b])=>a.localeCompare(b)).slice(0,legacyLimit+1),selected=chosen.slice(0,legacyLimit).map(([,r])=>r);await hydrate(selected,false,true);
    result={data:selected.map(r=>{const {attribution:_attribution,...metadata}=channelMap.get(r.record_id)!;return {id:r.connection_id,...metadata};}),next_cursor:chosen.length>legacyLimit?chosen[legacyLimit-1]![0]:null,meta:{correlation_id:input.correlation_id}};
   }else if(legacy){
    const q=input.payload,subject=await this.peers.subject(tenant,ref,admission.admission_id);if(!uuid(subject.account_id))ownerFail('FORBIDDEN');
    const cursorBinding={account:subject.account_id,tenant,id:null,state:q.state??null,owner:q.owner??null,team:q.team??null,...Object.fromEntries(['channel','channel_id','page_id'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]]))};let position:{time:string;id:string}|undefined;
    if(q.cursor!==undefined){try{if(typeof q.cursor!=='string'||q.cursor.length>4096)throw new Error();const [raw,sig,...rest]=q.cursor.split('.'),expected=this.signature(raw!);if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();const decoded=JSON.parse(Buffer.from(raw!,'base64url').toString());if(ownerCanonical(decoded.binding)!==ownerCanonical(cursorBinding)||!uuid(decoded.position?.id)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(decoded.position.time))throw new Error();position=decoded.position;}catch{throw new OwnerDomainError('INVALID_CURSOR',input.correlation_id);}}
    const candidates=rows.filter(r=>(q.state===undefined||r.status===q.state)&&(q.owner===undefined||r.owner_principal_id===(q.owner==='unassigned'?null:q.owner))&&(q.team===undefined||r.team_id===(q.team==='unassigned'?null:q.team))&&(q.channel===undefined||r.channel===q.channel)&&(q.channel_id===undefined||r.channel_id===q.channel_id)&&(!position||r.opened_position>position.time||r.opened_position===position.time&&r.record_id>position.id)).sort((a,b)=>String(a.opened_position).localeCompare(String(b.opened_position))||String(a.record_id).localeCompare(String(b.record_id)));
    if(q.page_id!==undefined)await hydrate(candidates,false,true);
    const chosen=candidates.filter(r=>q.page_id===undefined||channelMap.get(r.record_id)!.page_id===q.page_id).slice(0,legacyLimit+1),selected=chosen.slice(0,legacyLimit),last=selected.at(-1),cursor=last?Buffer.from(JSON.stringify({binding:cursorBinding,position:{id:last.record_id,time:last.opened_position}})).toString('base64url'):null;
    page={selected:selected.map(row=>({row,position:{rank:0,time:row.opened_position,id:row.record_id},last:'0',unread:'0'})),next_cursor:chosen.length>legacyLimit?cursor+'.'+this.signature(cursor!):null};result={data:[],next_cursor:page.next_cursor,meta:{correlation_id:input.correlation_id}};
   }else{const evaluated=await evaluate(input.payload);page=evaluated;result={data:[],next_cursor:page.next_cursor,meta:{...evaluated.meta,correlation_id:input.correlation_id}};}
   if(page){
    const selected=page.selected.map(i=>i.row);if(selected.some(r=>r.control_revision===null))throw new OwnerDomainError('WORKSPACE_BACKFILLING',input.correlation_id);await hydrate(selected,true,true);
    for(let offset=0;offset<selected.length;offset+=25){active();const batch=selected.slice(offset,offset+25),current=validateOwnerValue<OwnerWorkspacePolicy>('OwnerWorkspacePolicy',await this.peers.policy(tenant,ref,admission.admission_id,batch.map(r=>this.resource(snapshot,r))));if(ownerCanonical({...current,rows:[]})!==ownerCanonical(policy)||current.rows.length!==batch.length||new Set(current.rows.map(r=>r.id)).size!==batch.length||current.rows.some(r=>!batch.some(s=>s.record_id===r.id)))ownerFail('REVOKED');for(const row of current.rows)decisions.set(row.id,row.policy);}
   }
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    active();
    if(ownerCanonical(await this.snapshot(c,tenant,input.actor.principal_id,true))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    if(page){const data=[];for(const item of page.selected){
     const r=item.row,id=String(r.record_id),decision=decisions.get(id)!,channel=channelMap.get(id)!;
     const [[message]]=await c.execute<RowDataPacket[]>(`SELECT id,status,direction,received_at${decision.allowed_fields.includes('text')?',text':''} FROM message WHERE tenant_id=? AND conversation_id=? ORDER BY received_at DESC,id DESC LIMIT 1`,[tenant,id]);
     const conversation={id,contact_id:r.contact_id,contact_identity_id:r.contact_identity_id,connection_id:r.connection_id,...Object.fromEntries(Object.entries(channel).filter(([f])=>decision.allowed_fields.includes(f))),status:r.status,need_response:r.status==='closed'||r.waiting_metric_state==='ready'&&r.waiting_since==null?false:null,opened_at:stamp(r.opened_at),closed_at:stamp(r.closed_at),version:String(r.version),owner_revision:String(r.owner_revision),owner_principal_id:r.owner_principal_id,owner_kind:decision.owner_kind,allowed_actions:r.status==='closed'?[]:decision.allowed_actions,team_id:r.team_id,contact:contactMap.get(r.contact_id)??null,latest_message:message?{...message,received_at:stamp(message.received_at)}:null};
     if(legacy){data.push(conversation);continue;}
     const canUpdate=permitted(policy.update,policy,this.resource(snapshot,r)),canTags=canUpdate&&policy.tags_write&&policy.allowed_fields.includes('tags');
     data.push({conversation,latest_inbound_seq:String(r.latest_inbound_seq),read_state:{last_read_inbound_seq:item.last,unread_message_count:item.unread},snooze:r.snoozed_until&&new Date(stamp(r.snoozed_until)!)>asOf?{until:stamp(r.snoozed_until),revision:String(r.snooze_revision)}:null,...(policy.allowed_fields.includes('tags')?{tags:snapshot.conversation_tag.filter(t=>snapshot.conversation_tag_link.some(l=>l.conversation_id===id&&l.tag_id===t.id)).sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(t=>({id:t.id,name:t.name,color:t.color,archived:t.archived_at!==null}))}:{}),last_message_at:stamp(r.last_message_at),waiting_since:stamp(r.waiting_since),waiting_seconds:r.waiting_since?Math.max(0,Math.floor((asOf.getTime()-new Date(stamp(r.waiting_since)!).getTime())/1000)):null,waiting_metric_state:r.waiting_metric_state,workspace_allowed_actions:['mark_read',...(this.enabled(snapshot)&&r.status!=='closed'&&canUpdate?['snooze','wake']:[]),...(canTags?['tags']:[])]});
    }result.data=data;}
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:tenant,effect_revision:'1'};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drains retained terminal proof. */}throw error;}
 }
}
export function chatWorkspaceQueryRoutes(query:ChatWorkspaceQuery):Record<string,WorkloadRoute>{return Object.fromEntries(['workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].map(op=>['/internal/v1/owners/chat/'+op,ownerRoute('chat',op,['bff'],(r,_peer,signal)=>query.execute(r as OwnerCommandRequest,signal))]));}
