import {randomUUID} from 'node:crypto';
import type {OwnerAdmission,OwnerCommandBinding,OwnerCommandRef} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type OwnerCommandRequest,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {recordSnapshot,type RecordPeers} from './record-action.js';

type Peers=RecordPeers&{list(tenant:string,input:{command:OwnerCommandRef;admission_id:string;limit:number;cursor:string|null}):Promise<Record<string,unknown>>};
export class ChatNotes{
 constructor(private readonly commands:ChatOwnerCommands,private readonly peers:Peers){}
 async read(raw:OwnerCommandRequest){
  if(raw.operation!=='conversation-get-conversations-id-notes')ownerFail('INVALID_REQUEST');
  const input=validateOwnerValue<OwnerCommandRequest>('Request_chat-'+raw.operation,raw);if(input.actor.kind!=='human')ownerFail('FORBIDDEN');
  const tenant=input.tenant_id,id=input.payload.id as string,snapshot=await this.commands.transaction(tenant,c=>recordSnapshot(c,tenant,id)),command=randomUUID(),request={payload:input.payload};
  const binding:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'chat',operation:input.operation,actor:input.actor,resource:snapshot.resource,target:null,session_id:null,fields:[],payload_digest:ownerDigest(request),legacy_receipt_key:'notes-read:'+command,graph:null,dependencies:[]};
  const prepared=await this.commands.prepare(binding,request),ref={command_id:command,binding_digest:prepared.binding_digest};let admission:OwnerAdmission|undefined;
  try{
   admission=validateOwnerValue<OwnerAdmission>('OwnerAdmission',await this.peers.admit(tenant,ref));if(admission.state!=='admitted'||admission.command_id!==command||admission.binding_digest!==ref.binding_digest||admission.allowed_fields.length)ownerFail('FORBIDDEN');
   await this.commands.rememberDependency(tenant,ref,'identity-admission',admission);
   const reply=await this.peers.list(tenant,{command:ref,admission_id:admission.admission_id,limit:input.payload.limit as number??50,cursor:input.payload.cursor as string??null}),result={...reply,meta:{correlation_id:input.correlation_id}};
   validateOwnerValue('Reply_chat-'+input.operation,{schema_version:1,request_id:input.request_id,tenant_id:tenant,result});
   await this.commands.commit(tenant,ref,admission.admission_id,async c=>{
    if(ownerCanonical(await recordSnapshot(c,tenant,id))!==ownerCanonical(snapshot))ownerFail('STALE_VERSION');
    return {effect_id:id,effect_revision:snapshot.resource.record_version};
   });
   await this.peers.settle(tenant,ref,admission.admission_id);return result;
  }catch(error){try{await this.commands.abort(tenant,ref);if(admission)await this.peers.settle(tenant,ref,admission.admission_id);}catch{/* Identity drain retains recovery ownership. */}throw error;}
 }
}
export function chatNoteReadRoutes(notes:ChatNotes):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/conversation-get-conversations-id-notes':ownerRoute('chat','conversation-get-conversations-id-notes',['bff'],r=>notes.read(r as OwnerCommandRequest))};}
