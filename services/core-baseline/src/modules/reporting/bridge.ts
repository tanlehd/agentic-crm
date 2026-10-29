import { createHash,createHmac } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { UnitOfWork } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { IdentityAuthorization } from '../identity/authorization.js';
import { permits,type Access } from '../identity/domain/authorization.js';
export interface ReportingBridgeConfig {url:string;key:string}
export function reportingBridgeConfig(env:NodeJS.ProcessEnv=process.env):ReportingBridgeConfig|null{
 if(!env.REPORTING_SERVICE_URL&&!env.REPORTING_ADMISSION_KEY)return null;
 const url=new URL(env.REPORTING_SERVICE_URL??'');
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol)||url.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!/^[a-f0-9]{64}$/.test(env.REPORTING_ADMISSION_KEY??''))throw new Error('REPORTING_BRIDGE_CONFIG_INVALID');
 return {url:url.origin,key:env.REPORTING_ADMISSION_KEY!};
}
function scope(a:Access,action:'read'|'design'):'none'|'own'|'all'{
 if(!permits(a,'report_definition',action,{tenantId:a.tenantId,ownerPrincipalId:a.principalId,teamId:null,sharedTeamIds:[]}))return 'none';
 const grants=a.grants.filter(g=>g.resource==='report_definition'&&g.action===action);
 return grants.some(g=>g.scope==='all')?'all':grants.some(g=>g.scope==='own')?'own':'none';
}
export class ReportingBridge {
 private readonly authorization:IdentityAuthorization;
 constructor(source:DataSource,private readonly config:ReportingBridgeConfig|null,private readonly request:typeof fetch=fetch){this.authorization=new IdentityAuthorization(new UnitOfWork(source));}
 async dispatch(accountId:string,tenantId:string,operation:Record<string,unknown>){
  if(!this.config)throw new CommandError(503,'REPORTING_NOT_CONFIGURED');
  const body=JSON.stringify(operation);if(Buffer.byteLength(body)>98304)throw new CommandError(400,'REQUEST_TOO_LARGE');
  const access=await this.authorization.runHuman(accountId,tenantId,async(_s,a)=>{
   const readScope=scope(a,'read'),designScope=scope(a,'design'),mutation=['create','update','archive'].includes(String(operation.kind));
   if(readScope==='none'||mutation&&designScope==='none')throw new CommandError(403,'FORBIDDEN');
   return {tenantId:a.tenantId,principalId:a.principalId,authRevision:a.revision,readScope,designScope};
  });
  const issuedAt=Date.now();const payload=Buffer.from(JSON.stringify({audience:'reporting-definition-v1',...access,bodyHash:createHash('sha256').update(body).digest('hex'),issuedAt,expiresAt:issuedAt+5000})).toString('base64url');
  const token=payload+'.'+createHmac('sha256',Buffer.from(this.config.key,'hex')).update(payload).digest('hex');
  const response=await this.request(this.config.url+'/internal/v1/reporting/definitions',{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-reporting-admission':token},body,signal:AbortSignal.timeout(4500)});
  const raw=await response.text();if(Buffer.byteLength(raw)>200000)throw new CommandError(503,'REPORTING_RESPONSE_INVALID');
  let result:Record<string,any>;try{result=JSON.parse(raw);}catch{throw new CommandError(503,'REPORTING_RESPONSE_INVALID');}
  await this.authorization.runHuman(accountId,tenantId,async()=>{}, {tenantId,principalId:access.principalId,revision:access.authRevision});
  if(!response.ok){const code=result.error?.code;if(typeof code!=='string'||!/^[A-Z_]{1,64}$/.test(code))throw new CommandError(503,'REPORTING_UNAVAILABLE');throw new CommandError([400,401,403,404,409,413,428].includes(response.status)?response.status:503,code);}
  if(!Object.hasOwn(result,'data'))throw new CommandError(503,'REPORTING_RESPONSE_INVALID');return result.data;
 }
}
