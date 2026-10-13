import {ReportingRunStore} from './runs-store.js';
import {ProjectionStore} from './projections.js';
import {ReportingQueryService,completeMockAccess} from './query-service.js';
import {assertRunAdmission,validateRunOperation,type RunAdmission} from './runs-security.js';
import {hash,StorageError} from './storage-security.js';
import {aggregateCsv,QueryError,type QueryResult} from './query.js';
import {compileDefinition} from './compiler.js';
import {createRegistry,digest} from './registry.js';
export class ReportingRunService{
 constructor(private readonly store:ReportingRunStore,private readonly projections:ProjectionStore,private readonly queries:ReportingQueryService){}
 async execute(admission:RunAdmission,input:unknown,raw:string){
  const a=structuredClone(admission);assertRunAdmission(a);if(a.bodyHash!==hash(raw)||JSON.stringify(JSON.parse(raw))!==JSON.stringify(input))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');const op=structuredClone(validateRunOperation(input));
  if(op.kind==='create'){
   const requestHash=digest(op.request),existing=await this.store.lookup(a,op.key,requestHash);if(existing)return existing;
   const s=await this.projections.read({tenantId:a.tenantId,bindingId:op.request.definition.bindingId,adapterId:'synthetic_g1_v1',environment:'mock'},op.request.generation),access=completeMockAccess({...a,audience:'reporting-query-v1'},s);
   const compiled=compileDefinition(createRegistry(s.manifest.catalog),op.request.definition,{...access,permissions:[...access.permissions,'report.design']},s.binding);if(!compiled.ok)throw new QueryError(compiled.issues[0]!.code);
   return this.store.create(a,op.key,requestHash,op.request.definition,s.binding.revision);
  }
  if(op.kind==='cancel')return this.store.cancel(a,op.id);
  if(op.kind==='get')return (await this.store.read(a,op.id)).meta;
  if(op.kind==='result'){
   if(op.format==='csv'&&!a.canExport)throw new StorageError(403,'QUERY_FORBIDDEN');const row=await this.store.read(a,op.id);if(row.meta.state!=='completed'||!row.result)throw new StorageError(409,'RUN_RESULT_UNAVAILABLE');assertRunAdmission(a);return op.format==='csv'?aggregateCsv(row.result):row.result;
  }
  const claim=await this.store.claim(a,op.id);if(!claim.claimed)return claim.meta;
  const row=await this.store.read(a,op.id),request={definition:row.definition,generation:row.meta.generation_id},body=JSON.stringify(request);let result:QueryResult|null=null,error:string|null=null;
  try{result=await this.queries.execute({...a,audience:'reporting-query-v1',bodyHash:hash(body)},request,body) as QueryResult;}
  catch(e){if(e instanceof StorageError&&[401,403].includes(e.status))throw e;error=e instanceof QueryError?e.code:'RUN_EXECUTION_FAILED';}
  return this.store.finish(a,op.id,claim.meta.attempt,result,error);
 }
}
