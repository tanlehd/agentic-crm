import {operationsSource} from '../agents/operations-source.js';
import {createHash,createHmac} from 'node:crypto';
import {Ajv} from 'ajv';
import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import {IdentityAuthorization} from '../identity/authorization.js';
import {permits,type Access} from '../identity/domain/authorization.js';
import {queryApiSchema} from './query-schema.generated.js';
import {runsSchema} from './runs-schema.generated.js';
import type {ReportingBridgeConfig} from './bridge.js';
const ajv=new Ajv({strict:true});ajv.addSchema(queryApiSchema);
ajv.addSchema(runsSchema);
export function runOperation(input:unknown):Record<string,any>{if(!ajv.getSchema(runsSchema.$id+'#/definitions/operation')!(input))throw new CommandError(400,'INVALID_REQUEST');const op=input as Record<string,any>;if(op.kind==='create')queryRequest(op.request);return op;}
export function queryPermission(a:Access,csv:boolean,connectedAllowed=false){
 if(!permits(a,'report_definition','run')||!permits(a,'report_mock_source','read')&&!connectedAllowed||csv&&!permits(a,'report_definition','export'))throw new CommandError(403,'FORBIDDEN');
 return {tenantId:a.tenantId,principalId:a.principalId,authRevision:a.revision,mockSource:'all' as const,canExport:permits(a,'report_definition','export')};
}
export function queryRequest(input:unknown):{definition:Record<string,unknown>&{bindingId:string};generation?:string;format?:'json'|'csv'}{
 if(!ajv.getSchema(queryApiSchema.$id+'#/definitions/request')!(input))throw new CommandError(400,'INVALID_REQUEST');
 const request=input as {definition:Record<string,unknown>&{bindingId:string};generation?:string;format?:'json'|'csv'};
 let nodes=0;const visit=(v:unknown,depth:number)=>{if(++nodes>6000||depth>12)throw new CommandError(400,'DEFINITION_LIMIT');if(v&&typeof v==='object')for(const x of Object.values(v))visit(x,depth+1);};visit(request.definition,0);
 if(Buffer.byteLength(JSON.stringify(request.definition))>65536)throw new CommandError(400,'DEFINITION_LIMIT');return request;
}
async function boundedResponse(response:Response){
 if(!response.body)throw new CommandError(503,'REPORTING_RESPONSE_INVALID');const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4194304){await reader.cancel();throw new CommandError(503,'REPORTING_RESPONSE_INVALID');}parts.push(value);}return Buffer.concat(parts).toString('utf8');}finally{reader.releaseLock();}
}
export class ReportingQueryBridge {
 private readonly authorization:IdentityAuthorization;
 constructor(private readonly source:DataSource,private readonly config:ReportingBridgeConfig|null,private readonly request:typeof fetch=fetch){this.authorization=new IdentityAuthorization(new UnitOfWork(source));}
 async dispatch(accountId:string,tenantId:string,input:unknown){
  const operation=structuredClone(queryRequest(input));return this.send(accountId,tenantId,operation,operation.format==='csv','reporting-query-v1','query');
 }
 async dispatchRun(accountId:string,tenantId:string,input:unknown){const op=structuredClone(runOperation(input));return this.send(accountId,tenantId,op,op.kind==='result'&&op.format==='csv','reporting-run-v1','runs');}
 async discover(accountId:string,tenantId:string,after?:string){return this.send(accountId,tenantId,{kind:'authoring',...(after?{after}:{})},false,'reporting-query-v1','authoring');}
 private async send(accountId:string,tenantId:string,operation:unknown,csv:boolean,audience:string,path:string){
  if(!this.config)throw new CommandError(503,'REPORTING_NOT_CONFIGURED');const source=await operationsSource(this.source,accountId,tenantId,csv);if(path==='runs'&&!source.policy.allowMock)throw new CommandError(403,'FORBIDDEN');
  const body=JSON.stringify(path==='runs'?operation:{operation,sourcePolicy:source.policy});
  if(Buffer.byteLength(body)>4194304)throw new CommandError(400,'REQUEST_TOO_LARGE');
  const access=await this.authorization.runHuman(accountId,tenantId,async(_s,a)=>{const access=queryPermission(a,csv,source.policy.operations!==null);if(a.revision!==source.authRevision)throw new CommandError(403,'AUTHORITY_CHANGED');return access;}),issuedAt=Date.now();
  const payload=Buffer.from(JSON.stringify({audience,...access,bodyHash:createHash('sha256').update(body).digest('hex'),issuedAt,expiresAt:issuedAt+5000})).toString('base64url');
  const token=payload+'.'+createHmac('sha256',Buffer.from(this.config.key,'hex')).update(payload).digest('hex');
  const response=await this.request(this.config.url+'/internal/v1/reporting/'+(path==='runs'?'runs':'connected/'+path),{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-reporting-admission':token},body,signal:AbortSignal.timeout(4500)});
  const raw=await boundedResponse(response);let result:Record<string,any>;try{result=JSON.parse(raw);if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();}catch{throw new CommandError(503,'REPORTING_RESPONSE_INVALID');}
  await this.authorization.runHuman(accountId,tenantId,async(_s,a)=>queryPermission(a,csv,source.policy.operations!==null),{tenantId,principalId:access.principalId,revision:access.authRevision});
  if(!response.ok){const code=result.error?.code;if(typeof code!=='string'||!/^[A-Z_]{1,64}$/.test(code))throw new CommandError(503,'REPORTING_UNAVAILABLE');throw new CommandError([400,401,403,404,409,410,422,429,503,504].includes(response.status)?response.status:503,code);}
  if(csv?typeof result.data!=='string':!result.data||typeof result.data!=='object'||Array.isArray(result.data)||!['mock','connected'].includes(result.data.environment))throw new CommandError(503,'REPORTING_RESPONSE_INVALID');
  return result.data;
 }
}
