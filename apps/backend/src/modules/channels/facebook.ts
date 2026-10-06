import { randomUUID,randomBytes,createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits,type Access } from '../identity/domain/authorization.js';
import { object } from '../crm/properties.js';
import { uuid } from '../identity/admin.js';
import { stamp } from '../crm/core.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { FacebookGraph,PageTokenCrypto,credentialContext,type FacebookConfig } from './facebook-graph.js';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export class FacebookChannels {
 readonly uow:UnitOfWork;private readonly auth:IdentityAuthorization;private readonly commands=new DurableCommands();
 constructor(private readonly source:DataSource,private readonly config:FacebookConfig|null,private readonly graph=config?new FacebookGraph(config):null){this.uow=new UnitOfWork(source);this.auth=new IdentityAuthorization(this.uow);}
 private configured(){if(!this.config||!this.graph)throw new CommandError(503,'FACEBOOK_NOT_CONFIGURED');return {config:this.config,graph:this.graph};}
 private allowed(a:Access,action:'read'|'configure'){if(!permits(a,'integration',action))throw new CommandError(403,'FORBIDDEN');}
 private async team(s:TransactionScope,id:string){if(!uuid(id)||!(await s.query("SELECT id FROM team WHERE tenant_id=? AND id=? AND active=1 AND purpose IN ('chat','general')",[s.context.tenantId,id]))[0])throw new CommandError(422,'FACEBOOK_TEAM_INVALID');}
 list(account:string,tenant:string,q:Record<string,unknown>){return this.auth.runHuman(account,tenant,async(s,a)=>{this.allowed(a,'read');const limit=q.limit===undefined?50:Number(q.limit);if(Object.keys(q).some(k=>!['limit','cursor'].includes(k))||typeof q.limit==='object'||!Number.isInteger(limit)||limit<1||limit>100||q.cursor!==undefined&&!uuid(q.cursor))throw new CommandError(400,'INVALID_REQUEST');
 const rows=await s.query('SELECT p.connection_id id,p.app_id,p.page_id,p.name,p.version,p.connected_at,p.token_ciphertext IS NOT NULL has_token,c.team_id FROM facebook_page p JOIN channel_connection c ON c.tenant_id=p.tenant_id AND c.id=p.connection_id WHERE p.tenant_id=? AND p.connection_id>? ORDER BY p.connection_id LIMIT ?',[tenant,q.cursor??'',limit+1]);
 return {data:rows.slice(0,limit).map((r:any)=>({id:r.id,channel_id:r.id,channel:'messenger',app_id:r.app_id,page_id:r.page_id,name:r.name,team_id:r.team_id,credential_status:r.has_token?'stored':'missing',version:String(r.version),connected_at:stamp(r.connected_at)})),next_cursor:rows.length>limit?rows[limit-1].id:null,oauth_configured:!!this.config};});}
 async begin(account:string,tenant:string,session:string,input:unknown){const {graph,config}=this.configured(),b=object(input,['team_id']);if(!uuid(b.team_id))throw new CommandError(422,'FACEBOOK_TEAM_INVALID');const state=randomBytes(32).toString('base64url');
 await this.uow.run({tenantId:tenant},async s=>{const a=await this.auth.loadHuman(s,account,undefined,true);this.allowed(a,'configure');await this.team(s,b.team_id as string);
 await s.query('DELETE FROM facebook_oauth_attempt WHERE tenant_id=? AND account_id=? AND expires_at<UTC_TIMESTAMP(6)',[tenant,account]);
 await s.query('UPDATE facebook_oauth_attempt SET is_current=0 WHERE tenant_id=? AND account_id=? AND session_hash=?',[tenant,account,hash(session)]);
 await s.query('INSERT INTO facebook_oauth_attempt(state_hash,tenant_id,account_id,session_hash,team_id,app_id,expires_at) VALUES (?,?,?,?,?,?,TIMESTAMPADD(MINUTE,10,UTC_TIMESTAMP(6)))',[hash(state),tenant,account,hash(session),b.team_id,config.appId]);});return {authorization_url:graph.authorization(state)};
 }
 async callback(account:string,session:string,q:Record<string,unknown>){const {config,graph}=this.configured();
 if(Object.keys(q).some(k=>!['code','state','error','error_reason','error_description'].includes(k))||typeof q.state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(q.state)||q.error===undefined&&(typeof q.code!=='string'||!q.code||q.code.length>4096)||q.error!==undefined&&typeof q.error!=='string')throw new CommandError(400,'FACEBOOK_STATE_INVALID');
 const stateHash=hash(q.state),[attempt]=await this.source.query('SELECT tenant_id FROM facebook_oauth_attempt WHERE state_hash=? AND account_id=? AND session_hash=?',[stateHash,account,hash(session)]);if(!attempt)throw new CommandError(400,'FACEBOOK_STATE_INVALID');
 const accepted=await this.uow.run({tenantId:attempt.tenant_id},async s=>{const a=await this.auth.loadHuman(s,account,undefined,true);this.allowed(a,'configure');const [row]=await s.query('SELECT * FROM facebook_oauth_attempt WHERE tenant_id=? AND state_hash=? AND consumed_at IS NULL AND is_current=1 AND expires_at>UTC_TIMESTAMP(6) FOR UPDATE',[attempt.tenant_id,stateHash]);if(!row||row.app_id!==config.appId)throw new CommandError(400,'FACEBOOK_STATE_INVALID');await this.team(s,row.team_id);await s.query('UPDATE facebook_oauth_attempt SET consumed_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND state_hash=?',[attempt.tenant_id,stateHash]);return row;});
 if(q.error!==undefined)return 'cancelled' as const;
 const pages=await graph.discover(q.code as string),crypto=new PageTokenCrypto(config.key);
 await this.uow.run({tenantId:accepted.tenant_id},async s=>{const a=await this.auth.loadHuman(s,account,undefined,true);this.allowed(a,'configure');await this.team(s,accepted.team_id);
 const [current]=await s.query('SELECT state_hash FROM facebook_oauth_attempt WHERE tenant_id=? AND state_hash=? AND is_current=1 AND expires_at>UTC_TIMESTAMP(6) FOR UPDATE',[accepted.tenant_id,stateHash]);if(!current)throw new CommandError(409,'FACEBOOK_ATTEMPT_SUPERSEDED');
 for(const page of [...pages].sort((a,b)=>a.id.localeCompare(b.id))){
  const [existing]=await s.query('SELECT tenant_id,connection_id FROM facebook_page WHERE app_id=? AND page_id=? FOR UPDATE',[config.appId,page.id]);
  if(existing&&existing.tenant_id!==accepted.tenant_id)throw new CommandError(409,'FACEBOOK_PAGE_UNAVAILABLE');
  const connection=existing?.connection_id??randomUUID(),cipher=crypto.seal(page.token,credentialContext(accepted.tenant_id,connection,config.appId,page.id));
  if(existing)await s.query('UPDATE facebook_page SET name=?,token_ciphertext=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND connection_id=?',[page.name,cipher,accepted.tenant_id,connection]);
  else {await s.query("INSERT INTO channel_connection(id,tenant_id,provider,external_account_id,status,team_id) VALUES (?,?,'messenger',?,'disabled',?)",[connection,accepted.tenant_id,page.id,accepted.team_id]);await s.query('INSERT INTO facebook_page(tenant_id,connection_id,app_id,page_id,name,token_ciphertext,connected_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[accepted.tenant_id,connection,config.appId,page.id,page.name,cipher]);}
  await this.commands.audit(s,a.principalId,randomUUID(),'channel_connection',connection,'facebook.configure',['name','credential'],'accepted');
 }
 await s.query('UPDATE facebook_oauth_attempt SET is_current=0 WHERE tenant_id=? AND state_hash=?',[accepted.tenant_id,stateHash]);});return pages.length?'connected' as const:'empty' as const;
 }
 // Explicit local operator path. Verify token belongs to this Page before changing DB.
 async replaceToken(tenant:string,connection:string,token:string){const {config,graph}=this.configured();if(!uuid(tenant)||!uuid(connection))throw new CommandError(400,'INVALID_REQUEST');const [row]=await this.source.query('SELECT app_id,page_id,version FROM facebook_page WHERE tenant_id=? AND connection_id=?',[tenant,connection]);if(!row||row.app_id!==config.appId)throw new CommandError(404,'NOT_FOUND');await graph.verifyPage(token,row.page_id);
 await this.uow.run({tenantId:tenant},async s=>{const [live]=await s.query('SELECT version FROM facebook_page WHERE tenant_id=? AND connection_id=? FOR UPDATE',[tenant,connection]);if(!live||String(live.version)!==String(row.version))throw new CommandError(409,'VERSION_CONFLICT');await s.query('UPDATE facebook_page SET token_ciphertext=?,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND connection_id=?',[new PageTokenCrypto(config.key).seal(token,credentialContext(tenant,connection,row.app_id,row.page_id)),tenant,connection]);await this.commands.systemAudit(s,randomUUID(),'channel_connection',connection,'facebook.credential.replace',['credential']);});
 }
}
