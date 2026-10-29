import { it,expect } from 'vitest';
import { qualification } from '../src/modules/sales/leads.js';
import type { Access } from '../src/modules/identity/domain/authorization.js';
const access:Access={tenantId:'tenant',principalId:'human',revision:'1',capabilities:['chat'],grants:[],teamIds:[],fieldDenies:[]};
it('manual consent stamps actor/time and rejects forged stamps',()=>{
  const draft={service_interest:'Synthetic',need_summary:'Need',contact_permission:true,preferred_contact_method:'messenger',consent_evidence:{kind:'manual',note:'Permission'}};
  expect(qualification(draft,access,true)).toMatchObject({consent_evidence:{recorded_by_principal_id:'human'}});
  expect(()=>qualification({...draft,consent_evidence:{...draft.consent_evidence,recorded_at:'2000-01-01T00:00:00Z'}},access,true)).toThrow();
  expect(()=>qualification({...draft,contact_permission:false},access,true)).toThrow();
  expect(()=>qualification({...draft,preferred_contact_method:'phone'},access,true)).toThrow();
});
it('saving draft merges but never infers consent',()=>{
  const result=qualification({need_summary:'Another need'},access,false,{service_interest:'Synthetic'});
  expect(result).toEqual({service_interest:'Synthetic',need_summary:'Another need'});expect(result).not.toHaveProperty('consent_evidence');
});
