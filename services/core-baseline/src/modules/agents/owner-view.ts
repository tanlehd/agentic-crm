import type {OwnerActor,OwnerAdmission,OwnerCommandRef,OwnerRoutingViewPolicy,OwnerRoutingViewDirectory,OwnerRoutingViewChat} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {NativeRoutingViewStorage} from './owner-view-storage.js';
type Peers={admit(tenant:string,command:OwnerCommandRef):Promise<OwnerAdmission>;settle(tenant:string,command:OwnerCommandRef,admission:string):Promise<unknown>;policy(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerRoutingViewPolicy>;directory(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerRoutingViewDirectory>;chat(tenant:string,command:OwnerCommandRef,admission:string):Promise<OwnerRoutingViewChat>;connections(tenant:string,command:OwnerCommandRef,admission:string):Promise<{policy_digest:string;data:{id:string;name:string;provider:string}[]}>};

export class NativeRoutingView{
 constructor(private readonly storage:NativeRoutingViewStorage,private readonly peers:Peers){}
 /** Public composition preflights at Identity before exposing local validation/limit errors. */
 async read(tenant:string,actor:OwnerActor,mine:boolean){
  const prepared=await this.storage.prepare(tenant,actor,mine),{ref,binding,snapshot}=prepared;let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));await this.storage.admit(tenant,ref,admission);
   const policy=validateOwnerValue<OwnerRoutingViewPolicy>('OwnerRoutingViewPolicy',await this.peers.policy(tenant,ref,admission.admission_id));
   if(policy.principal_id!==actor.principal_id||ownerCanonical(policy.selection)!==ownerCanonical(binding.routing_view))ownerFail('FORBIDDEN');
   const digest=ownerDigest(policy),directory=validateOwnerValue<OwnerRoutingViewDirectory>('OwnerRoutingViewDirectory',await this.peers.directory(tenant,ref,admission.admission_id)),chat=validateOwnerValue<OwnerRoutingViewChat>('OwnerRoutingViewChat',await this.peers.chat(tenant,ref,admission.admission_id));
   if(directory.policy_digest!==digest||chat.policy_digest!==digest||chat.visible_ids.some(id=>!policy.selection.conversation_ids.includes(id))||new Set(chat.replies.map(p=>p.principal_id)).size!==chat.replies.length||new Set(directory.available.map(p=>p.principal_id)).size!==directory.available.length||ownerCanonical(directory.available.map(p=>p.principal_id).sort())!==ownerCanonical([...policy.selection.profile_ids].sort())||mine&&(directory.principals.length||directory.teams.length||chat.replies.length))ownerFail('FORBIDDEN');
   const base={profiles:snapshot.data.profiles.map(p=>({...p,available:directory.available.find(a=>a.principal_id===p.principal_id)!.available})),work:snapshot.data.work.filter(w=>chat.visible_ids.includes(String(w.conversation_id))).map(w=>({...w,principal_id:policy.allowed_fields.includes('owner_principal_id')?w.principal_id:null,team_id:policy.allowed_fields.includes('team_id')?w.team_id:null}))};
   let data:unknown=base;
   if(!mine){const connections=await this.peers.connections(tenant,ref,admission.admission_id);if(connections.policy_digest!==digest)ownerFail('FORBIDDEN');data={...snapshot.data,...base,principals:directory.principals,teams:directory.teams,connections:connections.data,replies:chat.replies};}
   const result=validateOwnerValue('OwnerRoutingViewData',data);
   if(ownerDigest(await this.peers.policy(tenant,ref,admission.admission_id))!==digest)ownerFail('REVOKED');
   await this.storage.commit(tenant,ref,admission.admission_id);await this.peers.settle(tenant,ref,admission.admission_id);return {data:result};
  }catch(error){try{await this.storage.proof(tenant,ref,true);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity's root recovery retries the durable proof. */}throw error;}
 }
}
export function routingViewRecoveryRoutes(storage:NativeRoutingViewStorage):Record<string,WorkloadRoute>{return Object.fromEntries(['command-proof','command-abort'].map(operation=>['/internal/v1/owners/routing/'+operation,ownerRoute('routing',operation,['identity'],r=>storage.proof(r.tenant_id,{command_id:r.payload.command_id as string,binding_digest:r.payload.binding_digest as string},operation==='command-abort'))]));}
