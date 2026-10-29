import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization,requireActiveTenant } from '../identity/authorization.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import { CommandError,DurableCommands,canonical,type CommandIdentity } from '../../kernel/reliability/commands.js';
import { createHash } from 'node:crypto';
import { MarketingCrypto,validateMarketing,digest,type MarketingConfig,type MarketingIntegration } from './marketing-security.js';
import { MarketingGraph } from './marketing-graph.js';
import { uuid } from '../identity/admin.js';
const safeColumns='id,app_id,external_account_id,key_id,status,verified_at,version,created_at,updated_at';
export class MarketingAuthority {
 readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
 constructor(source:DataSource,private readonly config:MarketingConfig|null,private readonly graph=new MarketingGraph()){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
 private crypto(){if(!this.config)throw new CommandError(503,'MARKETING_NOT_CONFIGURED');return new MarketingCrypto(this.config);}
 private allowed(a:Access,action:'read'|'configure'){if(!permits(a,'integration',action)||!a.grants.some(x=>x.resource==='integration'&&x.action===action&&x.scope==='all'))throw new CommandError(403,'FORBIDDEN');}
 private checkContext(ctx:MarketingIntegration,credential:string){if(!ctx.active||!ctx.credential_ids.includes(credential))throw new CommandError(403,'INTEGRATION_FORBIDDEN');}
 async list(account:string,tenant:string,q:Record<string,unknown>){if(Object.keys(q).some(k=>!['limit','cursor'].includes(k))||q.cursor!==undefined&&!uuid(q.cursor))throw new CommandError(400,'INVALID_REQUEST');const limit=q.limit===undefined?50:Number(q.limit);if(!Number.isInteger(limit)||limit<1||limit>100)throw new CommandError(400,'INVALID_REQUEST');return this.auth.runHuman(account,tenant,async(s,a)=>{this.allowed(a,'read');const rows=await s.query(`SELECT ${safeColumns} FROM channel_marketing_credential WHERE tenant_id=? AND id>? ORDER BY id LIMIT ?`,[tenant,q.cursor??'',limit+1]);return {items:rows.slice(0,limit),next_cursor:rows.length>limit?rows[limit-1].id:null};});}
 async mutate(account:string,tenant:string,kind:'create'|'replace'|'revoke'|'page',id:string|undefined,input:unknown){
  const b=validateMarketing({create:'credentialCreate',replace:'credentialReplace',revoke:'revoke',page:'setEnabled'}[kind],input),crypto=this.crypto();if(kind!=='create'&&!uuid(id))throw new CommandError(400,'INVALID_REQUEST');if(kind==='create'&&b.app_id!==this.config!.appId)throw new CommandError(422,'APP_MISMATCH');
  const route='marketing.authority.'+kind+':'+(id??'new'),body={protected_request_hmac:crypto.commandHash(b)};
  const prepare=await this.auth.runHuman(account,tenant,async(s,a)=>{
   this.allowed(a,'configure');const cmd:CommandIdentity={actorId:a.principalId,correlationId:b.operation_id,route,key:b.operation_id,body};
   const hash=createHash('sha256').update(canonical({body,version:null})).digest('hex');
   const [receipt]=await s.query("SELECT request_hash,response_body FROM idempotency_record WHERE tenant_id=? AND actor_kind='human' AND actor_id=? AND route_key=? AND `key`=? AND status='completed' AND expires_at>UTC_TIMESTAMP(6)",[tenant,a.principalId,route,b.operation_id]);
   if(receipt){if(receipt.request_hash!==hash)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');return {cmd,replay:typeof receipt.response_body==='string'?JSON.parse(receipt.response_body):receipt.response_body};}
   const [row]=kind==='replace'?await s.query('SELECT app_id,external_account_id,version FROM channel_marketing_credential WHERE tenant_id=? AND id=?',[tenant,id]):[];if(kind==='replace'&&!row)throw new CommandError(404,'NOT_FOUND');return {cmd,row};
  });
  if(prepare.replay)return prepare.replay.data;
  if(kind==='create'||kind==='replace'){if(prepare.row&&prepare.row.app_id!==this.config!.appId)throw new CommandError(409,'APP_MISMATCH');await this.graph.verify(kind==='create'?b.external_account_id:prepare.row.external_account_id,b.token);}
  return this.uow.run({tenantId:tenant},async s=>{
   const a=await this.auth.loadHuman(s,account,undefined,true);this.allowed(a,'configure');const cmd={...prepare.cmd,actorId:a.principalId};const replay=await this.commands.replay(s,cmd,async()=>{});if(replay)return replay.body.data;
   let data:Record<string,unknown>;
   if(kind==='page'){
    const [page]=await s.query('SELECT marketing_admission_version FROM facebook_page WHERE tenant_id=? AND connection_id=? FOR UPDATE',[tenant,id]);if(!page)throw new CommandError(404,'NOT_FOUND');if(String(page.marketing_admission_version)!==b.expected_version)throw new CommandError(409,'VERSION_CONFLICT');
    await s.query('UPDATE facebook_page SET marketing_admission_state=?,marketing_admission_version=marketing_admission_version+1 WHERE tenant_id=? AND connection_id=?',[b.enabled?'enabled':'revoked',tenant,id]);data={id,enabled:b.enabled,version:String(BigInt(b.expected_version)+1n)};
   }else{
    const [existing]=kind==='create'?await s.query('SELECT * FROM channel_marketing_credential WHERE tenant_id=? AND app_id=? AND external_account_id=? FOR UPDATE',[tenant,b.app_id,b.external_account_id]):await s.query('SELECT * FROM channel_marketing_credential WHERE tenant_id=? AND id=? FOR UPDATE',[tenant,id]);
    if(kind==='create'&&existing)throw new CommandError(409,'CREDENTIAL_EXISTS');if(kind!=='create'&&!existing)throw new CommandError(404,'NOT_FOUND');if(existing&&String(existing.version)!==b.expected_version)throw new CommandError(409,'VERSION_CONFLICT');
    const target=id??randomUUID();
    if(kind==='revoke')await s.query("UPDATE channel_marketing_credential SET status='revoked',version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[tenant,target]);
    else {const external=kind==='create'?b.external_account_id:existing.external_account_id,cipher=crypto.seal(b.token,tenant,target,external);
     if(kind==='create')await s.query("INSERT INTO channel_marketing_credential(tenant_id,id,app_id,external_account_id,token_ciphertext,key_id,status,verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[tenant,target,this.config!.appId,external,cipher,this.config!.keyId]);
     else await s.query("UPDATE channel_marketing_credential SET token_ciphertext=?,key_id=?,status='active',verified_at=UTC_TIMESTAMP(6),version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?",[cipher,this.config!.keyId,tenant,target]);}
    [data]=await s.query(`SELECT ${safeColumns} FROM channel_marketing_credential WHERE tenant_id=? AND id=?`,[tenant,target]);
   }
   await this.commands.audit(s,a.principalId,b.operation_id,kind==='page'?'facebook_page':'channel_marketing_credential',String(data.id),route,['state','revision']);
   await this.commands.complete(s,cmd,{status:200,body:{data,meta:{correlation_id:b.operation_id}}});return data;
  });
 }
 private async credential(s:TransactionScope,ctx:MarketingIntegration,id:string,active=true){this.checkContext(ctx,id);await requireActiveTenant(s);const [row]=await s.query('SELECT * FROM channel_marketing_credential WHERE tenant_id=? AND id=? FOR UPDATE',[ctx.tenant_id,id]);if(!row)throw new CommandError(404,'NOT_FOUND');if(active&&row.status!=='active')throw new CommandError(403,'CREDENTIAL_DENIED');if(!this.config||row.app_id!==this.config.appId)throw new CommandError(503,'MARKETING_NOT_CONFIGURED');return row;}
 async graphRead(ctx:MarketingIntegration,input:unknown){const b=validateMarketing('graphRead',input);const row=await this.uow.run({tenantId:ctx.tenant_id},s=>this.credential(s,ctx,b.credential_ref));const token=this.crypto().open(row.token_ciphertext,ctx.tenant_id,row.id,row.external_account_id,row.key_id);const result=await this.graph.read(row.external_account_id,token,b.operation,b.external_id,b.after);
  await this.uow.run({tenantId:ctx.tenant_id},async s=>{const live=await this.credential(s,ctx,b.credential_ref);if(String(live.version)!==String(row.version))throw new CommandError(409,'CREDENTIAL_CHANGED');});return {...result,credential_revision:String(row.version)};
 }
 private async page(s:TransactionScope,ctx:MarketingIntegration,app:string,page:string){const [row]=await s.query('SELECT tenant_id,connection_id,page_id,app_id,marketing_admission_state,marketing_admission_version FROM facebook_page WHERE app_id=? AND page_id=? FOR UPDATE',[app,page]);if(!row)return {decision:'defer' as const};if(row.tenant_id!==ctx.tenant_id)return {decision:'skip' as const};if(row.marketing_admission_state!=='enabled')return {decision:'defer' as const};return {decision:'match' as const,row};}
 async pageCheck(ctx:MarketingIntegration,input:unknown){const b=validateMarketing('pageCheck',input);return this.uow.run({tenantId:ctx.tenant_id},async s=>{const cred=await this.credential(s,ctx,b.credential_ref),found=await this.page(s,ctx,cred.app_id,b.page_id);if(!found.row)return {decision:found.decision};return {decision:'match',page_binding_ref:found.row.connection_id,page_binding_namespace:found.row.app_id,page_binding_revision:String(found.row.marketing_admission_version),checked_at:new Date().toISOString()};});}
 private receipt(row:any){return {receipt_id:row.id,tenant_id:row.tenant_id,credential_ref:row.credential_id,external_account_id:row.external_account_id,external_ad_id:row.external_ad_id,run_id:row.run_id,fence:String(row.fence),payload_sha256:Buffer.from(row.payload_sha256).toString('hex'),page_id:row.page_id,page_binding_ref:row.page_connection_id,page_binding_namespace:row.app_id,page_binding_revision:String(row.page_revision),credential_revision:String(row.credential_revision),admitted_at:new Date(row.admitted_at).toISOString(),policy_version:row.policy_version};}
 async getReceipt(ctx:MarketingIntegration,id:string){if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');return this.uow.run({tenantId:ctx.tenant_id},async s=>{await requireActiveTenant(s);const [r]=await s.query('SELECT * FROM channel_marketing_admission_receipt WHERE tenant_id=? AND operation_id=?',[ctx.tenant_id,id]);if(!r)throw new CommandError(404,'NOT_FOUND');this.checkContext(ctx,r.credential_id);return this.receipt(r);});}
 async admit(ctx:MarketingIntegration,input:unknown){const b=validateMarketing('admit',input);return this.uow.run({tenantId:ctx.tenant_id},async s=>{
  const cred=await this.credential(s,ctx,b.credential_ref,false),hash=digest(b);const [old]=await s.query('SELECT * FROM channel_marketing_admission_receipt WHERE tenant_id=? AND operation_id=?',[ctx.tenant_id,b.operation_id]);
  if(old){if(old.credential_id!==b.credential_ref||Buffer.from(old.request_sha256).toString('hex')!==hash)throw new CommandError(409,'IDEMPOTENCY_CONFLICT');return this.receipt(old);}
  if(cred.status!=='active'||String(cred.version)!==b.expected_credential_revision)throw new CommandError(409,'ADMISSION_STALE');const age=Date.now()-Date.parse(b.fetched_at);if(age>300000||age< -30000)throw new CommandError(409,'OBSERVATION_STALE');
  const found=await this.page(s,ctx,cred.app_id,b.page_id);if(found.decision!=='match')return {decision:found.decision};const p=found.row!;if(String(p.marketing_admission_version)!==b.expected_page_revision)throw new CommandError(409,'ADMISSION_STALE');
  const id=randomUUID();await s.query("INSERT INTO channel_marketing_admission_receipt(tenant_id,id,operation_id,credential_id,credential_revision,page_connection_id,page_revision,app_id,external_account_id,page_id,external_ad_id,run_id,fence,payload_sha256,request_sha256,policy_version,fetched_at,admitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'page_account_v1',?,UTC_TIMESTAMP(6))",[ctx.tenant_id,id,b.operation_id,cred.id,cred.version,p.connection_id,p.marketing_admission_version,cred.app_id,cred.external_account_id,p.page_id,b.external_ad_id,b.run_id,b.fence,Buffer.from(b.payload_sha256,'hex'),Buffer.from(hash,'hex'),new Date(b.fetched_at)]);
  const [r]=await s.query('SELECT * FROM channel_marketing_admission_receipt WHERE tenant_id=? AND id=?',[ctx.tenant_id,id]);return this.receipt(r);
 });}
}
