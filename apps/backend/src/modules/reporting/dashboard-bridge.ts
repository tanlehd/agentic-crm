import {connectedPolicy} from './connected-policy.js';
import {createHash,createHmac} from 'node:crypto';
import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {IdentityAuthorization} from '../identity/authorization.js';
import {permits,type Access} from '../identity/domain/authorization.js';
import type {ReportingBridgeConfig} from './bridge.js';
const mutations=['create','update','archive','duplicate','from_template','convert_legacy'];
function scope(a:Access,action:'read'|'design'){
 if(!permits(a,'report_definition',action,{tenantId:a.tenantId,ownerPrincipalId:a.principalId,teamId:null,sharedTeamIds:[]}))return 'none';
 const grants=a.grants.filter(g=>g.resource==='report_definition'&&g.action===action);return grants.some(g=>g.scope==='all')?'all':grants.some(g=>g.scope==='own')?'own':'none';
}
export class DashboardBridge {
 private readonly authorization:IdentityAuthorization;
 constructor(private readonly source:DataSource,private readonly config:ReportingBridgeConfig|null,private readonly request:typeof fetch=fetch){this.authorization=new IdentityAuthorization(new UnitOfWork(source));}
 async dispatch(accountId:string,tenantId:string,op:Record<string,unknown>){
  if(!this.config)throw new CommandError(503,'REPORTING_NOT_CONFIGURED');const source=await connectedPolicy(this.source,accountId,tenantId);const body=JSON.stringify({operation:op,sourcePolicy:source.policy});if(Buffer.byteLength(body)>4194304)throw new CommandError(413,'REQUEST_TOO_LARGE');
  const access=await this.authorization.runHuman(accountId,tenantId,async(_s,a)=>{if(a.revision!==source.authRevision)throw new CommandError(403,'AUTHORITY_CHANGED');const readScope=scope(a,'read'),designScope=scope(a,'design'),canRun=permits(a,'report_definition','run')&&(source.policy.allowMock||(source.policy.operations!==null||source.policy.conversion!==null));if(readScope==='none'||mutations.includes(String(op.kind))&&designScope==='none'||['query','preview','from_template','convert_legacy'].includes(String(op.kind))&&!canRun)throw new CommandError(403,'FORBIDDEN');return {tenantId:a.tenantId,principalId:a.principalId,authRevision:a.revision,readScope,designScope,canRun};});
  const issuedAt=Date.now(),payload=Buffer.from(JSON.stringify({audience:'reporting-dashboard-v1',...access,bodyHash:createHash('sha256').update(body).digest('hex'),issuedAt,expiresAt:issuedAt+5000})).toString('base64url'),token=payload+'.'+createHmac('sha256',Buffer.from(this.config.key,'hex')).update(payload).digest('hex');
  const response=await this.request(this.config.url+'/internal/v1/reporting/connected/dashboards',{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-reporting-admission':token},body,signal:AbortSignal.timeout(4500)});
  if(!response.body)throw new CommandError(503,'REPORTING_RESPONSE_INVALID');const reader=response.body.getReader(),parts:Uint8Array[]=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4194304){await reader.cancel();throw new CommandError(503,'REPORTING_RESPONSE_INVALID');}parts.push(value);}}finally{reader.releaseLock();}
  let result:any;try{result=JSON.parse(Buffer.concat(parts).toString());}catch{throw new CommandError(503,'REPORTING_RESPONSE_INVALID');}
  await this.authorization.runHuman(accountId,tenantId,async()=>{}, {tenantId,principalId:access.principalId,revision:access.authRevision});
  if(!response.ok){const code=result?.error?.code;if(typeof code!=='string'||!/^[A-Z_]{1,64}$/.test(code))throw new CommandError(503,'REPORTING_UNAVAILABLE');throw new CommandError([400,401,403,404,409,413,422,428,429,503,504].includes(response.status)?response.status:503,code);}
  if(!result?.data||typeof result.data!=='object')throw new CommandError(503,'REPORTING_RESPONSE_INVALID');return result.data;
 }
}
