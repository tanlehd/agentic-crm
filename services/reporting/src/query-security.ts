import {createHmac,timingSafeEqual} from 'node:crypto';
import {Ajv} from 'ajv';
import {queryApiSchema} from './query-schema.generated.js';
import {hash,StorageError,systemTenant} from './storage-security.js';
export interface QueryAdmission {audience:'reporting-query-v1';tenantId:string;principalId:string;authRevision:string;mockSource:'all';canExport:boolean;bodyHash:string;issuedAt:number;expiresAt:number}
export interface QueryRequest {definition:Record<string,unknown>&{bindingId:string};generation?:string;format?:'json'|'csv'}
const ajv=new Ajv({strict:true});ajv.addSchema(queryApiSchema);
export function validateQueryRequest(input:unknown):QueryRequest{
 if(!ajv.getSchema(queryApiSchema.$id+'#/definitions/request')!(input))throw new StorageError(400,'INVALID_REQUEST');
 const request=input as QueryRequest;let nodes=0;const visit=(v:unknown,depth:number)=>{if(++nodes>6000||depth>12)throw new StorageError(400,'DEFINITION_LIMIT');if(v&&typeof v==='object')for(const x of Object.values(v))visit(x,depth+1);};visit(request.definition,0);
 if(Buffer.byteLength(JSON.stringify(request.definition))>65536)throw new StorageError(400,'DEFINITION_LIMIT');return request;
}
export function assertQueryAdmission(a:QueryAdmission,now=Date.now()){
 if(!ajv.getSchema(queryApiSchema.$id+'#/definitions/admission')!(a)||[systemTenant,'00000000-0000-0000-0000-000000000000'].includes(a.tenantId)||a.expiresAt<=now||a.issuedAt>now+250||a.expiresAt<=a.issuedAt||a.expiresAt-a.issuedAt>5000)throw new StorageError(401,'ADMISSION_EXPIRED_OR_INVALID');
}
export class QueryAdmissionVerifier {
 constructor(private readonly key:string){if(!/^[a-f0-9]{64}$/.test(key))throw new Error('REPORTING_ADMISSION_KEY_REQUIRED');}
 verify(token:unknown,raw:string):QueryAdmission{
  if(typeof token!=='string'||token.length>4096)throw new StorageError(401,'UNAUTHORIZED');
  const [payload,signature,...extra]=token.split('.'),expected=createHmac('sha256',Buffer.from(this.key,'hex')).update(payload??'').digest('hex');
  if(extra.length||!signature||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))throw new StorageError(401,'UNAUTHORIZED');
  let a:QueryAdmission;try{a=JSON.parse(Buffer.from(payload!,'base64url').toString());}catch{throw new StorageError(401,'UNAUTHORIZED');}
  assertQueryAdmission(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');return a;
 }
}
