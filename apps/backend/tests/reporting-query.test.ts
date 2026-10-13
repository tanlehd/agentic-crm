import {describe,it,expect} from 'vitest';
import {queryPermission,queryRequest} from '../src/modules/reporting/query-bridge.js';
import type {Access} from '../src/modules/identity/domain/authorization.js';
const access:Access={tenantId:'01900000-0000-7000-8000-000000000021',principalId:'01900000-0000-7000-8000-000000000041',revision:'1',capabilities:['read'],grants:[{resource:'report_definition',action:'run',scope:'all'},{resource:'report_mock_source',action:'read',scope:'all'}],teamIds:[],fieldDenies:[]};
describe('native mock query policy',()=>{
 it('allows a viewer only with explicit source and run grants',()=>{expect(queryPermission(access,false).mockSource).toBe('all');for(const a of [{...access,grants:access.grants.slice(0,1)},{...access,grants:access.grants.slice(1)},{...access,capabilities:[]}])expect(()=>queryPermission(a,false)).toThrow('FORBIDDEN');});
 it.each(['own','team'] as const)('does not reinterpret %s grants as complete mock access',scope=>{expect(()=>queryPermission({...access,grants:access.grants.map(g=>({...g,scope}))},false)).toThrow('FORBIDDEN');});
 it('requires a separate export grant and does not infer execution from design/read',()=>{expect(()=>queryPermission(access,true)).toThrow('FORBIDDEN');expect(queryPermission({...access,grants:[...access.grants,{resource:'report_definition',action:'export',scope:'all'}]},true).canExport).toBe(true);expect(()=>queryPermission({...access,grants:[{resource:'report_definition',action:'design',scope:'all'},{resource:'report_definition',action:'read',scope:'all'}]},false)).toThrow('FORBIDDEN');});
 it('rejects caller supplied authority and enforces bounded definitions before dispatch',()=>{const definition={bindingId:access.tenantId};expect(queryRequest({definition})).toEqual({definition});expect(()=>queryRequest({definition,permissions:['report.run']})).toThrow('INVALID_REQUEST');expect(()=>queryRequest({definition:{...definition,label:'x'.repeat(65536)}})).toThrow('DEFINITION_LIMIT');});
});
