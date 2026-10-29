import { describe,it,expect } from 'vitest';
import { propertyInput,value,queryPlan } from '../src/modules/crm/properties.js';
import { seatCapabilities,type Access } from '../src/modules/identity/domain/authorization.js';
const access:Access={tenantId:'a',principalId:'p',revision:'1',capabilities:seatCapabilities('admin'),grants:[],teamIds:[],fieldDenies:[]};
const def=(type:string)=>propertyInput({key:'test',label:'Test',type,required:false,indexed:type!=='text',sensitive:false,...(type==='enum'?{options:['Exact','Other']}:{})});
describe('property validation boundaries',()=>{
  it('rejects unsafe integer/decimal precision and validates real dates',()=>{
    for(const v of [Number.MAX_SAFE_INTEGER+1,1.5,'1'])expect(()=>value(def('integer'),v)).toThrow();
    for(const v of ['100000000000000','1.0000001',1.5,'1e3'])expect(()=>value(def('decimal'),v)).toThrow();
    expect(value(def('decimal'),'-99999999999999.999999')).toBe('-99999999999999.999999');
    expect(()=>value(def('date'),'2026-02-29')).toThrow();expect(value(def('date'),'2024-02-29')).toBe('2024-02-29');
    expect(()=>value(def('datetime'),'2026-02-30T00:00:00Z')).toThrow();
  });
  it('requires exact enum, JSON boolean and blocks metadata type/index gaps',()=>{
    expect(()=>value(def('enum'),'exact')).toThrow();expect(()=>value(def('boolean'),0)).toThrow();
    expect(()=>propertyInput({...def('text'),indexed:true})).toThrow();
    expect(()=>propertyInput({key:'x',label:'X',type:'enum',required:false,indexed:true,sensitive:false,options:['x','x']})).toThrow();
  });
  it('denied read blocks sorting/filtering even indexed field and malformed predicates',()=>{
    const p=def('integer');const denied={...access,fieldDenies:[{resource:'custom',field:'test',actions:['read'] as const}]};
    expect(()=>queryPlan([p],denied,'custom',[],{field:'test',direction:'asc'})).toThrow('FIELD_FORBIDDEN');
    expect(()=>queryPlan([p],access,'custom',[{field:'test',op:'in',value:[]}])).toThrow();
    expect(()=>queryPlan([p],access,'custom',[{field:'test',op:'eq',value:3,sql:'escape'}])).toThrow();
  });
});
