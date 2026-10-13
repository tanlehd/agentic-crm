import {describe,it,expect} from 'vitest';
import {createHmac} from 'node:crypto';
import {AdmissionVerifier,assertAdmission,hash,systemTenant,validateOperation,type Admission} from '../src/storage-security.js';
const id='01900000-0000-7000-8000-000000000021';
const valid=(patch:Partial<Admission>={}):Admission=>({audience:'reporting-definition-v1',tenantId:id,principalId:id,authRevision:'1',readScope:'own',designScope:'own',bodyHash:hash('{}'),issuedAt:1000,expiresAt:6000,...patch});
describe('Reporting storage boundary',()=>{
 it.each([null,{}, {kind:'list',tenantId:id},{kind:'list',limit:101},{kind:'list',limit:0},{kind:'get',id:'bad'},{kind:'create',key:id,body:{name:' ',definition:{}}},{kind:'create',key:id,body:{name:' name',definition:{}}},{kind:'create',key:id,body:{name:'Valid',definition:{},owner:id}},{kind:'update',id,key:id,expectedRevision:'01',body:{name:'Valid',definition:{}}}])('rejects invalid wire shape %#',input=>{expect(()=>validateOperation(input)).toThrow();});
 it('allows incomplete drafts without claiming executable validity',()=>{expect(validateOperation({kind:'create',key:id,body:{name:'Draft',definition:{future_model:true}}}).kind).toBe('create');});
 it('bounds nested and oversized draft values',()=>{let deep:Record<string,unknown>={};for(let n=0;n<14;n++)deep={child:deep};for(const definition of [deep,{large:'x'.repeat(65536)},{nodes:Array.from({length:10001},()=>0)}])expect(()=>validateOperation({kind:'create',key:id,body:{name:'Draft',definition}})).toThrow('DRAFT_LIMIT');});
 it.each([{tenantId:systemTenant},{tenantId:'00000000-0000-0000-0000-000000000000'},{expiresAt:1000},{expiresAt:6001},{issuedAt:1251},{authRevision:'0'},{readScope:'team'}])('rejects invalid admission %#',patch=>{expect(()=>assertAdmission(valid(patch as Partial<Admission>),1000)).toThrow();});
 it('enforces signature, raw body and bounded token length',()=>{
  const key='a'.repeat(64),verifier=new AdmissionVerifier(key),now=Date.now();const a=valid({issuedAt:now,expiresAt:now+5000});const payload=Buffer.from(JSON.stringify(a)).toString('base64url'),token=payload+'.'+createHmac('sha256',Buffer.from(key,'hex')).update(payload).digest('hex');expect(verifier.verify(token,'{}')).toEqual(a);for(const invalid of [token+'.extra',token.slice(0,-1)+'z','x'.repeat(4097),undefined])expect(()=>verifier.verify(invalid,'{}')).toThrow();expect(()=>verifier.verify(token,'{ }')).toThrow('REQUEST_BINDING_MISMATCH');
 });
});
