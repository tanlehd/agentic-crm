import {connectedSnapshot,requireMockSource,liveDefinition} from './connected-sources.js';
import {AsyncLocalStorage} from 'node:async_hooks';
import {QueryRunner} from './query-runner.js';
import {QueryError,type QueryAccess} from './query.js';
import {assertQueryAdmission,validateQueryRequest,type QueryAdmission} from './query-security.js';
import {hash,StorageError} from './storage-security.js';
import type {ProjectionContext,ProjectionSnapshot} from './projection-contract.js';
interface QuerySnapshotStore {read(context:ProjectionContext,generation?:string):Promise<ProjectionSnapshot>}
interface ExecutionContext {admission:QueryAdmission;snapshot:ProjectionSnapshot}
export function completeMockAccess(a:QueryAdmission,s:ProjectionSnapshot):QueryAccess{return {tenantId:a.tenantId,principalId:a.principalId,authRevision:a.authRevision,scopeFingerprint:'native_complete_mock_v1',permissions:['report.run',...(a.canExport?['report.export']:[])],objects:s.manifest.catalog.objects.map(o=>o.id),fields:s.binding.availableFields,bindings:[s.binding.id],rows:Object.fromEntries(s.manifest.catalog.objects.map(o=>[o.id,'all'])),expiresAt:a.expiresAt};}
export class ReportingQueryService {
 private readonly context=new AsyncLocalStorage<ExecutionContext>();
 private readonly active=new Map<string,number>();
 private readonly runner=new QueryRunner({
  authorize:async()=>this.access(),
  load:async()=>this.current().snapshot,
 });
 constructor(private readonly store:QuerySnapshotStore){}
 private current(){const context=this.context.getStore();if(!context)throw new StorageError(403,'QUERY_FORBIDDEN');assertQueryAdmission(context.admission);return context;}
 private access():QueryAccess{
  const {admission:a,snapshot:s}=this.current();
  return completeMockAccess(a,s);
 }
 async execute(admission:QueryAdmission,input:unknown,raw:string){
  const a=structuredClone(admission);assertQueryAdmission(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');
  const request=structuredClone(validateQueryRequest(input));if(request.format==='csv'&&!a.canExport)throw new StorageError(403,'QUERY_FORBIDDEN');
  const count=this.active.get(a.tenantId)??0;if(count>=2)throw new QueryError('QUERY_CONCURRENCY_LIMIT');this.active.set(a.tenantId,count+1);
  try{
   const connected=connectedSnapshot(request.definition.bindingId,request.generation);if(!connected)requireMockSource();
   const snapshot=connected??await this.store.read({tenantId:a.tenantId,bindingId:request.definition.bindingId,adapterId:'synthetic_g1_v1',environment:'mock'},request.generation);
   assertQueryAdmission(a);const definition=liveDefinition(request.definition,snapshot.manifest);
   return await this.context.run({admission:a,snapshot},()=>this.runner.run({tenantId:a.tenantId,principalId:a.principalId},request.definition.bindingId,definition,{generation:request.generation,csv:request.format==='csv'}));
  }finally{const remaining=(this.active.get(a.tenantId)??1)-1;if(remaining)this.active.set(a.tenantId,remaining);else this.active.delete(a.tenantId);}
 }
}
