import {describe,it,expect} from 'vitest';
import {authoringRequest,discoverAuthoring} from '../src/authoring.js';
import {syntheticAdapter} from '../src/synthetic-source.js';
import {hash} from '../src/storage-security.js';
import type {QueryAdmission} from '../src/query-security.js';
import type {Pool} from 'mysql2/promise';
const tenantId='11111111-1111-4111-a111-111111111111',bindingId='22222222-2222-4222-a222-222222222222',context={tenantId,bindingId,environment:'mock' as const,adapterId:'synthetic_g1_v1' as const};
const admission=(raw:string):QueryAdmission=>{const now=Date.now();return {audience:'reporting-query-v1',tenantId,principalId:bindingId,authRevision:'1',mockSource:'all',canExport:false,bodyHash:hash(raw),issuedAt:now,expiresAt:now+5000};};
describe('authoring discovery boundaries',()=>{
 it('rejects query bodies and privilege or tenant injection',()=>{for(const body of [null,[],{kind:'query'},{kind:'authoring',tenantId},{kind:'authoring',after:'bad'},{kind:'authoring',access:'all'}])expect(()=>authoringRequest(body)).toThrow();expect(authoringRequest({kind:'authoring',after:bindingId}).after).toBe(bindingId);});
 it('reads tenant-scoped manifests only and never exposes observations or source tenant fields',async()=>{const manifest=await syntheticAdapter(context).describe(context),raw='{"kind":"authoring"}';let query='';let args:unknown;
  const pool={execute:async(sql:string,params:unknown)=>{query=sql;args=params;return [[{id:bindingId,manifest}]];}} as unknown as Pool;
  const result=await discoverAuthoring(pool,admission(raw),JSON.parse(raw),raw);expect(args).toEqual([tenantId,'']);expect(query).toContain('g.tenant_id=b.tenant_id');expect(query).toContain('LIMIT 51');expect(result.sources[0]!.generation).toBe(manifest.snapshotId);expect(result.sources[0]).not.toHaveProperty('tenantId');expect(result.sources[0]).not.toHaveProperty('records');expect(result.capabilities.visualizations).toEqual(['table','kpi','bar','horizontal_bar','stacked_bar','line','area','pie','donut','pivot']);
 });
 it('rejects expiry after database work and request body substitution',async()=>{const raw='{"kind":"authoring"}',a=admission(raw),pool={execute:async()=>{a.expiresAt=Date.now()-1;return [[]];}} as unknown as Pool;await expect(discoverAuthoring(pool,a,JSON.parse(raw),raw)).rejects.toThrow('ADMISSION_EXPIRED_OR_INVALID');await expect(discoverAuthoring(pool,admission(raw),JSON.parse(raw),raw+' ')).rejects.toThrow('REQUEST_BINDING_MISMATCH');});
});
