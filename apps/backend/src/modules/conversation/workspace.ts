import { WorkspaceCatalogs,catalogsReady } from './workspace-catalogs.js';
import { createHmac,randomUUID,timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { canonical,CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { type Access,fieldAllowed,permits } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { ConversationCrmPort } from '../crm/conversation-ports.js';
import { object } from '../crm/properties.js';
import { stamp } from '../crm/core.js';
import { uuid } from '../identity/admin.js';
import { ChannelReferences } from '../channels/ports.js';
import { Conversations,conversation,requirePermission } from './domain.js';
import { workspaceSupported } from './workspace-storage.js';

export type WorkspaceQuery={scope:'all'|'mine'|'unassigned'|'team';team_id?:string;status:string[];snooze:'exclude'|'include'|'only';unread:'any'|'only';channel?:string;channel_id?:string;page_id?:string;tag_ids?:string[];q?:string;sort:'latest_message_desc'|'latest_message_asc'|'waiting_longest';limit:number};
export const normalizedLabel=(value:string)=>value.normalize('NFC').toLowerCase();
export function workspaceQuery(input:Record<string,unknown>):WorkspaceQuery{
  const allowed=['scope','team_id','status','snooze','unread','channel','channel_id','page_id','q','sort','limit','cursor','tag_ids'];
  if(Object.keys(input).some(k=>!allowed.includes(k))||Object.values(input).some(v=>typeof v!=='string'&&typeof v!=='number'))throw new CommandError(400,'INVALID_REQUEST');
  const q={scope:input.scope??'all',status:String(input.status??'open,pending').split(','),snooze:input.snooze??'exclude',unread:input.unread??'any',sort:input.sort??'latest_message_desc',limit:Number(input.limit??50),...Object.fromEntries(['team_id','channel','channel_id','page_id'].filter(k=>input[k]!==undefined).map(k=>[k,input[k]])),...(input.q!==undefined?{q:String(input.q).trim()}: {})} as WorkspaceQuery;
  if(!['all','mine','unassigned','team'].includes(q.scope)||!q.status.length||q.status.some(s=>!['open','pending','closed'].includes(s))||new Set(q.status).size!==q.status.length||!['exclude','only','include'].includes(q.snooze)||!['any','only'].includes(q.unread)||!['latest_message_desc','latest_message_asc','waiting_longest'].includes(q.sort)||!Number.isInteger(q.limit)||q.limit<1||q.limit>100||q.scope==='team'&&!uuid(q.team_id)||q.team_id!==undefined&&(q.scope!=='team'||!uuid(q.team_id))||q.channel_id!==undefined&&!uuid(q.channel_id)||q.channel!==undefined&&!['messenger','mock_messenger'].includes(q.channel)||q.q!==undefined&&(!q.q.length||q.q.length>100)||q.page_id!==undefined&&(!q.page_id.trim()||q.page_id.length>255))throw new CommandError(400,'INVALID_REQUEST');
  if(input.tag_ids!==undefined){q.tag_ids=String(input.tag_ids).split(',');if(q.tag_ids.length>10||q.tag_ids.some(id=>!uuid(id))||new Set(q.tag_ids).size!==q.tag_ids.length)throw new CommandError(400,'INVALID_REQUEST');q.tag_ids.sort();}q.status.sort();return q;
}
type Position={rank:number;time:string;id:string};
function compare(a:Position,b:Position,sort:WorkspaceQuery['sort']){const order=a.rank-b.rank||(a.time<b.time?-1:a.time>b.time?1:0)||(a.id<b.id?-1:a.id>b.id?1:0);return sort==='latest_message_desc'?-order:order;}
const emptyFeatures={queue_v1:true,read_state_v1:true,inbox_v1:false,tags_v1:false,snooze_v1:false,activity_v1:false,snippets_v1:false,contact_channels_v1:false};

export class ChatWorkspace {
  readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;readonly conversations:Conversations;readonly catalogs:WorkspaceCatalogs;
  private readonly crm=new ConversationCrmPort();private readonly commands=new DurableCommands();
  constructor(source:DataSource,private readonly secret:string|Buffer){this.catalogs=new WorkspaceCatalogs(source,secret);this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);this.conversations=new Conversations(source,secret);}
  private requireAccess(a:Access){if(!a.capabilities.includes('chat'))throw new CommandError(403,'FORBIDDEN');}
  private async ready(s:TransactionScope){
    if(!await workspaceSupported(s))throw new CommandError(409,'CAPABILITY_UNAVAILABLE');
    if((await s.query('SELECT c.record_id FROM conversation c LEFT JOIN conversation_workspace w ON w.tenant_id=c.tenant_id AND w.conversation_id=c.record_id WHERE c.tenant_id=? AND w.conversation_id IS NULL LIMIT 1',[s.context.tenantId]))[0])throw new CommandError(503,'WORKSPACE_BACKFILLING');
  }
  private run<T>(account:string,tenant:string,work:(s:TransactionScope,a:Access)=>Promise<T>){return this.uow.run({tenantId:tenant},async s=>{const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account));this.requireAccess(a);await this.ready(s);return work(s,a);},'REPEATABLE READ');}
  capabilities(account:string,tenant:string){return this.auth.runHuman(account,tenant,async(s,a)=>{this.requireAccess(a);let ready=false;try{await this.ready(s);ready=true;}catch(e){if(!(e instanceof CommandError))throw e;}return {data:{contract_version:1,features:Object.fromEntries(Object.entries({...emptyFeatures,...(ready&&await catalogsReady(s)?{inbox_v1:true,tags_v1:true,snippets_v1:true}:{})}).map(([k,v])=>[k,ready&&v]))},meta:{as_of:new Date().toISOString()}};});}
  private async readState(s:TransactionScope,a:Access,id:string){
    const [row]=await s.query(`SELECT w.latest_inbound_seq,COALESCE(r.last_read_inbound_seq,IF(p.principal_id IS NULL,0,COALESCE(c.baseline_inbound_seq,0))) last_read_inbound_seq,COALESCE(r.revision,0) read_state_revision FROM conversation_workspace w LEFT JOIN conversation_read_state r ON r.tenant_id=w.tenant_id AND r.conversation_id=w.conversation_id AND r.principal_id=? LEFT JOIN chat_read_rollout_principal p ON p.tenant_id=w.tenant_id AND p.principal_id=? LEFT JOIN chat_read_rollout_conversation c ON c.tenant_id=w.tenant_id AND c.conversation_id=w.conversation_id WHERE w.tenant_id=? AND w.conversation_id=?`,[a.principalId,a.principalId,s.context.tenantId,id]);
    if(!row)throw new CommandError(503,'WORKSPACE_BACKFILLING');
    return {conversation_id:id,last_read_inbound_seq:String(row.last_read_inbound_seq),latest_inbound_seq:String(row.latest_inbound_seq),unread_message_count:(BigInt(row.latest_inbound_seq)-BigInt(row.last_read_inbound_seq)).toString(),read_state_revision:String(row.read_state_revision)};
  }
  state(account:string,tenant:string,id:string){return this.run(account,tenant,async(s,a)=>{requirePermission(a,(await conversation(s,id)).record,'read');return {data:await this.readState(s,a,id),meta:{as_of:new Date().toISOString()}};});}
  markRead(account:string,tenant:string,id:string,input:unknown,key:string,correlation:string){
    const body=object(input,['through_inbound_seq']);
    if(typeof body.through_inbound_seq!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(body.through_inbound_seq)||typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    return this.uow.run({tenantId:tenant},async s=>{
      const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,true));this.requireAccess(a);await this.ready(s);const {record}=await conversation(s,id,true);requirePermission(a,record,'read');
      const command={actorId:a.principalId,route:`POST /api/v1/chat-workspace/conversations/${id}/read-state`,body,key,correlationId:correlation};
      const replay=await this.commands.replay(s,command,async()=>{requirePermission(a,record,'read');});if(replay)return replay;
      const current=await this.readState(s,a,id),through=BigInt(body.through_inbound_seq);
      if(through>BigInt(current.latest_inbound_seq))throw new CommandError(422,'INVALID_READ_POSITION');
      if(through>BigInt(current.last_read_inbound_seq)){
        const [old]=await s.query('SELECT id FROM conversation_read_state WHERE tenant_id=? AND conversation_id=? AND principal_id=?',[tenant,id,a.principalId]);const stateId=old?.id??randomUUID(),rev=(BigInt(current.read_state_revision)+1n).toString();
        await s.query('INSERT INTO conversation_read_state(tenant_id,conversation_id,principal_id,id,last_read_inbound_seq,revision,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE last_read_inbound_seq=VALUES(last_read_inbound_seq),revision=VALUES(revision),updated_at=UTC_TIMESTAMP(6)',[tenant,id,a.principalId,stateId,through.toString(),rev]);
        await this.commands.audit(s,a.principalId,correlation,'conversation_read_state',stateId,'mark_read',['last_read_inbound_seq']);
        await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,'chat.read_marker.updated',1,'conversation_read_state',?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),tenant,stateId,rev,JSON.stringify({conversation_id:id,principal_id:a.principalId,through_inbound_seq:through.toString(),read_state_revision:rev}),correlation,a.principalId]);
      }
      const result={status:200,body:{data:await this.readState(s,a,id),meta:{correlation_id:correlation}}};await this.commands.complete(s,command,result);return result;
    });
  }
  private token(value:unknown){const p=Buffer.from(JSON.stringify(value)).toString('base64url');return `${p}.${createHmac('sha256',this.secret).update(p).digest('base64url')}`;}
  private cursor(token:unknown,binding:unknown):Position|undefined{
    if(token===undefined)return;let parsed:any;
    try{if(typeof token!=='string'||token.length>8192)throw new Error();const [p,sig,...rest]=token.split('.'),expected=createHmac('sha256',this.secret).update(p!).digest('base64url');if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();parsed=JSON.parse(Buffer.from(p!,'base64url').toString());if(!uuid(parsed.position?.id)||typeof parsed.position.time!=='string'||!Number.isInteger(parsed.position.rank)||!Number.isFinite(parsed.expires))throw new Error();}catch{throw new CommandError(400,'INVALID_CURSOR');}
    if(parsed.expires<Date.now())throw new CommandError(400,'CURSOR_EXPIRED');if(canonical(parsed.binding)!==canonical(binding))throw new CommandError(409,'QUERY_CHANGED');return parsed.position;
  }
  private async query(s:TransactionScope,a:Access,input:Record<string,unknown>){
    const original=input;let inboxBinding:unknown=null;const catalogReady=await catalogsReady(s);
    if(input.inbox_id!==undefined){
      if(!catalogReady)throw new CommandError(409,'CAPABILITY_UNAVAILABLE');
      if(Object.keys(input).some(k=>!['inbox_id','q','sort','limit','cursor'].includes(k))||!uuid(input.inbox_id))throw new CommandError(400,'INVALID_REQUEST');
      const inbox=await this.catalogs.row(s,a,'inboxes',input.inbox_id),predicate=typeof inbox.predicate==='string'?JSON.parse(inbox.predicate):inbox.predicate;
      inboxBinding={id:inbox.id,version:String(inbox.version)};
      input={...Object.fromEntries(Object.entries(predicate).filter(([k])=>k!=='tag_ids')),status:predicate.status.join(','),...(predicate.tag_ids?.length?{tag_ids:predicate.tag_ids.join(',')}:{}),sort:inbox.sort,...Object.fromEntries(Object.entries(input).filter(([k])=>k!=='inbox_id'))};
    }
    const q=workspaceQuery(input);
    if(q.tag_ids){if(!catalogReady)throw new CommandError(409,'CAPABILITY_UNAVAILABLE');if(!fieldAllowed(a,'conversation','tags','filter'))throw new CommandError(403,'FIELD_FORBIDDEN');for(const id of q.tag_ids)await this.catalogs.row(s,a,'tags',id,true);}if(q.snooze==='only')throw new CommandError(409,'CAPABILITY_UNAVAILABLE');
    for(const field of ['channel','channel_id','page_id'] as const)if(q[field]!==undefined&&!fieldAllowed(a,'conversation',field,'filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
    for(const field of ['status',...(q.scope==='mine'||q.scope==='unassigned'?['owner_principal_id']:[]),...(q.scope==='team'?['team_id']:[])])if(!fieldAllowed(a,'conversation',field,'filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
    if(q.q!==undefined&&!fieldAllowed(a,'contact','display_name','filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
    const binding={tenant:s.context.tenantId,principal:a.principalId,access:createHmac('sha256',this.secret).update(canonical(a)).digest('hex'),query:q,inbox:inboxBinding},cursor=this.cursor(original.cursor,binding),asOf=new Date();
    let count=0n,unread=0n,waiting=0n,partial=false,after='';const selected:{row:any;position:Position;state:Awaited<ReturnType<ChatWorkspace['readState']>>}[]=[];
    for(;;){
      const rows=await s.query("SELECT c.record_id id,c.status,c.channel,c.channel_id,w.*,DATE_FORMAT(w.last_message_at,'%Y-%m-%d %H:%i:%s.%f') latest_position,DATE_FORMAT(w.waiting_since,'%Y-%m-%d %H:%i:%s.%f') waiting_position FROM conversation c JOIN conversation_workspace w ON w.tenant_id=c.tenant_id AND w.conversation_id=c.record_id JOIN crm_record r ON r.tenant_id=c.tenant_id AND r.id=c.record_id AND r.archived_at IS NULL WHERE c.tenant_id=? AND c.record_id>? ORDER BY c.record_id LIMIT 100",[s.context.tenantId,after]);
      for(const row of rows){
        const {record,row:c}=await conversation(s,row.id);if(!permits(a,'conversation','read',record)||!q.status.includes(row.status)||q.scope==='mine'&&record.ownerPrincipalId!==a.principalId||q.scope==='unassigned'&&record.ownerPrincipalId!==null||q.scope==='team'&&record.teamId!==q.team_id||q.channel!==undefined&&row.channel!==q.channel||q.channel_id!==undefined&&row.channel_id!==q.channel_id)continue;
        if(q.page_id!==undefined&&(await new ChannelReferences().metadata(s,c.connection_id)).page_id!==q.page_id)continue;
        if(q.q!==undefined){const contact=await this.crm.contactSummary(s,a,c.contact_id);if(typeof contact?.display_name!=='string'||!normalizedLabel(contact.display_name).startsWith(normalizedLabel(q.q)))continue;}
        if(q.tag_ids){const links=await s.query('SELECT tag_id FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=?',[s.context.tenantId,row.id]);if(q.tag_ids.some(id=>!links.some((l:any)=>l.tag_id===id)))continue;}
        const state=await this.readState(s,a,row.id);if(q.unread==='only'&&state.unread_message_count==='0')continue;
        if(row.status==='closed'){row.waiting_since=null;row.waiting_position=null;row.waiting_metric_state='ready';}
        count++;if(state.unread_message_count!=='0')unread++;if(row.waiting_metric_state==='unavailable')partial=true;else if(row.waiting_since)waiting++;
        const position:Position=q.sort==='waiting_longest'?{rank:row.waiting_metric_state==='unavailable'?2:row.waiting_since?0:1,time:row.waiting_position??'',id:row.id}:{rank:0,time:row.latest_position,id:row.id};
        if(cursor&&compare(position,cursor,q.sort)<=0)continue;
        selected.push({row,position,state});selected.sort((l,r)=>compare(l.position,r.position,q.sort));if(selected.length>q.limit+1)selected.pop();
      }
      if(rows.length<100)break;after=rows.at(-1).id;
    }
    const data=[];
    for(const {row,state} of selected.slice(0,q.limit))data.push({conversation:await this.conversations.project(s,a,row.id),latest_inbound_seq:state.latest_inbound_seq,read_state:{last_read_inbound_seq:state.last_read_inbound_seq,unread_message_count:state.unread_message_count},snooze:null,...(fieldAllowed(a,'conversation','tags','read')?{tags:catalogReady?await this.catalogs.tags(s,a,row.id):[]}:{}),last_message_at:stamp(row.last_message_at),waiting_since:stamp(row.waiting_since),waiting_seconds:row.waiting_since?Math.max(0,Math.floor((asOf.getTime()-new Date(row.waiting_since).getTime())/1000)):null,waiting_metric_state:row.waiting_metric_state,workspace_allowed_actions:['mark_read',...(catalogReady&&permits(a,'conversation','update',(await conversation(s,row.id)).record)&&fieldAllowed(a,'conversation','tags','read')&&fieldAllowed(a,'conversation','tags','write')?['tags']:[])]});
    return {data,next_cursor:selected.length>q.limit?this.token({binding,expires:Date.now()+300000,position:selected[q.limit-1]!.position}):null,meta:{as_of:asOf.toISOString(),conversation_count:count.toString(),unread_conversation_count:unread.toString(),waiting_conversation_count:partial?null:waiting.toString(),waiting_metric_coverage:partial?'partial':'complete',metrics_state:'ready'}};
  }
  list(account:string,tenant:string,input:Record<string,unknown>){return this.run(account,tenant,(s,a)=>this.query(s,a,input));}
  sidebar(account:string,tenant:string){return this.run(account,tenant,async(s,a)=>{
    const scopes=[];
    for(const scope of ['all','mine','unassigned'] as const){const {meta}=await this.query(s,a,{scope,limit:1});scopes.push({key:scope,...meta});}
    // Team labels and IDs come only from the viewer's active memberships, not a tenant directory.
    for(const id of a.teamIds){const {meta}=await this.query(s,a,{scope:'team',team_id:id,limit:1});scopes.push({key:`team:${id}`,team_id:id,...meta});}
    const inboxes:any[]=[];
    if(await catalogsReady(s)){let cursor:string|null=null;do{const page=await this.catalogs.listInScope(s,a,'inboxes',{limit:100,...(cursor?{cursor}:{})});for(const inbox of page.data){const {meta}=await this.query(s,a,{inbox_id:inbox.id,limit:1});inboxes.push({id:inbox.id,name:(inbox as any).name,creator_principal_id:(inbox as any).creator_principal_id,shared:(inbox as any).shared,version:inbox.version,conversation_count:meta.conversation_count,unread_conversation_count:meta.unread_conversation_count});}cursor=page.next_cursor;}while(cursor);}
    return {data:{scopes,inboxes,metrics_state:'ready'},meta:{as_of:new Date().toISOString()}};
  });}
}
