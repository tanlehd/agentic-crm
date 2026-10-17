import {describe,it,expect} from 'vitest';
import {conversionAllowed} from '../src/modules/reporting/conversion-source.js';
import type {Access} from '../src/modules/identity/domain/authorization.js';
const a:Access={tenantId:'tenant',principalId:'actor',revision:'1',teamIds:[],capabilities:['read'],fieldDenies:[],grants:[{resource:'report_definition',action:'run',scope:'all'},...['conversation','contact','lead','deal'].map(resource=>({resource,action:'read',scope:'all' as const}))]};
describe('conversion complete source authority',()=>{
 it('requires all four source resources with complete scope',()=>{expect(conversionAllowed(a)).toBe(true);for(const resource of ['conversation','contact','lead','deal'])for(const scope of ['own','team'] as const)expect(conversionAllowed({...a,grants:a.grants.map(g=>g.resource===resource?{...g,scope}:g)})).toBe(false);});
 it('field read/filter denies block correlated totals; metadata fields are protected',()=>{for(const [resource,field]of [['deal','amount'],['lead','source_conversation_session_id'],['conversation','page_id'],['deal','created_at'],['conversation','text']])for(const action of ['read','filter'] as const)expect(conversionAllowed({...a,fieldDenies:[{resource:resource!,field:field!,actions:[action]}]})).toBe(false);});
 it('requires export independently and honors export-only denies',()=>{expect(conversionAllowed(a,true)).toBe(false);const exportable={...a,grants:[...a.grants,{resource:'report_definition',action:'export',scope:'all' as const}]};expect(conversionAllowed(exportable,true)).toBe(true);const denied={...exportable,fieldDenies:[{resource:'deal',field:'amount',actions:['export' as const]}]};expect(conversionAllowed(denied)).toBe(true);expect(conversionAllowed(denied,true)).toBe(false);});
});
