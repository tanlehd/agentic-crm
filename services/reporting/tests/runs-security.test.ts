import {describe,it,expect} from 'vitest';
import {createHmac} from 'node:crypto';
import {RunAdmissionVerifier,validateRunOperation,assertRunAdmission,type RunAdmission} from '../src/runs-security.js';
import {hash} from '../src/storage-security.js';
import {acquisition,context} from './query-fixture.js';
import {runId} from '../src/runs-store.js';
const key='ab'.repeat(32),raw=JSON.stringify({kind:'get',id:context.bindingId});
const admission=():RunAdmission=>({audience:'reporting-run-v1',tenantId:context.tenantId,principalId:'01900000-0000-7000-8000-000000000041',authRevision:'1',mockSource:'all',canExport:true,bodyHash:hash(raw),issuedAt:Date.now(),expiresAt:Date.now()+5000});
const sign=(a:unknown)=>{const p=Buffer.from(JSON.stringify(a)).toString('base64url');return p+'.'+createHmac('sha256',Buffer.from(key,'hex')).update(p).digest('hex');};
describe('durable run command boundary',()=>{
 it('binds separate run audience and exact body',()=>{const a=admission(),v=new RunAdmissionVerifier(key);expect(v.verify(sign(a),raw)).toEqual(a);expect(()=>v.verify(sign({...a,audience:'reporting-query-v1'}),raw)).toThrow();expect(()=>v.verify(sign(a),raw+' ')).toThrow('REQUEST_BINDING_MISMATCH');expect(()=>v.verify('forged',raw)).toThrow('UNAUTHORIZED');});
 it('denies expired, extra-field and system admissions',()=>{for(const a of [{...admission(),expiresAt:0},{...admission(),scope:'all'},{...admission(),tenantId:'01900000-0000-7000-8000-000000000001'}])expect(()=>assertRunAdmission(a)).toThrow();});
 it('accepts exact lifecycle operations and rejects authority or format on wrong command',()=>{expect(validateRunOperation({kind:'create',key:context.bindingId,request:{definition:acquisition()}}).kind).toBe('create');for(const op of [{kind:'create',key:context.bindingId,request:{definition:acquisition(),format:'csv'}},{kind:'execute',id:context.bindingId,format:'csv'},{kind:'cancel',id:context.bindingId,attempt:1},{kind:'get',id:'invalid'},{kind:'get',id:context.bindingId,tenantId:context.tenantId}])expect(()=>validateRunOperation(op)).toThrow('INVALID_REQUEST');});
 it('bounds create definitions before persistence',()=>{expect(()=>validateRunOperation({kind:'create',key:context.bindingId,request:{definition:{...acquisition(),label:'x'.repeat(65536)}}})).toThrow('DEFINITION_LIMIT');});
 it('derives idempotent run IDs in tenant and principal namespaces',()=>{const a=admission();expect(runId(a,key)).toBe(runId({...a,authRevision:'2'},key));expect(runId(a,key)).not.toBe(runId({...a,principalId:context.bindingId},key));expect(runId(a,key)).not.toBe(runId({...a,tenantId:context.bindingId},key));});
});
