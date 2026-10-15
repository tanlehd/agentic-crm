import {describe,it,expect} from 'vitest';
import {principalPermissions,seatCapabilities,permits,fieldAllowed,type Access} from '../src/modules/identity/domain/authorization.js';
import {allows,withFieldPolicies} from '../src/modules/crm/access.js';
import type {TransactionScope} from '../src/kernel/tenancy/unit-of-work.js';

const roles=[{key:'tenant_admin',permissions:[]}];
const access:Access={tenantId:'alpha',principalId:'human',revision:'1',capabilities:seatCapabilities('admin'),teamIds:[],fieldDenies:[{resource:'custom_case',field:'secret',actions:['read','write']}],...principalPermissions('human','admin',roles)};
describe('tenant super admin',()=>{
  it('derives privilege from Human, admin seat and tenant_admin key; not names, seat alone, AI or service',()=>{
    expect(access.superAdmin).toBe(true);
    for(const [kind,seat,assigned,active] of [['human','admin',[],true],['human','viewer',roles,true],['ai','admin',roles,true],['service','admin',roles,true],['human','admin',roles,false],['human','admin',[{key:'super_admin',permissions:[]}],true]] as const){
      const p=principalPermissions(kind,seat,assigned,active);expect(p.superAdmin).toBe(false);expect(p.grants).toEqual([]);
    }
  });
  it('grants all registered module rights despite empty explicit permissions, preserves tenant and unknown-action checks',()=>{
    const record={tenantId:'alpha',ownerPrincipalId:'other',teamId:'other',sharedTeamIds:[]};
    for(const [resource,actions]of Object.entries({report_definition:['read','design','run','export'],report_mock_source:['read'],conversation:['read','reply','takeover'],automation:['read','design','publish','operate'],membership:['update']})){
      for(const action of actions){expect(permits(access,resource,action,record)).toBe(true);expect(permits(access,resource,action,{...record,tenantId:'beta'})).toBe(false);}
    }
    expect(permits(access,'unknown','read')).toBe(false);expect(permits(access,'conversation','unknown')).toBe(false);
    expect(permits(access,'conversation','constructor')).toBe(false);
    for(const resource of ['contact','lead','deal','schema','association','report'])expect(allows(access,resource,'read',record)).toBe(true);
    expect(allows(access,'deal','unknown',record)).toBe(false);
  });
  it('CRM expands only its active catalog in tenant and bypasses field denies, while ordinary roles retain denies',async()=>{
    const scope={context:{tenantId:'alpha'},query:async(sql:string,params:unknown[])=>{expect(sql).toContain('archived_at IS NULL');expect(params).toEqual(['alpha']);return [{key:'custom_case'}];}} as unknown as TransactionScope;
    const a=await withFieldPolicies(scope,access),record={tenantId:'alpha',ownerPrincipalId:'other',teamId:null,sharedTeamIds:[]};
    for(const action of ['read','create','update','assign','archive']){expect(allows(a,'custom_case',action,record)).toBe(true);expect(allows(a,'custom_case',action,{...record,tenantId:'beta'})).toBe(false);}
    expect(allows(a,'unregistered_custom','read',record)).toBe(false);
    for(const action of ['read','write','filter','export'] as const)expect(fieldAllowed(access,'custom_case','secret',action)).toBe(true);
    expect(fieldAllowed({...access,superAdmin:false},'custom_case','secret','read')).toBe(false);
    await expect(withFieldPolicies({...scope,context:{tenantId:'beta'}} as TransactionScope,access)).rejects.toThrow('FORBIDDEN');
  });
});
