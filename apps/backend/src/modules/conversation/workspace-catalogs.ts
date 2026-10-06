import { createHmac,randomUUID,timingSafeEqual } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { canonical,CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { WorkspaceIdentityPort } from '../identity/workspace-port.js';
import { type Access,fieldAllowed,permits } from '../identity/domain/authorization.js';
import { withFieldPolicies } from '../crm/access.js';
import { object,json } from '../crm/properties.js';
import { uuid } from '../identity/admin.js';
import { ChannelReferences } from '../channels/ports.js';
import { conversation,requirePermission } from './domain.js';

export type CatalogKind='inboxes'|'tags'|'snippets';
export const catalogTables={inboxes:'chat_inbox',tags:'conversation_tag',snippets:'chat_snippet'} as const;
const resources={inboxes:'chat_inbox',tags:'conversation_tag',snippets:'chat_snippet'} as const;
const sorts=['latest_message_desc','latest_message_asc','waiting_longest'];
export const catalogNormalize=(v:string)=>v.normalize('NFC').toLowerCase();
export async function catalogsReady(s:TransactionScope){return !!(await s.query("SELECT version FROM schema_migration WHERE version=21 AND state='applied'"))[0];}
const bad=()=>new CommandError(400,'INVALID_REQUEST');
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw bad();return v.trim();}
export function savedPredicate(input:unknown){
  const b=object(input,['scope','team_id','status','snooze','unread','channel','channel_id','tag_ids']);
  const p:Record<string,any>={scope:b.scope??'all',status:b.status??['open','pending'],snooze:b.snooze??'exclude',unread:b.unread??'any',...b};
  if(!['all','mine','unassigned','team'].includes(p.scope)||!Array.isArray(p.status)||!p.status.length||p.status.length>3||p.status.some((x:unknown)=>!['open','pending','closed'].includes(String(x)))||new Set(p.status).size!==p.status.length||!['exclude','include','only'].includes(p.snooze)||!['any','only'].includes(p.unread)||p.scope==='team'&&!uuid(p.team_id)||p.team_id!==undefined&&(p.scope!=='team'||!uuid(p.team_id))||p.channel!==undefined&&!['messenger','mock_messenger'].includes(p.channel)||p.channel_id!==undefined&&!uuid(p.channel_id)||p.tag_ids!==undefined&&(!Array.isArray(p.tag_ids)||p.tag_ids.length>10||p.tag_ids.some((x:unknown)=>!uuid(x))||new Set(p.tag_ids).size!==p.tag_ids.length))throw bad();
  p.status=[...p.status].sort();if(p.tag_ids)p.tag_ids=[...p.tag_ids].sort();return p;
}
export function shareTargets(input:unknown):{kind:'principal'|'team';id:string}[]{
  if(!Array.isArray(input)||input.length>50)throw bad();const result=input.map(x=>{const b=object(x,['kind','id']);if(!['principal','team'].includes(b.kind)||!uuid(b.id))throw bad();return {kind:b.kind as 'principal'|'team',id:b.id};});
  if(new Set(result.map(x=>x.kind+':'+x.id)).size!==result.length)throw bad();return result.sort((a,b)=>(a.kind+a.id).localeCompare(b.kind+b.id));
}
export class WorkspaceCatalogs {
  readonly uow:UnitOfWork;readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();private readonly identity=new WorkspaceIdentityPort();
  constructor(source:DataSource,private readonly secret:string|Buffer){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
  private async run<T>(account:string,tenant:string,write:boolean,fn:(s:TransactionScope,a:Access)=>Promise<T>){return this.uow.run({tenantId:tenant},async s=>{const a=await withFieldPolicies(s,await this.auth.loadHuman(s,account,undefined,write));if(!a.capabilities.includes('chat'))throw new CommandError(403,'FORBIDDEN');if(!await catalogsReady(s))throw new CommandError(409,'CAPABILITY_UNAVAILABLE');return fn(s,a);});}
  manages(a:Access,kind:CatalogKind,row?:any){return permits(a,resources[kind],'manage',kind==='inboxes'?{tenantId:a.tenantId,ownerPrincipalId:row?.creator_principal_id??a.principalId,teamId:null,sharedTeamIds:[]}:undefined);}
  private manager(a:Access){return a.grants.some(g=>g.resource==='chat_inbox'&&g.action==='manage'&&g.scope==='all');}
  private canShare(a:Access,row:any){return row.creator_principal_id===a.principalId&&permits(a,'chat_inbox','share',{tenantId:a.tenantId,ownerPrincipalId:a.principalId,teamId:null,sharedTeamIds:[]});}
  private async shares(s:TransactionScope,id:string){return (await s.query('SELECT target_kind kind,target_id id FROM chat_inbox_share WHERE tenant_id=? AND inbox_id=? ORDER BY target_kind,target_id',[s.context.tenantId,id])) as {kind:'principal'|'team';id:string}[];}
  private async visible(s:TransactionScope,a:Access,row:any,includeManager=true){if(row.creator_principal_id===a.principalId||includeManager&&this.manager(a))return true;return (await this.shares(s,row.id)).some(x=>x.kind==='principal'?x.id===a.principalId:a.teamIds.includes(x.id));}
  private readGrant(a:Access,kind:CatalogKind){if(kind==='snippets'&&!permits(a,'chat_snippet','read'))throw new CommandError(403,'FORBIDDEN');if(kind==='tags'&&(!a.grants.some(g=>g.resource==='conversation'&&g.action==='read')||!fieldAllowed(a,'conversation','tags','read')))throw new CommandError(403,'FIELD_FORBIDDEN');}
  async row(s:TransactionScope,a:Access,kind:CatalogKind,id:string,includeArchived=false){
    if(!uuid(id))throw bad();this.readGrant(a,kind);const [row]=await s.query(`SELECT * FROM ${catalogTables[kind]} WHERE tenant_id=? AND id=?`,[s.context.tenantId,id]);
    if(!row||!includeArchived&&row.archived_at||kind==='inboxes'&&!await this.visible(s,a,row))throw new CommandError(404,'NOT_FOUND');return row;
  }
  async project(s:TransactionScope,a:Access,kind:CatalogKind,row:any){
    const allowed_actions:string[]=[];if(this.manages(a,kind,row))allowed_actions.push('update','archive');
    const common={id:row.id,version:String(row.version),archived:!!row.archived_at,allowed_actions};
    if(kind==='tags')return {...common,name:row.name,color:row.color};
    if(kind==='snippets')return {...common,title:row.title,shortcut:row.shortcut,text:row.text};
    if(this.canShare(a,row))allowed_actions.push('share');if(this.manager(a))allowed_actions.push('transfer');
    return {...common,name:row.name,creator_principal_id:row.creator_principal_id,predicate_schema_version:1,predicate:json(row.predicate),sort:row.sort,shared:row.creator_principal_id!==a.principalId,...(row.creator_principal_id===a.principalId||this.manager(a)?{shares:await this.shares(s,row.id)}:{})};
  }
  private sign(v:unknown){const p=Buffer.from(JSON.stringify(v)).toString('base64url');return p+'.'+createHmac('sha256',this.secret).update(p).digest('base64url');}
  private position(token:unknown,binding:string){if(token===undefined)return '';let v:any;try{if(typeof token!=='string'||token.length>4096)throw bad();const [p,sig,...tail]=token.split('.'),expected=createHmac('sha256',this.secret).update(p!).digest('base64url');if(tail.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw bad();v=JSON.parse(Buffer.from(p!,'base64url').toString());if(!uuid(v.id)||!Number.isFinite(v.exp))throw bad();}catch{throw new CommandError(400,'INVALID_CURSOR');}if(v.exp<Date.now())throw new CommandError(400,'CURSOR_EXPIRED');if(v.binding!==binding)throw new CommandError(409,'QUERY_CHANGED');return v.id as string;}
  async listInScope(s:TransactionScope,a:Access,kind:CatalogKind,input:Record<string,unknown>){
    this.readGrant(a,kind);const q=object(input,['limit','cursor',...(kind==='inboxes'?['group']:['q'])]),limit=Number(q.limit??50),prefix=q.q===undefined?'':catalogNormalize(text(q.q,80)),group=q.group??'all';
    if(!Number.isInteger(limit)||limit<1||limit>100||!['all','by_me','by_others'].includes(group)||Object.values(q).some(v=>typeof v!=='string'&&typeof v!=='number'))throw bad();
    const binding=createHmac('sha256',this.secret).update(canonical({a,kind,limit,prefix,group})).digest('hex');let after=this.position(q.cursor,binding);const selected:any[]=[];
    for(;;){const rows=await s.query(`SELECT * FROM ${catalogTables[kind]} WHERE tenant_id=? AND archived_at IS NULL AND id>? ORDER BY id LIMIT 100`,[s.context.tenantId,after]);
      for(const row of rows){if(kind==='inboxes'&&(!await this.visible(s,a,row,false)||group==='by_me'&&row.creator_principal_id!==a.principalId||group==='by_others'&&row.creator_principal_id===a.principalId))continue;if(prefix&&![row.name,row.title,row.shortcut].some(v=>typeof v==='string'&&catalogNormalize(v).startsWith(prefix)))continue;selected.push(row);if(selected.length>limit)break;}
      if(selected.length>limit||rows.length<100)break;after=rows.at(-1).id;
    }
    const data=[];for(const row of selected.slice(0,limit))data.push(await this.project(s,a,kind,row));return {data,next_cursor:selected.length>limit?this.sign({binding,id:selected[limit-1].id,exp:Date.now()+300000}):null,meta:{as_of:new Date().toISOString(),allowed_actions:this.manages(a,kind)?['create']:[]}};
  }
  list(account:string,tenant:string,kind:CatalogKind,input:Record<string,unknown>){return this.run(account,tenant,false,(s,a)=>this.listInScope(s,a,kind,input));}
  get(account:string,tenant:string,kind:CatalogKind,id:string){return this.run(account,tenant,false,async(s,a)=>({data:await this.project(s,a,kind,await this.row(s,a,kind,id)),meta:{as_of:new Date().toISOString()}}));}
  private async validatePredicate(s:TransactionScope,a:Access,p:any){
    if(p.snooze==='only')throw new CommandError(409,'CAPABILITY_UNAVAILABLE');
    if(p.team_id)await this.identity.target(s,'team',p.team_id);if(p.channel_id)await new ChannelReferences().metadata(s,p.channel_id);
    if(p.tag_ids){if(!fieldAllowed(a,'conversation','tags','filter'))throw new CommandError(403,'FIELD_FORBIDDEN');for(const id of p.tag_ids)await this.row(s,a,'tags',id,true);}
    for(const field of ['status',...(p.scope==='mine'||p.scope==='unassigned'?['owner_principal_id']:[]),...(p.team_id?['team_id']:[]),...(p.channel?['channel']:[]),...(p.channel_id?['channel_id']:[])])if(!fieldAllowed(a,'conversation',field,'filter'))throw new CommandError(403,'FIELD_FORBIDDEN');
  }
  private version(row:any,v:unknown){if(v===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(typeof v!=='string'||!/^(?:"[1-9][0-9]{0,19}"|[1-9][0-9]{0,19})$/.test(v))throw bad();if(v.replaceAll('"','')!==String(row.version))throw new CommandError(409,'VERSION_CONFLICT');}
  private async event(s:TransactionScope,a:Access,type:string,aggregate:string,id:string,version:string,data:unknown,correlation:string){await s.query("INSERT INTO outbox_event(id,tenant_id,event_type,schema_version,aggregate_type,aggregate_id,aggregate_version,payload,correlation_id,actor_kind,actor_id,occurred_at,created_at,status) VALUES (?,?,?,1,?,?,?,?,?,'human',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),'pending')",[randomUUID(),a.tenantId,type,aggregate,id,version,JSON.stringify(data),correlation,a.principalId]);}
  mutate(account:string,tenant:string,kind:CatalogKind,operation:'create'|'update'|'archive'|'shares',id:string|undefined,input:unknown,key:string,version:unknown,correlation:string){return this.run(account,tenant,true,async(s,a)=>{
    if(typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key))throw bad();if(operation==='shares'&&kind!=='inboxes')throw bad();const body=object(input);const creating=operation==='create';let row=creating?undefined:await this.row(s,a,kind,id!,true);
    if(!this.manages(a,kind,row)||operation==='shares'&&(!row||!this.canShare(a,row)))throw new CommandError(403,'FORBIDDEN');
    const command={actorId:a.principalId,route:`${operation} /api/v1/chat-workspace/${kind}/${id??''}`,body,key,version:typeof version==='string'?version:undefined,correlationId:correlation};
    const replay=await this.commands.replay(s,command,async response=>{const target=await this.row(s,a,kind,String(response.body.data.id),true);if(!this.manages(a,kind,target)||operation==='shares'&&!this.canShare(a,target)||creating&&Array.isArray(body.shares)&&body.shares.length&&!this.canShare(a,target))throw new CommandError(403,'FORBIDDEN');});if(replay)return replay;
    if(!creating){this.version(row,version);if(row.archived_at)throw new CommandError(409,'ARCHIVED');}
    const values:Record<string,unknown>={};let shares:{kind:'principal'|'team';id:string}[]|undefined,eventOperation:string=creating?'created':operation==='archive'?'archived':operation==='shares'?'shared':'updated';
    if(operation==='archive'){object(body,[]);values.archived_at=new Date();}
    else if(kind==='tags'){
      object(body,['name','color']);if(creating||body.name!==undefined){values.name=text(body.name,40);values.normalized_name=Buffer.from(catalogNormalize(values.name as string));}if(creating||body.color!==undefined){if(!['gray','blue','green','amber','red','purple'].includes(body.color))throw bad();values.color=body.color;}
      if(values.normalized_name&&(await s.query('SELECT id FROM conversation_tag WHERE tenant_id=? AND normalized_name=? AND id<>?',[tenant,values.normalized_name,id??'']))[0])throw new CommandError(409,'NAME_CONFLICT');
    }else if(kind==='snippets'){
      object(body,['title','shortcut','text']);for(const [k,max] of [['title',80],['text',4000]] as const)if(creating||body[k]!==undefined)values[k]=text(body[k],max);
      if(creating||body.text!==undefined){if(typeof body.text!=='string'||body.text.length>4000)throw bad();values.text=body.text;}
      if(creating||body.shortcut!==undefined){if(typeof body.shortcut!=='string'||!/^[a-z0-9_-]{1,32}$/.test(body.shortcut))throw bad();values.shortcut=body.shortcut;}
      if(values.shortcut&&(await s.query('SELECT id FROM chat_snippet WHERE tenant_id=? AND shortcut=? AND id<>?',[tenant,values.shortcut,id??'']))[0])throw new CommandError(409,'SHORTCUT_CONFLICT');
    }else{
      object(body,operation==='shares'?['shares']:creating?['name','predicate_schema_version','predicate','sort','shares']:['name','predicate_schema_version','predicate','sort','creator_principal_id']);
      if(operation==='shares'||creating){shares=shareTargets(body.shares);if(shares.length&&!this.canShare(a,row??{creator_principal_id:a.principalId}))throw new CommandError(403,'FORBIDDEN');for(const t of shares)await this.identity.target(s,t.kind,t.id);}
      if(operation!=='shares'){
        if(creating||body.name!==undefined)values.name=text(body.name,80);
        if(creating||body.predicate!==undefined){if(body.predicate_schema_version!==1)throw bad();const predicate=savedPredicate(body.predicate);await this.validatePredicate(s,a,predicate);values.predicate=JSON.stringify(predicate);}
        else if(body.predicate_schema_version!==undefined)throw bad();
        if(creating||body.sort!==undefined){if(!sorts.includes(body.sort))throw bad();values.sort=body.sort;}
        if(creating)values.creator_principal_id=a.principalId;
        else if(body.creator_principal_id!==undefined){if(!this.manager(a)||!uuid(body.creator_principal_id))throw new CommandError(403,'FORBIDDEN');await this.identity.target(s,'principal',body.creator_principal_id);values.creator_principal_id=body.creator_principal_id;eventOperation='transferred';}
        if(values.creator_principal_id){const [{n}]=await s.query('SELECT COUNT(*) n FROM chat_inbox WHERE tenant_id=? AND creator_principal_id=? AND archived_at IS NULL AND id<>?',[tenant,values.creator_principal_id,id??'']);if(Number(n)>=50)throw new CommandError(409,'INBOX_QUOTA');}
      }
    }
    if(!creating&&operation!=='shares'&&!Object.keys(values).length)throw bad();
    const target=id??randomUUID(),table=catalogTables[kind];
    if(creating)await s.query(`INSERT INTO ${table}(tenant_id,id,${Object.keys(values).map(k=>'`'+k+'`').join(',')},created_at,updated_at) VALUES (?,?,${Object.keys(values).map(()=>'?').join(',')},UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,[tenant,target,...Object.values(values)]);
    else await s.query(`UPDATE ${table} SET ${Object.keys(values).map(k=>'`'+k+'`=?').join(',')}${Object.keys(values).length?',':''}version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?`,[...Object.values(values),tenant,target]);
    if(shares){await s.query('DELETE FROM chat_inbox_share WHERE tenant_id=? AND inbox_id=?',[tenant,target]);for(const t of shares)await s.query('INSERT INTO chat_inbox_share VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[tenant,target,t.kind,t.id]);}
    [row]=await s.query(`SELECT * FROM ${table} WHERE tenant_id=? AND id=?`,[tenant,target]);const singular=kind==='inboxes'?'inbox':kind==='tags'?'tag':'snippet';
    await this.commands.audit(s,a.principalId,correlation,table,target,eventOperation,Object.keys(body));await this.event(s,a,kind==='tags'?'chat.tag_definition.changed':`chat.${singular}.changed`,table,target,String(row.version),{[singular+'_id']:target,operation:eventOperation},correlation);
    const result={status:creating?201:200,body:{data:operation==='archive'?{id:target,archived:true}:await this.project(s,a,kind,row),meta:{correlation_id:correlation}}};await this.commands.complete(s,command,result);return result;
  });}
  async tags(s:TransactionScope,a:Access,id:string){if(!fieldAllowed(a,'conversation','tags','read'))return undefined;return (await s.query('SELECT t.id,t.name,t.color,t.archived_at FROM conversation_tag_link l JOIN conversation_tag t ON t.tenant_id=l.tenant_id AND t.id=l.tag_id WHERE l.tenant_id=? AND l.conversation_id=? ORDER BY t.id',[s.context.tenantId,id])).map((t:any)=>({id:t.id,name:t.name,color:t.color,archived:!!t.archived_at}));}
  tagLink(account:string,tenant:string,id:string,tagId:string,attach:boolean,key:string,correlation:string){return this.run(account,tenant,true,async(s,a)=>{
    if(!uuid(tagId)||typeof key!=='string'||!/^[\x21-\x7e]{1,128}$/.test(key))throw bad();const {record}=await conversation(s,id,true);requirePermission(a,record,'read');requirePermission(a,record,'update');if(!fieldAllowed(a,'conversation','tags','read')||!fieldAllowed(a,'conversation','tags','write'))throw new CommandError(403,'FIELD_FORBIDDEN');
    const command={actorId:a.principalId,route:`${attach?'PUT':'DELETE'} /api/v1/chat-workspace/conversations/${id}/tags/${tagId}`,body:{},key,correlationId:correlation};const replay=await this.commands.replay(s,command,async()=>{});if(replay)return replay;
    const tag=await this.row(s,a,'tags',tagId,true),links=await s.query('SELECT tag_id FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? ORDER BY tag_id',[tenant,id]),exists=links.some((l:any)=>l.tag_id===tagId);let changed=false;
    if(attach&&!exists){if(tag.archived_at)throw new CommandError(409,'ARCHIVED');if(links.length>=20)throw new CommandError(409,'TAG_QUOTA');await s.query('INSERT INTO conversation_tag_link VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[tenant,id,tagId,a.principalId]);changed=true;}
    if(!attach&&exists){await s.query('DELETE FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? AND tag_id=?',[tenant,id,tagId]);changed=true;}
    if(changed){await s.query('UPDATE conversation_workspace SET tag_set_revision=tag_set_revision+1 WHERE tenant_id=? AND conversation_id=?',[tenant,id]);await s.query('UPDATE crm_record SET version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[tenant,id]);}
    const [state]=await s.query('SELECT w.tag_set_revision,r.version FROM conversation_workspace w JOIN crm_record r ON r.tenant_id=w.tenant_id AND r.id=w.conversation_id WHERE w.tenant_id=? AND w.conversation_id=?',[tenant,id]);
    if(!state)throw new CommandError(503,'WORKSPACE_BACKFILLING');if(changed){await this.commands.audit(s,a.principalId,correlation,'conversation',id,attach?'tag_attached':'tag_detached',['tags']);await this.event(s,a,'chat.conversation_tag.changed','conversation',id,String(state.version),{conversation_id:id,tag_id:tagId,operation:attach?'attached':'detached',tag_set_revision:String(state.tag_set_revision)},correlation);}
    const result={status:200,body:{data:{conversation_id:id,tag_ids:(await s.query('SELECT tag_id FROM conversation_tag_link WHERE tenant_id=? AND conversation_id=? ORDER BY tag_id',[tenant,id])).map((l:any)=>l.tag_id),tag_set_revision:String(state.tag_set_revision),version:String(state.version)},meta:{correlation_id:correlation}}};await this.commands.complete(s,command,result);return result;
  });}
}
