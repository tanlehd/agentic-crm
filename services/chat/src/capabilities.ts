import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerAdmission,OwnerCommandBinding} from '@agentic-crm/contracts';
import {ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import type {RecordPeers} from './record-action.js';
import {verifyRuntimeLineage} from './runtime-lineage.js';

export const capabilityRequirements={
 workspace_read_v1:['workspace-conversations','workspace-sidebar','workspace-conversations-id-read-state','workspace-mark-read'],
 workspace_catalog_v1:['catalog-inbox-options','catalog-list-inboxes','catalog-create-inbox','catalog-get-inbox','catalog-patch-inbox','catalog-delete-inbox','catalog-inbox-shares',...['tags','snippets'].flatMap(kind=>['list','create','get','patch','delete'].map(action=>'catalog-'+action+'-'+(action==='list'?kind:kind.slice(0,-1)))),'catalog-put-conversation-tag','catalog-delete-conversation-tag'],
 activity_v1:['workspace-get-activity','workspace-get-snooze','workspace-put-snooze','workspace-post-wake'],
 owner_v1:['routing-assignment','routing-takeover','conversation-post-conversations-id-transition'],
} as const;
type Capability=keyof typeof capabilityRequirements;
export function readyCapabilities(mounted:ReadonlySet<string>,workspace:boolean,activity:boolean,snoozeEnabled:boolean,activityEnabled:boolean):Capability[]{
 const has=(capability:Capability)=>capabilityRequirements[capability].every(op=>mounted.has(op));
 const read=workspace&&has('workspace_read_v1'),catalog=read&&has('workspace_catalog_v1');
 return [...(read?['workspace_read_v1' as const]:[]),...(catalog?['workspace_catalog_v1' as const]:[]),...(read&&activity&&snoozeEnabled&&activityEnabled&&has('activity_v1')?['activity_v1' as const]:[]),...(has('owner_v1')?['owner_v1' as const]:[])];
}
export class ChatCapabilities{
 private readonly mounted:ReadonlySet<string>;
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:RecordPeers,routes:Readonly<Record<string,WorkloadRoute>>){
  this.mounted=new Set(Object.keys(routes).filter(p=>p.startsWith('/internal/v1/owners/chat/')).map(p=>p.slice('/internal/v1/owners/chat/'.length)));
 }
 private async inspect(c:PoolConnection,tenant:string){
  await verifyRuntimeLineage(c);
  const [missing]=await c.execute<RowDataPacket[]>('SELECT c.record_id FROM conversation c LEFT JOIN conversation_workspace w ON w.tenant_id=c.tenant_id AND w.conversation_id=c.record_id WHERE c.tenant_id=? AND w.conversation_id IS NULL LIMIT 1',[tenant]);
  const [activityMissing]=await c.execute<RowDataPacket[]>('SELECT c.record_id FROM conversation c LEFT JOIN conversation_activity_counter a ON a.tenant_id=c.tenant_id AND a.conversation_id=c.record_id WHERE c.tenant_id=? AND (a.backfilled IS NULL OR a.backfilled=0) LIMIT 1',[tenant]);
  const [flags]=await c.execute<RowDataPacket[]>('SELECT feature_key,state FROM chat_workspace_rollout WHERE tenant_id=?',[tenant]);
  const enabled=(feature:string)=>!flags.some(f=>f.feature_key===feature&&f.state!=='ready');
  const capabilities=readyCapabilities(this.mounted,!missing.length,!activityMissing.length,enabled('snooze_v1'),enabled('activity_v1'));
  const read=capabilities.includes('workspace_read_v1'),catalog=capabilities.includes('workspace_catalog_v1');
  const features={queue_v1:read,read_state_v1:read,inbox_v1:catalog,tags_v1:catalog,snippets_v1:catalog,snooze_v1:read&&enabled('snooze_v1')&&capabilityRequirements.activity_v1.slice(1).every(op=>this.mounted.has(op)),activity_v1:capabilities.includes('activity_v1'),contact_channels_v1:false};
  return {capabilities,features};
 }
 async read(raw:OwnerCommandRequest){
  if(!['workspace-capabilities','runtime-capabilities'].includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,command=randomUUID(),request={payload:input.payload};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:{resource_id:tenant,object_key:'chat_runtime',record_version:'0',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'capabilities:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.length)ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);let result:Record<string,unknown>|undefined;
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    const inspected=await this.inspect(c,tenant);
    result=input.operation==='runtime-capabilities'?{lineage:'crm_chat',capabilities:inspected.capabilities,watermark:this.commands.epoch}:{data:{contract_version:1,features:inspected.features},meta:{as_of:new Date().toISOString(),correlation_id:input.correlation_id}};
    validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});return {effect_id:tenant,effect_revision:this.commands.epoch};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result!;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Durable proof remains recoverable. */}throw error;}
 }
}
export function chatCapabilityRoutes(capabilities:ChatCapabilities):Record<string,WorkloadRoute>{return Object.fromEntries(['workspace-capabilities','runtime-capabilities'].map(operation=>['/internal/v1/owners/chat/'+operation,ownerRoute('chat',operation,['bff'],r=>capabilities.read(r as OwnerCommandRequest))]));}
