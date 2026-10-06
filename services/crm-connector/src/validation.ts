import { createHash } from 'node:crypto';
import { Ajv } from 'ajv';
import { default as formatsImport } from 'ajv-formats';
import { intakeSchema, type IntakeRequest } from '@agentic-crm/contracts';
const ajv = new Ajv({strict:false});
const formats = formatsImport as unknown as (a:Ajv)=>void;
formats(ajv);
const validate = ajv.compile({...intakeSchema, $ref:'#/definitions/intake-request'});
export class BridgeError extends Error {
  constructor(readonly status:number, readonly code:string){super(code);}
}
export const uuid = (value:unknown):value is string => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
export function payload(input:unknown):IntakeRequest {
  if(!validate(input)||Buffer.byteLength(JSON.stringify(input))>65536)throw new BridgeError(422,'VALIDATION_FAILED');
  const result=structuredClone(input) as IntakeRequest;
  const date=new Date(result.occurred_at).toISOString();
  if(date.slice(0,19)!==result.occurred_at.slice(0,19))throw new BridgeError(422,'VALIDATION_FAILED');
  result.occurred_at=date;
  return result;
}
export function remoteOrigin(value:string,allowLocalHttp=false):string {
  const url=new URL(value);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!['https:',...(allowLocalHttp?['http:']:[])].includes(url.protocol))throw new Error('INVALID_REMOTE_ORIGIN');
  return url.origin;
}
