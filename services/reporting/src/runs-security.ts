import {createHmac,timingSafeEqual} from 'node:crypto';
import {Ajv} from 'ajv';
import {runsSchema} from './runs-schema.generated.js';
import {assertQueryAdmission,validateQueryRequest,type QueryAdmission,type QueryRequest} from './query-security.js';
import {hash,StorageError} from './storage-security.js';
export type RunAdmission=Omit<QueryAdmission,'audience'>&{audience:'reporting-run-v1'};
export type RunOperation={kind:'create';key:string;request:Omit<QueryRequest,'format'>}|{kind:'get'|'execute'|'cancel'|'result';id:string;format?:'json'|'csv'};
const ajv=new Ajv({strict:true});ajv.addSchema(runsSchema);
export function assertRunAdmission(a:RunAdmission){if(!ajv.getSchema(runsSchema.$id+'#/definitions/admission')!(a))throw new StorageError(401,'ADMISSION_EXPIRED_OR_INVALID');assertQueryAdmission({...a,audience:'reporting-query-v1'});}
export function validateRunOperation(input:unknown):RunOperation{if(!ajv.getSchema(runsSchema.$id+'#/definitions/operation')!(input))throw new StorageError(400,'INVALID_REQUEST');const op=input as RunOperation;if(op.kind==='create')validateQueryRequest(op.request);return op;}
export class RunAdmissionVerifier{
 constructor(private readonly key:string){if(!/^[a-f0-9]{64}$/.test(key))throw new Error('REPORTING_ADMISSION_KEY_REQUIRED');}
 verify(token:unknown,raw:string):RunAdmission{if(typeof token!=='string'||token.length>4096)throw new StorageError(401,'UNAUTHORIZED');const [p,s,...rest]=token.split('.'),expected=createHmac('sha256',Buffer.from(this.key,'hex')).update(p??'').digest('hex');if(rest.length||!s||!/^[a-f0-9]{64}$/.test(s)||!timingSafeEqual(Buffer.from(s,'hex'),Buffer.from(expected,'hex')))throw new StorageError(401,'UNAUTHORIZED');let a:RunAdmission;try{a=JSON.parse(Buffer.from(p!,'base64url').toString());}catch{throw new StorageError(401,'UNAUTHORIZED');}assertRunAdmission(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');return a;}
}
