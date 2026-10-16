import {describe,it,expect} from 'vitest';
import {classificationPatch} from '../src/modules/conversation/classification.js';
import type {Property} from '../src/modules/crm/properties.js';
import type {Access} from '../src/modules/identity/domain/authorization.js';
const a:Access={tenantId:'t',principalId:'p',revision:'1',capabilities:['chat'],grants:[],teamIds:[],fieldDenies:[]};
const field=(key:string,type:string,options:string[]|null=null):Property=>({id:key,key,label:key,type,required:false,default_value:null,options,indexed:false,sensitive:false,version:'1'});
const defs=[field('reason','enum',['support','sales']),field('count','integer'),field('approved','boolean')];
describe('episode classification validation',()=>{
 it('preserves untouched fields and explicitly clears only the selected value',()=>{const old={reason:'sales',count:2};expect(classificationPatch(defs,old,{reason:null},a)).toEqual({count:2});expect(old.reason).toBe('sales');});
 it('rejects write or read denied fields, including clearing',()=>{for(const action of ['write','read'] as const)expect(()=>classificationPatch(defs,{}, {reason:null},{...a,fieldDenies:[{resource:'conversation_session',field:'reason',actions:[action]}]})).toThrow('FIELD_FORBIDDEN');});
 it.each([{reason:'other'},{count:1.5},{approved:'true'},{owner:'p'},{},null,[]])('rejects malformed or authority-changing patch %j',input=>expect(()=>classificationPatch(defs,{},input,a)).toThrow());
 it('accepts typed false and zero without dropping them',()=>expect(classificationPatch(defs,{}, {count:0,approved:false},a)).toEqual({count:0,approved:false}));
 it('bounds total retained values, not just patch size',()=>expect(()=>classificationPatch([...defs,field('body','text')],Object.fromEntries(Array.from({length:20},(_,i)=>['existing'+i,'x'.repeat(4000)])),{body:'ok'},a)).toThrow('VALUES_TOO_LARGE'));
});
