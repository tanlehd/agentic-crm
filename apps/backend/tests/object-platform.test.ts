import {describe,it,expect} from 'vitest';
import {workspaceInput,workspaceSettings,supportsExtensions} from '../src/modules/crm/object-platform.js';
const body={label:'Request',plural_label:'Requests',description:'',display_property_key:null,enabled:true,position:100};
describe('Object workspace configuration admission',()=>{
  it('requires an exact bounded configuration rather than coercing input',()=>{
    expect(workspaceInput({...body,label:' Request '})).toEqual(body);
    for(const value of [{...body,enabled:'true'},{...body,position:1000},{...body,position:0.1},{...body,label:' '},{...body,display_property_key:'x.y'},{...body,description:'x'.repeat(1001)}])expect(()=>workspaceInput(value)).toThrow('VALIDATION_FAILED');
    expect(()=>workspaceInput({...body,tenant_id:'other'})).toThrow('INVALID_REQUEST');
    expect(()=>workspaceInput({enabled:true})).toThrow('INVALID_REQUEST');
  });
  it('old objects stay hidden until explicit placement and preserve false/zero',()=>{
    expect(workspaceSettings({},'Request')).toEqual({...body,plural_label:'Request',enabled:false,label:undefined});
  });
  it('extension support follows real owner storage capability',()=>{
    expect(supportsExtensions('anything','custom')).toBe(true);
    expect(supportsExtensions('lead','standard')).toBe(true);
    for(const key of ['deal','conversation','ticket'])expect(supportsExtensions(key,'standard')).toBe(false);
    expect(workspaceSettings({...body,enabled:0,position:0},body.label)).toMatchObject({enabled:false,position:0});
  });
});
