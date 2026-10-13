import { createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { Ajv } from 'ajv';
import { storageSchema } from './storage-schema.generated.js';
export class StorageError extends Error { constructor(public readonly status:number,public readonly code:string){super(code);} }
export type Scope='none'|'own'|'all';
export interface Admission {audience:'reporting-definition-v1';tenantId:string;principalId:string;authRevision:string;readScope:Scope;designScope:Scope;bodyHash:string;issuedAt:number;expiresAt:number}
export type Operation={kind:'create'|'update'|'archive'|'get'|'version'|'list';id?:string;version?:string;after?:string;limit?:number;key?:string;expectedRevision?:string;body?:{name?:string;definition?:Record<string,unknown>;archived?:boolean}};
const ajv=new Ajv({strict:true});ajv.addSchema(storageSchema);
export const hash=(body:string)=>createHash('sha256').update(body).digest('hex');
export const systemTenant='01900000-0000-7000-8000-000000000001';
export function assertAdmission(a:Admission,now=Date.now()){
 if(!ajv.getSchema(storageSchema.$id+'#/definitions/admission')!(a)||a.tenantId===systemTenant||a.tenantId==='00000000-0000-0000-0000-000000000000'||a.expiresAt<=now||a.issuedAt>now+250||a.expiresAt-a.issuedAt>5000||a.expiresAt<=a.issuedAt)throw new StorageError(401,'ADMISSION_EXPIRED_OR_INVALID');
}
export function validateOperation(input:unknown):Operation{
 if(!ajv.getSchema(storageSchema.$id+'#/definitions/operation')!(input))throw new StorageError(400,'INVALID_REQUEST');
 const op=input as Operation;
 if(op.body?.name!==undefined&&(!op.body.name.trim()||op.body.name!==op.body.name.trim()))throw new StorageError(400,'INVALID_REQUEST');
 if(op.body?.definition){
  let nodes=0;const visit=(v:unknown,depth:number)=>{if(++nodes>10000||depth>12)throw new StorageError(400,'DRAFT_LIMIT');if(v&&typeof v==='object')for(const x of Object.values(v))visit(x,depth+1);};
  visit(op.body.definition,0);if(Buffer.byteLength(JSON.stringify(op.body.definition))>65536)throw new StorageError(400,'DRAFT_LIMIT');
 }
 return op;
}
export class AdmissionVerifier {
 constructor(private readonly key:string){if(!/^[a-f0-9]{64}$/.test(key))throw new Error('REPORTING_ADMISSION_KEY_REQUIRED');}
 verify(token:unknown,raw:string):Admission{
  if(typeof token!=='string'||token.length>4096)throw new StorageError(401,'UNAUTHORIZED');
  const [payload,signature,...extra]=token.split('.');const expected=createHmac('sha256',Buffer.from(this.key,'hex')).update(payload??'').digest('hex');
  if(extra.length||!signature||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))throw new StorageError(401,'UNAUTHORIZED');
  let a:Admission;try{a=JSON.parse(Buffer.from(payload!,'base64url').toString());}catch{throw new StorageError(401,'UNAUTHORIZED');}
  assertAdmission(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');return a;
 }
}
