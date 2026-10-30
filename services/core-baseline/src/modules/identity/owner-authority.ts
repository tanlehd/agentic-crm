import type { OwnerCommandBinding,OwnerResource } from '@agentic-crm/contracts';
import { ownerDigest, ownerCanonical, ownerFail, OwnerDomainError } from '@agentic-crm/workload-transport';
import { UnitOfWork, type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { AccessError, IdentityAuthorization, requireActiveTenant, requireService } from './authorization.js';
import { lockedNativeSession } from './auth/locked-session.js';
import { AuthError } from './auth/security.js';
import { PLATFORM_TENANT_ID } from '../../kernel/database/system-scope.js';
import { fieldAllowed, permits, type Access, type FieldAction } from './domain/authorization.js';
import { RoutingIdentityPort } from './routing-port.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { WorkspaceIdentityPort } from './workspace-port.js';
import { assignmentDirectory } from './assignment-directory.js';

/** Identity-local Human and enrolled Routing actor adapter. No dispatch grants or CRM SQL. */
export class NativeOwnerHumanAuthority {
  private readonly authorization: IdentityAuthorization;
  private readonly objects: ReadonlyMap<string, string>;
  private readonly projectionObjects:ReadonlyMap<string,{contact:string;activity:string;conversation_session?:string;conversation_need?:string;lead?:string;deal?:string}>;
  constructor(private readonly uow: UnitOfWork, conversationObjects: ReadonlyMap<string, string>,projectionObjects:ReadonlyMap<string,{contact:string;activity:string;conversation_session?:string;conversation_need?:string;lead?:string;deal?:string}>=new Map()) {
    this.authorization = new IdentityAuthorization(uow);
    this.objects = new Map(conversationObjects);
    this.projectionObjects=new Map([...projectionObjects].map(([tenant,ids])=>{
      const configured=[ids.contact,ids.activity,...(ids.conversation_session?[ids.conversation_session]:[]),...(ids.conversation_need?[ids.conversation_need]:[]),...(ids.lead?[ids.lead]:[]),...(ids.deal?[ids.deal]:[])];
      if(!conversationObjects.has(tenant)||!configured.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))||new Set([...configured,conversationObjects.get(tenant)]).size!==configured.length+1)throw new Error('IDENTITY_CANONICAL_FIELD_OBJECTS_REQUIRED');
      return [tenant,Object.freeze({...ids})];
    }));
  }

  private async policies(scope: TransactionScope, access: Access): Promise<Access> {
    const object = this.objects.get(scope.context.tenantId);
    if (!object) ownerFail('DEPENDENCY_UNAVAILABLE');
    if (access.superAdmin) return access;
    const roles = access.roleIds ?? [];
    if (!roles.length) return access;
    const projection=this.projectionObjects.get(scope.context.tenantId),names=new Map([[object,'conversation'],...(projection?Object.entries(projection).map(([key,id])=>[id,key]):[]) ] as [string,string][]),ids=[...names.keys()];
    const rows = await scope.query(`SELECT object_type_id,property_key,denied_actions FROM field_policy
      WHERE tenant_id=? AND object_type_id IN (${ids.map(()=>'?').join(',')}) AND role_id IN (${roles.map(() => '?').join(',')})`,
    [scope.context.tenantId, ...ids, ...roles]);
    return { ...access, fieldDenies: rows.map((row: { object_type_id:string;property_key: string; denied_actions: string | FieldAction[] }) => {
      const actions: unknown = typeof row.denied_actions === 'string' ? JSON.parse(row.denied_actions) : row.denied_actions;
      if (!Array.isArray(actions) || actions.some(a => !['read', 'write', 'filter', 'export'].includes(a))) ownerFail('FORBIDDEN');
      return { resource: names.get(row.object_type_id)!, field: row.property_key, actions: actions as FieldAction[] };
    }) };
  }

  async authorize(scope: TransactionScope, binding: OwnerCommandBinding) {
    try { return await this.check(scope, binding); }
    catch (error) {
      if (error instanceof AuthError) ownerFail('REVOKED');
      if (error instanceof AccessError) ownerFail(error.code === 'STALE_AUTHORIZATION' ? 'REVOKED' : 'FORBIDDEN');
      if (error instanceof CommandError) ownerFail(error.status === 422 ? 'REFERENCE_INVALID' : 'FORBIDDEN');
      throw error;
    }
  }
  private configurationRights(actor: Access) {
    if (!actor.capabilities.includes('configure') || !permits(actor, 'routing', 'manage') || !permits(actor, 'conversation', 'read') || !permits(actor, 'conversation', 'assign') ||
        !['owner_principal_id', 'team_id'].every(f => fieldAllowed(actor, 'conversation', f, 'read'))) ownerFail('FORBIDDEN');
  }
  async routingViewPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource,q=b.routing_view,tenant=scope.context.tenantId;
    if(b.tenant_id!==tenant||b.owner!=='routing'||b.operation!=='routing-view'||b.actor.kind!=='human'||r.resource_id!==tenant||r.object_key!=='routing_view'||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.fields.length||!q)ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b,false);
    if(q.mine){
      if(!actor.capabilities.includes('chat')||!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read')||q.profile_ids.some(id=>id!==actor.principalId)||q.session_ids.length)ownerFail('FORBIDDEN');
    }else if(!permits(actor,'routing','read')||!permits(actor,'conversation','read')||!permits(actor,'conversation','assign')||!['owner_principal_id','team_id'].every(f=>fieldAllowed(actor,'conversation',f,'read')))ownerFail('FORBIDDEN');
    const read={all:permits(actor,'conversation','read'),own:permits(actor,'conversation','read',{tenantId:tenant,ownerPrincipalId:actor.principalId,teamId:null,sharedTeamIds:[]}),team_ids:[...actor.teamIds].filter(id=>permits(actor,'conversation','read',{tenantId:tenant,ownerPrincipalId:null,teamId:id,sharedTeamIds:[]})).sort()};
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[] as string[],policy:{principal_id:actor.principalId,auth_revision:actor.revision,selection:q,read,allowed_fields:['owner_principal_id','team_id'].filter(f=>fieldAllowed(actor,'conversation',f,'read'))}};
  }
  async routingViewDirectory(scope:TransactionScope,b:OwnerCommandBinding){
    const {policy}=await this.routingViewPolicy(scope,b),q=policy.selection,tenant=scope.context.tenantId;
    const rows=q.profile_ids.length?await scope.query(`SELECT p.id,p.kind,p.status,p.availability,m.status membership_status,m.seat_code FROM principal p LEFT JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id IN (${q.profile_ids.map(()=>'?').join(',')})`,[tenant,...q.profile_ids]):[];
    const available=q.profile_ids.map(id=>{const p=rows.find((r:any)=>r.id===id);return {principal_id:id,available:!!p&&p.kind==='human'&&p.status==='active'&&p.availability==='available'&&p.membership_status==='active'&&['chat','admin'].includes(p.seat_code)};});
    const options=q.mine?{principals:[],teams:[]}:await new WorkspaceIdentityPort().inboxOptions(scope,true,true);
    const teams=q.mine?[]:(await new RoutingIdentityPort().teams(scope)).filter((t:any)=>['chat','general'].includes(t.purpose)).map((t:any)=>({id:t.id,name:t.name}));
    return {policy_digest:ownerDigest(policy),available,principals:options.principals,teams};
  }
  async catalogPolicy(scope: TransactionScope, b: OwnerCommandBinding) {
    const match=/^catalog-(list|create|get|patch|delete)-(tags|tag|snippets|snippet)$/.exec(b.operation),r=b.resource,tenant=scope.context.tenantId;
    if(!match||b.owner!=='chat'||b.tenant_id!==tenant||b.actor.kind!=='human'||r.object_key!=='chat_catalog'||r.resource_id!==tenant||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||r.archived||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.fields.length)ownerFail('FORBIDDEN');
    const kind=match[2]!.startsWith('tag')?'tags' as const:'snippets' as const,action=match[1]!;
    if((action==='list')!==['tags','snippets'].includes(match[2]!))ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b);
    const can_read=kind==='tags'?actor.grants.some(g=>g.resource==='conversation'&&g.action==='read')&&fieldAllowed(actor,'conversation','tags','read'):permits(actor,'chat_snippet','read');
    const can_manage=permits(actor,kind==='tags'?'conversation_tag':'chat_snippet','manage');
    if(action!=='create'&&!can_read){if(kind==='tags')throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);ownerFail('FORBIDDEN');}
    if(!['list','get'].includes(action)&&!can_manage)ownerFail('FORBIDDEN');
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[] as string[],policy:{kind,principal_id:actor.principalId,auth_revision:actor.revision,can_read,can_manage}};
  }
  private async catalogActor(scope:TransactionScope,b:OwnerCommandBinding,requireChat=true){
    const tenant=scope.context.tenantId;
    const [delegation]=await scope.query('SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=?',[tenant,b.actor.delegation_id]);
    if(!delegation||delegation.principal_id!==b.actor.principal_id)ownerFail('FORBIDDEN');
    const session=await lockedNativeSession(scope,delegation.session_hash);
    const [gate]=await scope.query('SELECT state FROM identity_account_gate WHERE tenant_id=? AND account_id=? FOR SHARE',[PLATFORM_TENANT_ID,session.accountId]);
    if(gate?.state==='closing')ownerFail('REVOKED');
    const actor=await this.policies(scope,await this.authorization.loadHuman(scope,session.accountId));
    if(actor.principalId!==b.actor.principal_id||actor.revision!==String(delegation.principal_revision)||session.securityRevision!==String(delegation.security_revision))ownerFail('REVOKED');
    if(requireChat&&!actor.capabilities.includes('chat'))ownerFail('FORBIDDEN');
    return {actor,accountId:session.accountId};
  }
  async inboxPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource,tenant=scope.context.tenantId;
    if(!['catalog-inbox-options','catalog-list-inboxes','catalog-create-inbox','catalog-get-inbox','catalog-patch-inbox','catalog-delete-inbox','catalog-inbox-shares'].includes(b.operation)||b.owner!=='chat'||b.tenant_id!==tenant||b.actor.kind!=='human'||r.object_key!=='chat_inbox_catalog'||r.resource_id!==tenant||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||r.archived||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.fields.length||!b.inbox_inputs)ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b),own={tenantId:tenant,ownerPrincipalId:actor.principalId,teamId:null,sharedTeamIds:[]};
    const can_manage_own=permits(actor,'chat_inbox','manage',own),can_manage_all=actor.grants.some(g=>g.resource==='chat_inbox'&&g.action==='manage'&&g.scope==='all'),can_share_own=permits(actor,'chat_inbox','share',own);
    if(!['catalog-list-inboxes','catalog-get-inbox'].includes(b.operation)&&!can_manage_own&&!can_manage_all)ownerFail('FORBIDDEN');
    const filter_fields=['status','owner_principal_id','team_id','channel','channel_id','tags'].filter(f=>fieldAllowed(actor,'conversation',f,'filter'));
    if(b.inbox_inputs.filter_fields.some(f=>!filter_fields.includes(f)))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    const references=new WorkspaceIdentityPort();
    if(b.inbox_inputs.filter_fields.includes('tags')&&!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read'))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    try{for(const target of b.inbox_inputs.targets)await references.target(scope,target.kind,target.id);}catch(error){if(error instanceof CommandError&&error.code==='INVALID_SHARE_TARGET')throw new OwnerDomainError('INVALID_SHARE_TARGET',b.command_id);throw error;}
    let directory:Awaited<ReturnType<WorkspaceIdentityPort['inboxOptions']>>|null=null;
    try{if(b.operation==='catalog-inbox-options')directory=await references.inboxOptions(scope,filter_fields.includes('team_id')||can_share_own,can_share_own);}catch(error){if(error instanceof CommandError&&error.code==='OPTIONS_LIMIT_EXCEEDED')throw new OwnerDomainError('OPTIONS_LIMIT_EXCEEDED',b.command_id);throw error;}
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[] as string[],policy:{principal_id:actor.principalId,auth_revision:actor.revision,team_ids:[...actor.teamIds].sort(),can_manage_own,can_manage_all,can_share_own,filter_fields,directory}};
  }
  async assignmentAccess(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource;
    const service=b.operation==='routing-proposal';
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||!['routing-proposal','routing-targets','conversation-classification-get-records-id-assignment-teams'].includes(b.operation)||b.actor.kind!==(service?'service':'human')||r.object_key!=='conversation'||r.archived||!b.target||b.target.principal_id!==null||b.target.kind!==null||b.session_id!==null||b.fields.length)ownerFail('FORBIDDEN');
    if(service){
      if(b.actor.delegation_id!==b.actor.principal_id||!b.target.team_id||!(await scope.query("SELECT id FROM service_actor WHERE tenant_id=? AND id=? AND active=1 AND `key`='human_routing_dispatch'",[b.tenant_id,b.actor.principal_id])).length)ownerFail('FORBIDDEN');
      const actor=await this.policies(scope,await new RoutingIdentityPort().service(scope,b.actor.principal_id));
      if(!permits(actor,'conversation','read')||!permits(actor,'conversation','assign')||!['owner_principal_id','team_id'].every(f=>fieldAllowed(actor,'conversation',f,'read')))ownerFail('FORBIDDEN');
      return {accountId:null,principalId:actor.principalId,revision:actor.revision,fields:[] as string[]};
    }
    const {actor,accountId}=await this.catalogActor(scope,b,false),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
    if(!permits(actor,'conversation','assign',record)&&!permits(actor,'conversation','takeover',record))ownerFail('FORBIDDEN');
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[] as string[]};
  }
  async assignmentDirectory(scope:TransactionScope,b:OwnerCommandBinding){
    const access=await this.assignmentAccess(scope,b),object=this.objects.get(b.tenant_id);
    if(!object)ownerFail('DEPENDENCY_UNAVAILABLE');
    return {...access,policy:{principal_id:access.principalId,auth_revision:access.revision,resource:b.resource,team_id:b.target!.team_id,...await assignmentDirectory(scope,b,object)}};
  }
  async conversationPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource;
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||!['conversation-get-conversations-id','conversation-post-conversations-id-transition'].includes(b.operation)||b.actor.kind!=='human'||r.object_key!=='conversation'||r.archived||!b.projection||b.target!==null||b.session_id!==null||ownerCanonical([...b.fields].sort())!==ownerCanonical(['attribution','channel','channel_id','channel_name','page_id','text']))ownerFail('FORBIDDEN');
    if(!this.projectionObjects.has(b.tenant_id))ownerFail('DEPENDENCY_UNAVAILABLE');
    const {actor,accountId}=await this.catalogActor(scope,b,false),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
    if(b.operation==='conversation-post-conversations-id-transition'&&(!permits(actor,'conversation','update',record)||!fieldAllowed(actor,'conversation','status','read')||!fieldAllowed(actor,'conversation','status','write')))ownerFail('FORBIDDEN');
    const fields=b.fields.filter(f=>fieldAllowed(actor,'conversation',f,'read'));
    const actions=['reply','note','update','assign','takeover'].filter(action=>permits(actor,'conversation',action,record)&&(['update','assign','takeover'].includes(action)||fieldAllowed(actor,'conversation','text','read')&&fieldAllowed(actor,'conversation','text','write'))&&(action!=='reply'||r.owner_principal_id===actor.principalId)&&(action!=='note'||fieldAllowed(actor,'activity','body','read')&&fieldAllowed(actor,'activity','body','write')));
    const [owner]=r.owner_principal_id?await scope.query("SELECT kind FROM principal WHERE tenant_id=? AND id=? AND kind IN ('human','ai')",[b.tenant_id,r.owner_principal_id]):[];
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,owner_kind:owner?.kind??null,allowed_fields:fields,allowed_actions:actions}};
  }
  async workspacePolicy(scope:TransactionScope,b:OwnerCommandBinding,resources:OwnerResource[]=[]){
    const r=b.resource,tenant=scope.context.tenantId;
    if(b.tenant_id!==tenant||b.owner!=='chat'||!['workspace-conversations','workspace-sidebar','conversation-get-conversations','conversation-channels'].includes(b.operation)||b.actor.kind!=='human'||r.object_key!=='chat_workspace_query'||r.resource_id!==tenant||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||!b.query_filter_fields||ownerCanonical([...b.fields].sort())!==ownerCanonical(['attribution','channel','channel_id','channel_name','page_id','tags','text']))ownerFail('FORBIDDEN');
    if(!this.projectionObjects.has(tenant))ownerFail('DEPENDENCY_UNAVAILABLE');
    const legacy=['conversation-get-conversations','conversation-channels'].includes(b.operation),{actor,accountId}=await this.catalogActor(scope,b,!legacy);
    if(legacy&&(!actor.capabilities.includes('read')||!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read')))ownerFail('FORBIDDEN');
    if(b.operation==='conversation-channels'&&['channel','channel_id','page_id','channel_name'].some(f=>!fieldAllowed(actor,'conversation',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    const filter_fields=['status','owner_principal_id','team_id','channel','channel_id','page_id','tags'].filter(f=>fieldAllowed(actor,'conversation',f,'filter'));
    if(fieldAllowed(actor,'contact','display_name','filter'))filter_fields.push('contact.display_name');
    if(b.query_filter_fields.some(f=>!filter_fields.includes(f)))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    const predicate=(action:string)=>({all:permits(actor,'conversation',action),own:permits(actor,'conversation',action,{tenantId:tenant,ownerPrincipalId:actor.principalId,teamId:null,sharedTeamIds:[]}),team_ids:[...actor.teamIds].filter(id=>permits(actor,'conversation',action,{tenantId:tenant,ownerPrincipalId:null,teamId:id,sharedTeamIds:[]})).sort()});
    const fields=b.fields.filter(f=>fieldAllowed(actor,'conversation',f,'read'));
    if(resources.length>100||new Set(resources.map(v=>v.resource_id)).size!==resources.length)ownerFail('INVALID_REQUEST');
    const owners=[...new Set(resources.map(v=>v.owner_principal_id).filter((id):id is string=>id!==null))];
    const kinds=owners.length?await scope.query(`SELECT id,kind FROM principal WHERE tenant_id=? AND id IN (${owners.map(()=>'?').join(',')}) AND kind IN ('human','ai')`,[tenant,...owners]):[];
    const rows=resources.map(resource=>{
      if(resource.object_key!=='conversation'||resource.archived)ownerFail('FORBIDDEN');
      const record={tenantId:tenant,ownerPrincipalId:resource.owner_principal_id,teamId:resource.team_id,sharedTeamIds:resource.shared_team_ids};
      if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
      const allowed_actions=['reply','note','update','assign','takeover'].filter(action=>permits(actor,'conversation',action,record)&&(['update','assign','takeover'].includes(action)||fieldAllowed(actor,'conversation','text','read')&&fieldAllowed(actor,'conversation','text','write'))&&(action!=='reply'||resource.owner_principal_id===actor.principalId)&&(action!=='note'||fieldAllowed(actor,'activity','body','read')&&fieldAllowed(actor,'activity','body','write')));
      return {id:resource.resource_id,policy:{principal_id:actor.principalId,auth_revision:actor.revision,owner_kind:kinds.find((v:{id:string})=>v.id===resource.owner_principal_id)?.kind??null,allowed_fields:fields,allowed_actions}};
    });
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,team_ids:[...actor.teamIds].sort(),read:predicate('read'),update:predicate('update'),allowed_fields:fields,filter_fields,tags_write:fieldAllowed(actor,'conversation','tags','write'),inbox_manage_all:permits(actor,'chat_inbox','manage'),rows}};
  }
  async contactBatchPolicy(scope:TransactionScope,b:OwnerCommandBinding,resources:OwnerResource[]){
    const current=await this.workspacePolicy(scope,b),{actor}=await this.catalogActor(scope,b,false);
    if(resources.length>100||new Set(resources.map(r=>r.resource_id)).size!==resources.length||resources.some(r=>r.object_key!=='contact'))ownerFail('FORBIDDEN');
    const data=resources.map(resource=>{
      const allowed=actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&resource.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===resource.team_id||resource.shared_team_ids.includes(t))));
      return {id:resource.resource_id,allowed,fields:allowed?['id','display_name','normalized_phone','normalized_email'].filter(f=>fieldAllowed(actor,'contact',f,'read')):[]};
    });
    return {principal_id:current.principalId,auth_revision:current.revision,data};
  }
  async contactPolicy(scope:TransactionScope,b:OwnerCommandBinding,resource:OwnerResource){
    await this.conversationPolicy(scope,b);
    if(resource.object_key!=='contact'||resource.resource_id!==b.projection!.contact_id)ownerFail('FORBIDDEN');
    const {actor}=await this.catalogActor(scope,b,false);
    const allowed=actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&resource.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===resource.team_id||resource.shared_team_ids.includes(t))));
    return {principal_id:actor.principalId,auth_revision:actor.revision,allowed,fields:allowed?['id','display_name','normalized_phone','normalized_email'].filter(f=>fieldAllowed(actor,'contact',f,'read')):[]};
  }
  async notePolicy(scope:TransactionScope,b:OwnerCommandBinding){
    if(!['conversation-get-conversations-id-notes','workspace-get-activity','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(b.operation)||!this.projectionObjects.has(b.tenant_id))ownerFail('FORBIDDEN');
    const current=await this.authorize(scope,b),{actor}=await this.catalogActor(scope,b,false);
    const allowed=(scope:string)=>actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='activity'&&g.action==='read'&&g.scope===scope);
    return {principal_id:current.principalId,auth_revision:current.revision,all:allowed('all'),own:allowed('own'),team_ids:allowed('team')?[...actor.teamIds].sort():[],body:fieldAllowed(actor,'activity','body','read')};
  }
  async activityPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource;
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.operation!=='workspace-get-activity'||b.actor.kind!=='human'||r.object_key!=='conversation'||r.archived||!b.projection||b.target!==null||b.session_id!==null||ownerCanonical([...b.fields].sort())!==ownerCanonical(['tags','text']))ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
    const fields=b.fields.filter(f=>fieldAllowed(actor,'conversation',f,'read'));
    const noteAllowed=(scope:string)=>actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='activity'&&g.action==='read'&&g.scope===scope);
    const notePolicy={principal_id:actor.principalId,auth_revision:actor.revision,all:noteAllowed('all'),own:noteAllowed('own'),team_ids:noteAllowed('team')?[...actor.teamIds].sort():[],body:fieldAllowed(actor,'activity','body','read')};
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,allowed_fields:fields,automation_read:permits(actor,'automation','read',record),note_policy_digest:ownerDigest(notePolicy)}};
  }
  async sessionProgressPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const process=['session-progress-get-session-process','session-progress-post-session-process'].includes(b.operation),write=b.operation.startsWith('session-progress-post-'),r=b.resource;
    if(!['session-progress-get-session-process','session-progress-post-session-process','session-progress-get-conversations-conversation-sessions-session-progress','session-progress-post-conversations-conversation-sessions-session-progress'].includes(b.operation)||b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||r.archived||b.target!==null)ownerFail('FORBIDDEN');
    const fields=process?[]:['attribution','channel','channel_id','contact_id','page_id','text'];
    if(ownerCanonical([...b.fields].sort())!==ownerCanonical(fields))ownerFail('FORBIDDEN');
    if(b.session_read_fields?.length&&(process||b.operation!=='session-progress-post-conversations-conversation-sessions-session-progress'))ownerFail('FORBIDDEN');
    if(process?(r.object_key!=='session_process'||r.resource_id!==b.tenant_id||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length>0||r.owner_revision!=='0'||r.control_revision!=='0'||b.session_id!==null||b.projection!==undefined):(r.object_key!=='conversation'||!b.session_id||!b.projection))ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b,false),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    let can_edit=false;
    if(process){can_edit=actor.capabilities.includes('configure')&&actor.grants.some(g=>g.resource==='schema'&&g.action==='update'&&g.scope==='all');if(write?!can_edit:!actor.capabilities.includes('read')||!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read'))ownerFail('FORBIDDEN');}
    else{
      if(!this.projectionObjects.has(b.tenant_id))ownerFail('DEPENDENCY_UNAVAILABLE');if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
      if(fields.some(f=>!fieldAllowed(actor,'conversation',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
      if(b.session_read_fields?.length){
        if(!this.projectionObjects.get(b.tenant_id)?.conversation_session)ownerFail('DEPENDENCY_UNAVAILABLE');
        if(b.session_read_fields.some(f=>!fieldAllowed(actor,'conversation_session',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
      }
      can_edit=permits(actor,'conversation','update',record)&&fieldAllowed(actor,'conversation','text','write');if(write&&!can_edit)ownerFail('FORBIDDEN');
    }
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,can_edit}};
  }
  async funnelPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource,fields=['attribution','channel','channel_id','contact_id','page_id','text'];
    if(b.operation!=='session-progress-get-session-funnel'||b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||r.object_key!=='session_funnel'||r.resource_id!==b.tenant_id||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.projection!==undefined||ownerCanonical(b.fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b,false);if(!actor.capabilities.includes('read')||!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read'))ownerFail('FORBIDDEN');
    if(!this.projectionObjects.has(b.tenant_id))ownerFail('DEPENDENCY_UNAVAILABLE');
    const read={all:permits(actor,'conversation','read'),own:permits(actor,'conversation','read',{tenantId:b.tenant_id,ownerPrincipalId:actor.principalId,teamId:null,sharedTeamIds:[]}),team_ids:[...actor.teamIds].filter(id=>permits(actor,'conversation','read',{tenantId:b.tenant_id,ownerPrincipalId:null,teamId:id,sharedTeamIds:[]})).sort()};
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,read,fields_visible:fields.every(f=>fieldAllowed(actor,'conversation',f,'read'))}};
  }
  async funnelContactPolicy(scope:TransactionScope,b:OwnerCommandBinding,resources:OwnerResource[]){
    const current=await this.funnelPolicy(scope,b),{actor}=await this.catalogActor(scope,b,false);if(resources.length>25||new Set(resources.map(r=>r.resource_id)).size!==resources.length||resources.some(r=>r.object_key!=='contact'))ownerFail('FORBIDDEN');
    const visible_ids=resources.filter(r=>!r.archived&&actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&r.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===r.team_id||r.shared_team_ids.includes(t))))).map(r=>r.resource_id);
    return {principal_id:current.principalId,auth_revision:current.revision,visible_ids};
  }
  private async sourceActor(scope:TransactionScope,b:OwnerCommandBinding){
    if(b.actor.kind==='human')return this.catalogActor(scope,b,false);
    if(b.actor.kind!=='service'||b.actor.delegation_id!==b.actor.principal_id)ownerFail('FORBIDDEN');
    return {accountId:null,actor:await this.policies(scope,await new RoutingIdentityPort().service(scope,b.actor.principal_id))};
  }
  async sessionSourcePolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const fields=['attribution','channel','channel_id','contact_id','page_id'],r=b.resource;
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.operation!=='session-source'||r.object_key!=='conversation'||r.archived||!b.projection||b.target!==null||b.graph!==null||ownerCanonical(b.fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');
    if(!this.projectionObjects.has(b.tenant_id))ownerFail('DEPENDENCY_UNAVAILABLE');
    const {actor,accountId}=await this.sourceActor(scope,b);
    if(!permits(actor,'conversation','read',{tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids}))ownerFail('NOT_FOUND');
    if(!fields.every(f=>fieldAllowed(actor,'conversation',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,can_edit:false,read_fields:fields,write_fields:[] as string[]}};
  }
  async needSourcePolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const fields=['assessment_status','need_clarity','intent','product_interest','unresolved_reason'];
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.operation!=='read-need'||b.actor.kind!=='service'||b.actor.delegation_id!==b.actor.principal_id||b.resource.object_key!=='conversation'||b.resource.archived||!b.projection||!b.session_id||!b.need||b.target!==null||b.graph!==null||ownerCanonical(b.fields)!==ownerCanonical(fields))ownerFail('FORBIDDEN');
    if(!this.projectionObjects.get(b.tenant_id)?.conversation_need)ownerFail('DEPENDENCY_UNAVAILABLE');
    const actor=await this.policies(scope,await new RoutingIdentityPort().service(scope,b.actor.principal_id));
    if(!permits(actor,'conversation','read')||!actor.capabilities.includes('read')||!actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&g.scope==='all'))ownerFail('FORBIDDEN');
    if(!['text','contact_id'].every(f=>fieldAllowed(actor,'conversation',f,'read'))||!fields.every(f=>fieldAllowed(actor,'conversation_need',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    return {accountId:null,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,can_edit:false,read_fields:fields,write_fields:[] as string[]}};
  }
  async sessionContactPolicy(scope:TransactionScope,b:OwnerCommandBinding,resource:OwnerResource){
    if(b.operation==='session-source'){
      const current=await this.sessionSourcePolicy(scope,b),actor=(await this.sourceActor(scope,b)).actor;
      if(resource.object_key!=='contact'||resource.resource_id!==b.projection!.contact_id)ownerFail('FORBIDDEN');
      const allowed=!resource.archived&&actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&resource.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===resource.team_id||resource.shared_team_ids.includes(t))));
      return {principal_id:current.principalId,auth_revision:current.revision,allowed};
    }
    if(b.operation==='read-need'){
      const current=await this.needSourcePolicy(scope,b);
      if(resource.object_key!=='contact'||resource.resource_id!==b.projection!.contact_id)ownerFail('FORBIDDEN');
      return {principal_id:current.principalId,auth_revision:current.revision,allowed:!resource.archived};
    }
    const current=['need-post-outcome','need-outcome-effect'].includes(b.operation)?await this.outcomeAccess(scope,b):(b.operation.startsWith('conversation-classification-')||b.operation.startsWith('need-'))?await this.classificationPolicy(scope,b):await this.sessionProgressPolicy(scope,b);if(!b.projection||resource.object_key!=='contact'||resource.resource_id!==b.projection.contact_id)ownerFail('FORBIDDEN');
    const {actor}=await this.catalogActor(scope,b,false),allowed=!resource.archived&&actor.capabilities.includes('read')&&actor.grants.some(g=>g.resource==='contact'&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&resource.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===resource.team_id||resource.shared_team_ids.includes(t))));
    return {principal_id:current.principalId,auth_revision:current.revision,allowed};
  }
  async classificationPolicy(scope:TransactionScope,b:OwnerCommandBinding){
    const need=b.operation.startsWith('need-'),resource=need?'conversation_need':'conversation_session',write=b.operation==='need-post-enrich'||b.operation==='need-post-assessment'||b.operation==='conversation-classification-post-conversations-conversation-sessions-session-classification',r=b.resource;
    if(!['need-get-assessment','need-post-assessment','need-post-enrich','conversation-classification-get-conversations-conversation-sessions-session-classification','conversation-classification-post-conversations-conversation-sessions-session-classification','conversation-classification-get-conversations-conversation-sessions-session-contributions'].includes(b.operation)||b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||r.object_key!=='conversation'||r.archived||b.target!==null||!b.session_id||!b.projection||!b.metadata||!b.session_write_fields||!write&&b.session_write_fields.length||need&&!b.need)ownerFail('FORBIDDEN');
    const object=this.projectionObjects.get(b.tenant_id)?.[resource];if(!object)ownerFail('DEPENDENCY_UNAVAILABLE');if(b.metadata.object_type_id!==object)ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b,false),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
    if(['contact_id','text'].some(f=>!fieldAllowed(actor,'conversation',f,'read')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    const can_edit=permits(actor,'conversation','update',record)&&fieldAllowed(actor,'conversation','text','write');if(write&&!can_edit)ownerFail('FORBIDDEN');
    if(b.session_write_fields.some(f=>!fieldAllowed(actor,resource,f,'read')||b.fields.includes(f)&&!fieldAllowed(actor,resource,f,'write')))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    const read_fields=b.fields.filter(f=>fieldAllowed(actor,resource,f,'read')),write_fields=read_fields.filter(f=>fieldAllowed(actor,resource,f,'write'));
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:read_fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,can_edit,read_fields,write_fields}};
  }
  async needOutcomesPolicy(scope:TransactionScope,b:OwnerCommandBinding,resources:OwnerResource[]){
    const current=await this.classificationPolicy(scope,b),{actor}=await this.catalogActor(scope,b,false),objects=this.projectionObjects.get(b.tenant_id);
    if(b.operation!=='need-get-assessment'||!b.need||resources.length>25||new Set(resources.map(r=>r.resource_id)).size!==resources.length||resources.some(r=>!['lead','deal'].includes(r.object_key)))ownerFail('FORBIDDEN');if(!objects?.lead||!objects.deal)ownerFail('DEPENDENCY_UNAVAILABLE');
    const data=resources.map(r=>{
      const granted=(action:string)=>actor.grants.some(g=>g.resource===r.object_key&&g.action===action&&(g.scope==='all'||g.scope==='own'&&r.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===r.team_id||r.shared_team_ids.includes(t))));
      const visible=!r.archived&&actor.capabilities.includes('read')&&granted('read'),can_link=visible&&(r.object_key==='lead'?actor.capabilities.some(c=>['chat','sales','service'].includes(c))&&granted('qualify'):actor.capabilities.includes('sales')&&granted('update'));
      return {id:r.resource_id,visible,can_link};
    });return {principal_id:current.principalId,auth_revision:current.revision,data};
  }
  private outcomeSalesAllowed(actor:Access,r:OwnerResource){
    if(!['lead','deal'].includes(r.object_key)||r.archived)return false;
    const granted=(action:string)=>actor.grants.some(g=>g.resource===r.object_key&&g.action===action&&(g.scope==='all'||g.scope==='own'&&r.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===r.team_id||r.shared_team_ids.includes(t))));
    return actor.capabilities.includes('read')&&granted('read')&&(r.object_key==='lead'?actor.capabilities.some(c=>['chat','sales','service'].includes(c))&&granted('qualify'):actor.capabilities.includes('sales')&&granted('update'))&&fieldAllowed(actor,r.object_key,'contact_id','read');
  }
  async outcomeAccess(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource,fields=['contact_id','text'],effect=b.operation==='need-outcome-effect';
    if(!['need-post-outcome','need-outcome-effect'].includes(b.operation)||b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||r.object_key!=='conversation'||r.archived||b.target!==null||!b.session_id||!b.projection||!b.need||!b.outcome||ownerCanonical(b.fields)!==ownerCanonical(fields)||effect!==Boolean(b.outcome.source))ownerFail('FORBIDDEN');
    const objects=this.projectionObjects.get(b.tenant_id);if(!objects?.lead||!objects.deal)ownerFail('DEPENDENCY_UNAVAILABLE');
    const {actor,accountId}=await this.catalogActor(scope,b,false),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');if(!permits(actor,'conversation','update',record))ownerFail('FORBIDDEN');
    if(fields.some(f=>!fieldAllowed(actor,'conversation',f,'read'))||!fieldAllowed(actor,'conversation','text','write'))throw new OwnerDomainError('FIELD_FORBIDDEN',b.command_id);
    if(effect&&(b.outcome.source!.resource.resource_id!==b.outcome.record_id||!this.outcomeSalesAllowed(actor,b.outcome.source!.resource)))ownerFail('FORBIDDEN');
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields,policy:{principal_id:actor.principalId,auth_revision:actor.revision,allowed:true}};
  }
  async outcomeLinkPolicy(scope:TransactionScope,b:OwnerCommandBinding,resource:OwnerResource){
    const access=await this.outcomeAccess(scope,b),{actor}=await this.catalogActor(scope,b,false);
    if(resource.resource_id!==b.outcome!.record_id||!['lead','deal'].includes(resource.object_key)||b.outcome!.source&&ownerCanonical(b.outcome!.source.resource)!==ownerCanonical(resource))ownerFail('FORBIDDEN');
    return {principal_id:access.principalId,auth_revision:access.revision,allowed:this.outcomeSalesAllowed(actor,resource)};
  }
  async contributionSalesPolicy(scope:TransactionScope,b:OwnerCommandBinding,resources:OwnerResource[]){
    const current=await this.classificationPolicy(scope,b),{actor}=await this.catalogActor(scope,b,false),objects=this.projectionObjects.get(b.tenant_id);
    if(b.operation!=='conversation-classification-get-conversations-conversation-sessions-session-contributions'||resources.length>50||new Set(resources.map(r=>r.resource_id)).size!==resources.length||resources.some(r=>!['lead','deal'].includes(r.object_key)))ownerFail('FORBIDDEN');
    if(!objects?.lead||!objects.deal)ownerFail('DEPENDENCY_UNAVAILABLE');
    const visible_ids=resources.filter(r=>!r.archived&&actor.capabilities.includes('read')&&fieldAllowed(actor,r.object_key,'contact_id','read')&&actor.grants.some(g=>g.resource===r.object_key&&g.action==='read'&&(g.scope==='all'||g.scope==='own'&&r.owner_principal_id===actor.principalId||g.scope==='team'&&actor.teamIds.some(t=>t===r.team_id||r.shared_team_ids.includes(t))))).map(r=>r.resource_id);
    return {principal_id:current.principalId,auth_revision:current.revision,visible_ids};
  }
  private async noteAccess(scope:TransactionScope,b:OwnerCommandBinding){
    const r=b.resource,effect=b.operation==='note-effect';
    if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||r.object_key!=='conversation'||r.archived||b.target!==null||!effect&&b.session_id!==null||effect&&!b.note||ownerCanonical([...b.fields].sort())!==ownerCanonical(['body','text'])||!this.projectionObjects.has(b.tenant_id))ownerFail('FORBIDDEN');
    const {actor,accountId}=await this.catalogActor(scope,b),record={tenantId:b.tenant_id,ownerPrincipalId:r.owner_principal_id,teamId:r.team_id,sharedTeamIds:r.shared_team_ids};
    if(!permits(actor,'conversation','read',record)||!permits(actor,'conversation','note',record)||!['read','write'].every(action=>fieldAllowed(actor,'conversation','text',action as FieldAction)&&fieldAllowed(actor,'activity','body',action as FieldAction)))ownerFail('FORBIDDEN');
    return {accountId,principalId:actor.principalId,revision:actor.revision,fields:['body','text']};
  }
  /** Identity-local public adapter check, including receipt replay; verifier never leaves Identity. */
  async configurationAccess(tenant: string, verifier: string) {
    return this.uow.run({ tenantId: tenant }, async scope => {
      await requireActiveTenant(scope, true);
      const session = await lockedNativeSession(scope, verifier);
      const actor = await this.policies(scope, await this.authorization.loadHuman(scope, session.accountId));
      this.configurationRights(actor); return actor.principalId;
    });
  }
  async routingViewAccess(tenant:string,verifier:string,mine:boolean){
    return this.uow.run({tenantId:tenant},async scope=>{
      await requireActiveTenant(scope,true);const session=await lockedNativeSession(scope,verifier),actor=await this.policies(scope,await this.authorization.loadHuman(scope,session.accountId));
      if(mine){if(!actor.capabilities.includes('chat')||!actor.grants.some(g=>g.resource==='conversation'&&g.action==='read'))ownerFail('FORBIDDEN');}
      else if(!permits(actor,'routing','read')||!permits(actor,'conversation','read')||!permits(actor,'conversation','assign')||!['owner_principal_id','team_id'].every(f=>fieldAllowed(actor,'conversation',f,'read')))ownerFail('FORBIDDEN');
      return actor.principalId;
    });
  }
  private async configuration(scope: TransactionScope, b: OwnerCommandBinding) {
    const tenant = scope.context.tenantId;
    if (b.tenant_id !== tenant || b.actor.kind !== 'human' || b.resource.object_key !== 'routing_configuration' ||
        !['routing-configuration-profile', 'routing-configuration-team-skills', 'routing-configuration-queue', 'routing-configuration-skill'].includes(b.operation)) ownerFail('FORBIDDEN');
    const [delegation] = await scope.query('SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=?', [tenant, b.actor.delegation_id]);
    if (!delegation || delegation.principal_id !== b.actor.principal_id) ownerFail('FORBIDDEN');
    const session = await lockedNativeSession(scope, delegation.session_hash);
    const [gate] = await scope.query('SELECT state FROM identity_account_gate WHERE tenant_id=? AND account_id=? FOR SHARE', [PLATFORM_TENANT_ID, session.accountId]);
    if (gate?.state === 'closing') ownerFail('REVOKED');
    const actor = await this.policies(scope, await this.authorization.loadHuman(scope, session.accountId));
    if (actor.principalId !== b.actor.principal_id || actor.revision !== String(delegation.principal_revision) || session.securityRevision !== String(delegation.security_revision)) ownerFail('REVOKED');
    this.configurationRights(actor);
    if (b.operation === 'routing-configuration-profile') {
      if (!b.target || b.target.kind !== 'human' || b.target.principal_id !== b.resource.resource_id) ownerFail('FORBIDDEN');
      const person = await new RoutingIdentityPort().principal(scope, b.target.principal_id);
      if (!person || person.kind !== 'human' || !person.access.capabilities.includes('chat')) ownerFail('REFERENCE_INVALID');
      if (!(await scope.query("SELECT p.id FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id WHERE p.tenant_id=? AND p.id=? AND p.status='active' AND m.status='active'", [tenant, b.target.principal_id])).length) ownerFail('REFERENCE_INVALID');
    } else if (b.operation !== 'routing-configuration-skill') {
      if (!b.target?.team_id || b.operation === 'routing-configuration-team-skills' && b.target.team_id !== b.resource.resource_id) ownerFail('FORBIDDEN');
      await new RoutingIdentityPort().chatTeam(scope, b.target.team_id);
      if (b.operation === 'routing-configuration-queue') await new RoutingIdentityPort().humanRoutingActor(scope, true);
    }
    return { accountId: session.accountId, principalId: actor.principalId, revision: actor.revision, fields: [...b.fields] };
  }
  private async check(scope: TransactionScope, binding: OwnerCommandBinding) {
    if(binding.operation==='session-source')return this.sessionSourcePolicy(scope,binding);
    if(binding.operation==='read-need')return this.needSourcePolicy(scope,binding);
    if(binding.operation==='routing-view'&&binding.owner==='routing')return this.routingViewPolicy(scope,binding);
    if(binding.operation==='routing-reply-facts'){
      const b=binding,r=b.resource,tenant=scope.context.tenantId;
      if(b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||r.resource_id!==tenant||r.object_key!=='routing_facts'||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||!b.routing_snapshot||b.target!==null||b.session_id!==null||ownerCanonical(b.fields)!==ownerCanonical(['owner_principal_id','team_id']))ownerFail('FORBIDDEN');
      const {actor,accountId}=await this.catalogActor(scope,b,false);
      if(!permits(actor,'routing','read')||!permits(actor,'conversation','read')||!permits(actor,'conversation','assign')||!b.fields.every(f=>fieldAllowed(actor,'conversation',f,'read')))ownerFail('FORBIDDEN');
      return {accountId,principalId:actor.principalId,revision:actor.revision,fields:b.fields};
    }
    if(binding.operation==='routing-sync-snapshot'){
      const b=binding,r=b.resource,tenant=scope.context.tenantId;
      if(b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='service'||b.actor.delegation_id!==b.actor.principal_id||r.resource_id!==tenant||r.object_key!=='routing_sync'||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||!b.routing_snapshot||b.target!==null||b.session_id!==null||ownerCanonical(b.fields)!==ownerCanonical(['channel_id','owner_principal_id','team_id']))ownerFail('FORBIDDEN');
      if(!(await scope.query("SELECT id FROM service_actor WHERE tenant_id=? AND id=? AND active=1 AND `key`='human_routing_dispatch'",[tenant,b.actor.principal_id])).length)ownerFail('FORBIDDEN');
      const actor=await this.policies(scope,await new RoutingIdentityPort().service(scope,b.actor.principal_id));
      if(!permits(actor,'conversation','read')||!permits(actor,'conversation','assign')||!b.fields.every(f=>fieldAllowed(actor,'conversation',f,'read')))ownerFail('FORBIDDEN');
      return {accountId:null,principalId:actor.principalId,revision:actor.revision,fields:b.fields};
    }
    if(['routing-proposal','routing-targets','conversation-classification-get-records-id-assignment-teams'].includes(binding.operation))return this.assignmentAccess(scope,binding);
    if(['need-post-outcome','need-outcome-effect'].includes(binding.operation))return this.outcomeAccess(scope,binding);
    if(['need-get-assessment','need-post-assessment','need-post-enrich'].includes(binding.operation))return this.classificationPolicy(scope,binding);
    if(binding.operation==='session-progress-get-session-funnel')return this.funnelPolicy(scope,binding);
    if(binding.operation.startsWith('conversation-classification-'))return this.classificationPolicy(scope,binding);
    if(binding.operation==='workspace-get-activity')return this.activityPolicy(scope,binding);
    if(binding.operation.startsWith('session-progress-'))return this.sessionProgressPolicy(scope,binding);
    if(['note-effect','conversation-post-conversations-id-notes'].includes(binding.operation))return this.noteAccess(scope,binding);
    if(binding.resource.object_key==='chat_workspace_query')return this.workspacePolicy(scope,binding);
    if(['conversation-get-conversations-id','conversation-post-conversations-id-transition'].includes(binding.operation))return this.conversationPolicy(scope,binding);
    if(binding.resource.object_key==='chat_runtime'){
      const b=binding,r=b.resource;
      if(b.tenant_id!==scope.context.tenantId||b.owner!=='chat'||b.actor.kind!=='human'||!['workspace-capabilities','runtime-capabilities'].includes(b.operation)||r.resource_id!==b.tenant_id||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||r.archived||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.fields.length)ownerFail('FORBIDDEN');
      const {actor,accountId}=await this.catalogActor(scope,b);
      return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[] as string[]};
    }
    if (binding.resource.object_key === 'chat_inbox_catalog') return this.inboxPolicy(scope, binding);
    if (binding.resource.object_key === 'chat_catalog') return this.catalogPolicy(scope, binding);
    if (binding.owner === 'routing') return this.configuration(scope, binding);
    if (binding.owner === 'chat' && ['ingress-accept', 'ingress-process', 'ingress-receipt'].includes(binding.operation)) {
      const b = binding, pin = b.ingress_channel;
      if (b.tenant_id !== scope.context.tenantId || b.actor.kind !== 'service' || !pin || !b.references || b.operation === 'ingress-process' && !b.metadata || b.actor.principal_id !== pin.service_actor_id || b.actor.delegation_id !== b.actor.principal_id || b.resource.object_key !== 'conversation' || b.target !== null || b.session_id !== null || b.fields.length || b.graph !== null) ownerFail('FORBIDDEN');
      const actor = await requireService(scope, pin.service_actor_id, 'integration', 'deliver');
      await new RoutingIdentityPort().chatTeam(scope, pin.team_id);
      return { accountId: null, principalId: actor.id, revision: actor.revision, fields: [] as string[] };
    }
    const tenant = scope.context.tenantId, b = binding, r = b.resource;
    if(b.operation==='routing-reroute-source'){
      if(b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||r.object_key!=='routing_source'||r.resource_id!==tenant||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||ownerCanonical(b.fields)!==ownerCanonical(['owner_principal_id','team_id']))ownerFail('FORBIDDEN');
      const {actor,accountId}=await this.catalogActor(scope,b,false);this.configurationRights(actor);
      return {accountId,principalId:actor.principalId,revision:actor.revision,fields:[...b.fields]};
    }
    const recordRead = b.operation === 'record-get';
    const customRead = b.operation === 'custom-values-receipt' || recordRead;
    const receiptRead = ['routing-assignment-receipt', 'routing-takeover-receipt'].includes(b.operation) || customRead;
    const historyRead = b.operation === 'routing-history';
    const close = b.operation === 'conversation-close';
    const custom = b.operation === 'custom-values-patch';
    const timeline = ['conversation-get-conversations-id-messages', 'conversation-get-conversations-id-message-envelopes', 'conversation-get-conversations-id-message-envelopes-v3'].includes(b.operation);
    const acquisition = b.operation === 'conversation-get-conversations-id-acquisition-sessions';
    const statusRead = b.operation === 'conversation-get-conversations-id-outbound-intents-intentId';
    const send = ['contact-bound-send', 'conversation-post-conversations-id-messages'].includes(b.operation);
    const tagLink = ['catalog-put-conversation-tag', 'catalog-delete-conversation-tag'].includes(b.operation);
    const workspace = tagLink || ['workspace-conversations-id-read-state', 'workspace-mark-read', 'workspace-get-snooze', 'workspace-put-snooze', 'workspace-post-wake'].includes(b.operation);
    const chatRead = timeline || acquisition || statusRead || b.operation === 'conversation-get-conversations-id-notes';
    const readFields = timeline ? ['text'] : acquisition ? ['attribution', 'channel', 'channel_id', 'contact_id', 'page_id'] : [];
    if (b.tenant_id !== tenant || b.owner !== 'chat' || !['human', 'service'].includes(b.actor.kind) || r.object_key !== 'conversation' || r.archived && !historyRead ||
        !workspace && !chatRead && !send && !['routing-assignment', 'routing-takeover', 'routing-assignment-receipt', 'routing-takeover-receipt', 'conversation-close', 'routing-history', 'custom-values-patch', 'custom-values-receipt','record-get'].includes(b.operation) || (!workspace && !receiptRead && !historyRead && !custom && !chatRead && !send && (!b.target || !b.session_id)) ||
        !custom && !customRead && ownerCanonical([...b.fields].sort()) !== ownerCanonical(workspace ? tagLink ? ['tags'] : b.operation === 'workspace-get-snooze' ? ['reason'] : [] : send ? ['text'] : chatRead ? readFields : historyRead ? [] : close ? ['status'] : ['owner_principal_id', 'team_id']) ||
        (workspace || close || historyRead || custom || customRead || chatRead || send) && b.actor.kind !== 'human' || (workspace || historyRead || custom || customRead || chatRead || send) && (b.target !== null || b.session_id !== null) ||
        custom && (!b.metadata || b.metadata.object_type_id !== this.objects.get(tenant) || !b.fields.length) ||
        (custom || customRead) && b.fields.some(field => !/^[a-z][a-z0-9_]{0,63}$/.test(field)) ||
        b.record_read_fields!==undefined&&(!custom||b.record_read_fields.some(field=>!/^[a-z][a-z0-9_]{0,63}$/.test(field)))) ownerFail('FORBIDDEN');
    let accountId: string | null = null, actor: Access;
    if (b.actor.kind === 'human') {
      const [delegation] = await scope.query('SELECT * FROM identity_dispatch_delegation WHERE tenant_id=? AND id=?', [tenant, b.actor.delegation_id]);
      if (!delegation || delegation.principal_id !== b.actor.principal_id) ownerFail('FORBIDDEN');
      const session = await lockedNativeSession(scope, delegation.session_hash); accountId = session.accountId;
      const [accountGate] = await scope.query('SELECT state FROM identity_account_gate WHERE tenant_id=? AND account_id=? FOR SHARE', [PLATFORM_TENANT_ID, accountId]);
      if (accountGate?.state === 'closing') ownerFail('REVOKED');
      actor = await this.policies(scope, await this.authorization.loadHuman(scope, accountId));
      if (actor.principalId !== b.actor.principal_id || actor.revision !== String(delegation.principal_revision) || session.securityRevision !== String(delegation.security_revision)) ownerFail('REVOKED');
    } else {
      if (b.actor.delegation_id !== b.actor.principal_id || b.operation.startsWith('routing-takeover')) ownerFail('FORBIDDEN');
      const [registered] = await scope.query("SELECT id FROM service_actor WHERE tenant_id=? AND id=? AND `key`='human_routing_dispatch' AND active=1", [tenant, b.actor.principal_id]);
      if (!registered) ownerFail('FORBIDDEN');
      actor = await this.policies(scope, await new RoutingIdentityPort().service(scope, registered.id));
    }
    const record = { tenantId: tenant, ownerPrincipalId: r.owner_principal_id, teamId: r.team_id, sharedTeamIds: r.shared_team_ids };
    if(b.routing_reroute){
      if(b.routing_dispatch||b.actor.kind!=='human'||b.operation!=='routing-assignment')ownerFail('FORBIDDEN');
      this.configurationRights(actor);
    }
    if (workspace) {
      if (!actor.capabilities.includes('chat')) ownerFail('FORBIDDEN');
      if (!permits(actor, 'conversation', 'read', record)) ownerFail('NOT_FOUND');
      const update = permits(actor, 'conversation', 'update', record);
      if ((tagLink || ['workspace-put-snooze', 'workspace-post-wake'].includes(b.operation)) && !update) ownerFail('FORBIDDEN');
      if (tagLink && (!fieldAllowed(actor, 'conversation', 'tags', 'read') || !fieldAllowed(actor, 'conversation', 'tags', 'write'))) throw new OwnerDomainError('FIELD_FORBIDDEN', b.command_id);
      return { accountId, principalId: actor.principalId, revision: actor.revision, fields: tagLink ? ['tags'] : b.operation === 'workspace-get-snooze' && update ? ['reason'] : [] };
    }
    if (send) {
      if (!permits(actor, 'conversation', 'read', record) || !permits(actor, 'conversation', 'reply', record) ||
          !fieldAllowed(actor, 'conversation', 'text', 'read') || !fieldAllowed(actor, 'conversation', 'text', 'write')) ownerFail('FORBIDDEN');
      return { accountId, principalId: actor.principalId, revision: actor.revision, fields: ['text'] };
    }
    if (chatRead) {
      if (!permits(actor, 'conversation', 'read', record)) ownerFail('NOT_FOUND');
      const fields = b.fields.filter(field => fieldAllowed(actor, 'conversation', field, 'read'));
      if (acquisition && fields.length !== b.fields.length) throw new OwnerDomainError('FIELD_FORBIDDEN', b.command_id);
      return { accountId, principalId: actor.principalId, revision: actor.revision, fields };
    }
    if (historyRead) {
      if (!permits(actor, 'conversation', 'read', record)) ownerFail('NOT_FOUND');
      if (!permits(actor, 'conversation', 'assign', record) && !permits(actor, 'conversation', 'takeover', record)) ownerFail('FORBIDDEN');
      return { accountId, principalId: actor.principalId, revision: actor.revision, fields: [] };
    }
    if(recordRead){
      if(!permits(actor,'conversation','read',record))ownerFail('NOT_FOUND');
      return {accountId,principalId:actor.principalId,revision:actor.revision,fields:b.fields.filter(field=>fieldAllowed(actor,'conversation',field,'read'))};
    }
    if (!permits(actor, 'conversation', 'read', record) ||
        !customRead && !permits(actor, 'conversation', close || custom ? 'update' : b.operation.startsWith('routing-takeover') ? 'takeover' : 'assign', record) ||
        !b.fields.every(field => fieldAllowed(actor, 'conversation', field, 'read') && (receiptRead || fieldAllowed(actor, 'conversation', field, 'write')))) ownerFail('FORBIDDEN');
    if (receiptRead || custom) return { accountId, principalId: actor.principalId, revision: actor.revision, fields: custom&&b.record_read_fields?b.record_read_fields.filter(field=>fieldAllowed(actor,'conversation',field,'read')):[...b.fields] };
    if (!b.target) ownerFail('INVALID_REQUEST');
    if (close) {
      if (b.target.principal_id !== r.owner_principal_id || b.target.team_id !== r.team_id) ownerFail('FORBIDDEN');
      return { accountId, principalId: actor.principalId, revision: actor.revision, fields: [...b.fields] };
    }
    if (b.target.team_id === null && r.team_id !== null && !actor.capabilities.includes('configure')) ownerFail('FORBIDDEN');
    if (b.operation === 'routing-takeover' && (b.target.principal_id !== actor.principalId || b.target.kind !== 'human')) ownerFail('FORBIDDEN');
    if (b.target.team_id && !(await scope.query('SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1', [tenant, b.target.team_id])).length) ownerFail('FORBIDDEN');
    if (b.target.principal_id) {
      let access: Access;
      if (b.target.kind === 'ai') {
        const target = await new RoutingIdentityPort().principal(scope, b.target.principal_id);
        if (!target || target.kind !== 'ai' || !target.available || !target.policyId ||
            !target.actions.includes('conversation.read') || !target.actions.includes('conversation.reply') ||
            !target.tools.includes('conversation.propose_reply')) ownerFail('FORBIDDEN');
        access = await this.policies(scope, target.access);
      } else {
        if (b.target.kind !== 'human') ownerFail('FORBIDDEN');
        const [target] = await scope.query(`SELECT m.account_id FROM principal p JOIN membership m ON m.tenant_id=p.tenant_id AND m.id=p.membership_id
          WHERE p.tenant_id=? AND p.id=? AND p.kind='human' AND p.status='active' AND p.availability='available' AND m.status='active'`, [tenant, b.target.principal_id]);
        if (!target) ownerFail('FORBIDDEN');
        access = await this.policies(scope, await this.authorization.loadHuman(scope, target.account_id));
      }
      const proposed = { ...record, ownerPrincipalId: b.target.principal_id, teamId: b.target.team_id };
      if (access.principalId !== b.target.principal_id || !access.capabilities.includes('chat') ||
          b.target.team_id && !access.teamIds.includes(b.target.team_id) || !permits(access, 'conversation', 'read', proposed) ||
          !permits(access, 'conversation', 'reply', proposed) || !fieldAllowed(access, 'conversation', 'text', 'read') ||
          !fieldAllowed(access, 'conversation', 'text', 'write')) ownerFail('FORBIDDEN');
    } else if (b.target.kind !== null) ownerFail('FORBIDDEN');
    return { accountId, principalId: actor.principalId, revision: actor.revision, fields: [...b.fields] };
  }
}
