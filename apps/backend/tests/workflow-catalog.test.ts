import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {catalogObject} from '../src/modules/crm/workflow-catalog.js';
import type {Access} from '../src/modules/identity/domain/authorization.js';
const access:Access={tenantId:randomUUID(),principalId:randomUUID(),revision:'1',capabilities:['read','configure','chat'],grants:['contact','lead','deal','activity','appointment'].flatMap(resource=>['read','update'].map(action=>({resource,action,scope:'own' as const}))),teamIds:[],fieldDenies:[]};
const type=(key='contact',kind:'standard'|'custom'='standard')=>({id:randomUUID(),key,label:key,kind,version:'1',schema_version:'1'});
describe('CRM-owned Workflow catalog projection',()=>{
  it('uses standard IDs and actual owner/type/capabilities, not an execution grant',()=>{
    const object=catalogObject(type(),[],access,true);expect(object.properties.find(p=>p.key==='display_name')).toMatchObject({id:'standard:display_name',required:true,writable:true});
    expect(object.capabilities).toMatchObject({record_read:true,record_update:true,workflow_actions:false,change_images:false,object_change_events:false});
    expect(object.properties.find(p=>p.key==='contact_preference')).toMatchObject({type:'opaque',writable:false,filter_operators:[]});
  });
  it('preserves custom UUIDs and enum choices without leaking defaults',()=>{
    const p={id:randomUUID(),key:'state',label:'State',type:'enum',required:0,indexed:1,options:'["new","done"]',version:'7',default_value:'sensitive'};
    const object=catalogObject(type('appointment','custom'),[p],access,true);expect(object.properties[0]).toMatchObject({id:p.id,options:['new','done'],version:'7',writable:true});expect(JSON.stringify(object)).not.toContain('sensitive');
  });
  it('read deny removes whole descriptor while filter/write deny remain independent',()=>{
    const a={...access,fieldDenies:[{resource:'contact',field:'normalized_phone',actions:['read'] as const},{resource:'contact',field:'normalized_email',actions:['filter','write'] as const}]};
    const object=catalogObject(type(),[],a,true);expect(object.properties.some(p=>p.key==='normalized_phone')).toBe(false);expect(object.properties.find(p=>p.key==='normalized_email')).toMatchObject({writable:false,filter_operators:[]});
  });
  it('does not advertise generic business transitions or immutable activity links',()=>{
    expect(catalogObject(type('lead'),[],access,true)).toMatchObject({owner_service:'sales',capabilities:{record_update:false}});
    expect(catalogObject(type('deal'),[],access,true).properties.every(p=>!p.writable)).toBe(true);
    expect(catalogObject(type('activity'),[],access,true).properties.find(p=>p.key==='kind')?.writable).toBe(false);
  });
  it('schema visibility and viewer seats do not imply data read/write',()=>{
    const object=catalogObject(type(),[],{...access,grants:[]},true);expect(object.capabilities.record_read).toBe(false);expect(object.properties.every(p=>!p.writable&&!p.filter_operators.length)).toBe(true);
    expect(catalogObject(type(),[],{...access,capabilities:['read']},true).capabilities.record_update).toBe(false);
    expect(catalogObject(type('ticket'),[],access,false).capabilities.record_read).toBe(false);
  });
  it('rejects visible catalog overflow rather than truncating and ignores hidden fields for visible limit',()=>{
    const defs=Array.from({length:201},(_,i)=>({id:randomUUID(),key:'field_'+i,label:'Field',type:'string',required:false,indexed:false,options:null,version:'1'}));
    expect(()=>catalogObject(type('appointment','custom'),defs,access,true)).toThrow('CATALOG_LIMIT_EXCEEDED');
    const denied={...access,fieldDenies:[{resource:'appointment',field:'field_0',actions:['read'] as const}]};expect(catalogObject(type('appointment','custom'),defs,denied,true).properties).toHaveLength(200);
  });
});
