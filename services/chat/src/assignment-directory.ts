import {randomUUID} from 'node:crypto';
import type {OwnerAdmission,OwnerAssignmentDirectory,OwnerCommandBinding,OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';
type DirectoryPeers=RecordPeers&{directory(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerAssignmentDirectory>;capacity(tenant:string,command:OwnerCommandRef,admission:string):Promise<{directory_digest:string;data:{id:string;eligible:boolean}[]}>};
const operations=['routing-proposal','routing-targets','conversation-classification-get-records-id-assignment-teams'];
export class ChatAssignmentDirectory{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:DirectoryPeers){}
 async read(raw:OwnerCommandRequest){
  if(!operations.includes(raw.operation))ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!==(input.operation==='routing-proposal'?'service':'human'))ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,snapshot=await this.commands.transaction(tenant,c=>recordSnapshot(c,tenant,id)),command=randomUUID(),request={payload:input.payload};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,target:{principal_id:null,kind:null,team_id:(input.payload.team_id as string|undefined)??snapshot.resource.team_id},session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'assignment-directory:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));
   if(admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.state!=='admitted'||admission.allowed_fields.length)ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const directory=validateOwnerValue<OwnerAssignmentDirectory>('OwnerAssignmentDirectory',await this.peers.directory(tenant,ref,admission.admission_id));
   if(directory.principal_id!==input.actor.principal_id||directory.auth_revision!==admission.auth_revision||directory.team_id!==binding.target!.team_id||ownerCanonical(directory.resource)!==ownerCanonical(snapshot.resource))ownerFail('FORBIDDEN');
   let data:unknown=directory.teams;
   if(input.operation==='routing-targets'){
    const capacity=await this.peers.capacity(tenant,ref,admission.admission_id);
    if(capacity.directory_digest!==ownerDigest(directory)||capacity.data.length!==directory.candidates.length||new Set(capacity.data.map(p=>p.id)).size!==capacity.data.length)ownerFail('STALE_VERSION');
    data=directory.candidates.map(p=>{const load=capacity.data.find(v=>v.id===p.id);if(!load)ownerFail('FORBIDDEN');const reason=p.reason??(load.eligible?null:'capacity');return {...p,eligible:reason===null,reason};});
   }
   if(ownerCanonical(await this.peers.directory(tenant,ref,admission.admission_id))!==ownerCanonical(directory))ownerFail('STALE_VERSION');
   const result=input.operation==='routing-proposal'?directory:{data,meta:{correlation_id:input.correlation_id}};
   validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await recordSnapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    return {effect_id:id,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Native Identity drain resolves the retained proof. */}throw error;}
 }
}
export function chatAssignmentDirectoryRoutes(directory:ChatAssignmentDirectory):Record<string,WorkloadRoute>{return Object.fromEntries(operations.map(op=>['/internal/v1/owners/chat/'+op,ownerRoute('chat',op,op==='routing-proposal'?['routing']:['bff'],r=>directory.read(r as OwnerCommandRequest))]));}
