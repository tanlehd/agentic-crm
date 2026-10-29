import { describe, expect, it } from 'vitest';
import { fieldAllowed, parseGrants, permits, readableFields, seatCapabilities, type Access, type RecordAccess } from '../src/modules/identity/domain/authorization.js';
const base: Access = {tenantId:'alpha',principalId:'human',revision:'1',capabilities:seatCapabilities('chat'),grants:[],teamIds:['intake'],fieldDenies:[]};
const record: RecordAccess = {tenantId:'alpha',ownerPrincipalId:'human',teamId:null,sharedTeamIds:[]};
describe('SRC-007 authorization core', () => {
  it('requires both seat capability and role; no implicit admin or unknown action', () => {
    expect(permits({...base,capabilities:seatCapabilities('admin')},'conversation','reply',record)).toBe(false);
    const grants = parseGrants([{resource:'conversation',action:'reply',scope:'all'}]);
    expect(permits({...base,grants,capabilities:seatCapabilities('viewer')},'conversation','reply',record)).toBe(false);
    expect(permits({...base,grants},'conversation','reply',record)).toBe(true);
    expect(permits({...base,grants:[{resource:'constructor',action:'read',scope:'all'}]},'constructor','read',record)).toBe(false);
    expect(seatCapabilities('constructor')).toEqual([]);
  });
  it('unions own/team/all only within tenant; own never includes unassigned', () => {
    const own: Access = {...base,grants:[{resource:'conversation',action:'read',scope:'own'}]};
    expect(permits(own,'conversation','read',record)).toBe(true);
    expect(permits(own,'conversation','read',{...record,ownerPrincipalId:null})).toBe(false);
    expect(permits(own,'conversation','read',{...record,tenantId:'beta'})).toBe(false);
    const team: Access = {...own,grants:[...own.grants,{resource:'conversation',action:'read',scope:'team'}]};
    expect(permits(team,'conversation','read',{...record,ownerPrincipalId:'other',teamId:'intake'})).toBe(true);
    expect(permits(team,'conversation','read',{...record,ownerPrincipalId:null,sharedTeamIds:['intake']})).toBe(true);
    expect(permits(team,'conversation','reply',record)).toBe(false);
    expect(permits(team,'conversation','read',{...record,ownerPrincipalId:null,teamId:'sales'})).toBe(false);
    const all: Access = {...base,grants:[{resource:'conversation',action:'read',scope:'all'}]};
    expect(permits(all,'conversation','read',{...record,ownerPrincipalId:null})).toBe(true);
    expect(permits(all,'conversation','read',{...record,tenantId:'beta'})).toBe(false);
  });
  it('requires all scope for configuration without a record and explicit entitlement', () => {
    const grants = parseGrants([{resource:'membership',action:'update',scope:'all'}]);
    expect(permits({...base,grants},'membership','update')).toBe(false);
    expect(permits({...base,grants,capabilities:seatCapabilities('admin')},'membership','update')).toBe(true);
    expect(permits({...base,grants,capabilities:[]},'membership','update')).toBe(false);
  });
  it('field deny wins for read/write/filter/sort/export without removing unrelated fields', () => {
    const access: Access = {...base,fieldDenies:[{resource:'contact',field:'phone',actions:['read']},{resource:'contact',field:'name',actions:['write']}]};
    for (const action of ['read','filter','export'] as const) expect(fieldAllowed(access,'contact','phone',action)).toBe(false);
    expect(fieldAllowed(access,'contact','name','write')).toBe(false);
    expect(readableFields(access,'contact',{phone:'synthetic',name:'Synthetic'})).toEqual({name:'Synthetic'});
    expect(fieldAllowed(access,'company','phone','read')).toBe(true);
  });
  it('rejects malformed persisted grants instead of coercing wildcard access', () => {
    for (const value of [null,{},[{resource:'*',action:'read',scope:'all'}],[{resource:'contact',action:'read',scope:'invalid'}],[{resource:'contact',action:'read',scope:'all',extra:true}]]) expect(() => parseGrants(value)).toThrow();
  });
});
