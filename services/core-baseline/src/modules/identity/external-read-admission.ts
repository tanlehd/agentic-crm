import {randomUUID} from 'node:crypto';
import type {OwnerCommandBinding,OwnerCommandRef,OwnerRecoveryProof,OwnerExternalReadPolicy} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerCanonical,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {DurableCommands,CommandError} from '../../kernel/reliability/commands.js';
import {requireActiveTenant} from './authorization.js';
import {ExternalApps,type AppGrant,parseAppToken} from './external-apps.js';

const operations=['external-conversations','external-conversations-id','external-conversations-id-messages','external-conversations-id-messages-messageId'];
const parse=<T>(v:string|T):T=>typeof v==='string'?JSON.parse(v):v;
export class NativeExternalReadAdmissions {
 constructor(private readonly apps:ExternalApps,private readonly proofPort:(tenant:string,ref:OwnerCommandRef)=>Promise<OwnerRecoveryProof>){}
 private async proof(tenant:string,input:OwnerCommandRef){
  const ref=validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',input),proof=validateOwnerValue<OwnerRecoveryProof>('OwnerRecoveryProof',await this.proofPort(tenant,ref));
  if(!('binding' in proof)||proof.state!=='prepared'||proof.binding_digest!==ref.binding_digest||ownerBindingDigest(proof.binding)!==ref.binding_digest)ownerFail('FORBIDDEN');
  const b=proof.binding,r=b.resource;
  if(b.owner!=='chat'||b.tenant_id!==tenant||b.command_id!==ref.command_id||!operations.includes(b.operation)||b.actor.kind!=='app'||b.actor.delegation_id!==b.command_id||r.object_key!=='external_conversation_query'||r.resource_id!==tenant||r.archived||r.owner_principal_id!==null||r.team_id!==null||r.shared_team_ids.length||[r.record_version,r.owner_revision,r.control_revision].some(v=>v!=='0')||b.target!==null||b.session_id!==null||b.graph!==null||b.dependencies.length)ownerFail('FORBIDDEN');
  const fields=b.operation.includes('-messages')?['direction','status','occurred_at','received_at','text']:['status','opened_at','closed_at','contact_id','team_id','owner_principal_id'];
  if(ownerCanonical([...b.fields].sort())!==ownerCanonical(fields.sort()))ownerFail('FORBIDDEN');return {ref,b};
 }
 private async policyFor(s:TransactionScope,b:OwnerCommandBinding,app:any){
  if(app.id!==b.actor.principal_id||app.status!=='active'||!app.token_hash||Number(app.valid_token)!==1)throw new CommandError(401,'INVALID_TOKEN');
  const grants=parse<AppGrant[]>(app.grants),parent=grants.find(g=>g.object==='conversation'&&g.scope==='conversations.read'),message=grants.find(g=>g.object==='conversation.messages'&&g.scope==='conversations.messages.read'),messages=b.operation.includes('-messages');
  if(!parent||messages&&!message)throw new CommandError(403,'MISSING_SCOPE');
  const active=(await s.query('SELECT id FROM team WHERE tenant_id=? AND active=1',[s.context.tenantId])).map((r:{id:string})=>r.id);
  return {fields:(messages?message!:parent).properties.filter(f=>b.fields.includes(f)).sort(),predicates:(messages?[parent,message!]:[parent]).map(g=>({all:g.record_scope==='all',team_ids:g.team_ids.filter(id=>active.includes(id))}))};
 }
 private async gate(s:TransactionScope){await requireActiveTenant(s,true);const [gate]=await s.query('SELECT state,version FROM identity_owner_gate WHERE tenant_id=? FOR UPDATE',[s.context.tenantId]);if(gate?.state!=='open')ownerFail('REVOKED');return gate;}
 async admit(credential:ReturnType<typeof parseAppToken>,input:OwnerCommandRef){
  const {ref,b}=await this.proof(credential.tenant,input);if(b.actor.principal_id!==credential.id)ownerFail('FORBIDDEN');
  return this.apps.uow.run({tenantId:credential.tenant},async s=>{
   const gate=await this.gate(s),app=await this.apps.verify(s,credential),policy=await this.policyFor(s,b,app);
   const [old]=await s.query("SELECT * FROM identity_owner_admission WHERE tenant_id=? AND owner_service='chat' AND command_id=? FOR UPDATE",[credential.tenant,ref.command_id]);
   if(old){if(old.binding_digest!==ref.binding_digest||old.app_id!==credential.id||old.state!=='admitted'||String(old.auth_revision)!==String(app.version))ownerFail('CONFLICT');return;}
   const id=randomUUID();
   await s.query("INSERT INTO identity_owner_admission(tenant_id,id,owner_service,command_id,binding_digest,app_id,delegation_id,auth_revision,gate_revision,state,allowed_fields,version,created_at,updated_at) VALUES (?,?,'chat',?,?,?,?,?,?,'admitted',?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[credential.tenant,id,ref.command_id,ref.binding_digest,credential.id,b.actor.delegation_id,String(app.version),String(gate.version),ownerCanonical(policy.fields)]);
   await new DurableCommands().systemAudit(s,ref.command_id,'identity_owner_admission',id,'external.read.admit',[]);
  });
 }
 async policy(tenant:string,input:OwnerCommandRef):Promise<OwnerExternalReadPolicy>{
  const {ref,b}=await this.proof(tenant,input);
  return this.apps.uow.run({tenantId:tenant},async s=>{
   await this.gate(s);
   const [row]=await s.query("SELECT * FROM identity_owner_admission WHERE tenant_id=? AND owner_service='chat' AND command_id=? FOR UPDATE",[tenant,ref.command_id]);
   if(!row||row.state!=='admitted'||row.binding_digest!==ref.binding_digest||row.app_id!==b.actor.principal_id||row.delegation_id!==b.actor.delegation_id)ownerFail('FORBIDDEN');
   const [app]=await s.query('SELECT *,token_expires_at>UTC_TIMESTAMP(6) valid_token FROM external_app WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,row.app_id]);
   if(!app||String(app.version)!==String(row.auth_revision))ownerFail('REVOKED');
   // Public credential errors are mapped at admission; a no-longer-valid admitted
   // policy is an owner revocation, never an opaque transport failure.
   let policy:Awaited<ReturnType<NativeExternalReadAdmissions['policyFor']>>;
   try{policy=await this.policyFor(s,b,app);}catch(error){if(error instanceof CommandError)ownerFail('REVOKED');throw error;}
   if(ownerCanonical(policy.fields)!==ownerCanonical(parse(row.allowed_fields)))ownerFail('REVOKED');
   return validateOwnerValue<OwnerExternalReadPolicy>('OwnerExternalReadPolicy',{admission:{admission_id:row.id,command_id:ref.command_id,binding_digest:ref.binding_digest,state:'admitted',auth_revision:String(row.auth_revision),allowed_fields:policy.fields},app_id:app.id,policy_key:`${app.id}:${app.version}`,predicates:policy.predicates});
  });
 }
}
export function externalReadAdmissionRoutes(admissions:NativeExternalReadAdmissions):Record<string,WorkloadRoute>{return {'/internal/v1/owners/identity/external-policy':ownerRoute('identity','external-policy',['chat'],r=>admissions.policy(r.tenant_id,validateOwnerValue<OwnerCommandRef>('OwnerCommandRef',r.payload)))};}
