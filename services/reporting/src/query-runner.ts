import {digest} from './registry.js';
import {executeQuery,aggregateCsv,accessFingerprint,assertQueryAccess,QueryError,type QueryAccess,type QueryLimits,type QueryResult} from './query.js';
import {builtInExecutions, type ExecutionRegistry} from './query-registry.js';
import type {ProjectionSnapshot} from './projection-contract.js';
export interface QueryIdentity {tenantId:string;principalId:string}
export interface QueryPorts {authorize(identity:QueryIdentity,bindingId:string):Promise<QueryAccess>;load(identity:QueryIdentity,bindingId:string,generation?:string):Promise<ProjectionSnapshot>}
export class QueryRunner {
 private readonly cache=new Map<string,QueryResult>();private readonly active=new Map<string,number>();
 constructor(private readonly ports:QueryPorts,private readonly registry:ExecutionRegistry=builtInExecutions()){}
 async run(identity:QueryIdentity,bindingId:string,definition:unknown,options:QueryLimits&{generation?:string;csv?:boolean}={}):Promise<QueryResult|string>{
  const active=this.active.get(identity.tenantId)??0;if(active>=2)throw new QueryError('QUERY_CONCURRENCY_LIMIT');this.active.set(identity.tenantId,active+1);
  try{
   const access=await this.ports.authorize(identity,bindingId);assertQueryAccess(access);if(access.tenantId!==identity.tenantId||access.principalId!==identity.principalId||!access.bindings.includes(bindingId))throw new QueryError('QUERY_FORBIDDEN');
   if(options.signal?.aborted)throw new QueryError('QUERY_CANCELLED');const snapshot=await this.ports.load(identity,bindingId,options.generation);if(snapshot.binding.id!==bindingId)throw new QueryError('SNAPSHOT_MISMATCH');
   const key=digest({definition,snapshot:snapshot.binding.revision,catalog:snapshot.manifest.catalogHash,policy:accessFingerprint(access)});let result=this.cache.get(key);
   // Explicit test/operator limits must not be bypassed by an earlier cache fill.
   const customLimits=Object.keys(options).some(k=>!['generation','csv','signal'].includes(k));if(!result||customLimits){result=executeQuery(snapshot,definition,access,this.registry,options);if(this.cache.size>=16)this.cache.delete(this.cache.keys().next().value!);this.cache.set(key,structuredClone(result));}
   const current=await this.ports.authorize(identity,bindingId);assertQueryAccess(current);if(accessFingerprint(current)!==accessFingerprint(access))throw new QueryError('STALE_AUTHORIZATION');if(options.signal?.aborted)throw new QueryError('QUERY_CANCELLED');return options.csv?aggregateCsv(result):structuredClone(result);
  }finally{const n=(this.active.get(identity.tenantId)??1)-1;if(n)this.active.set(identity.tenantId,n);else this.active.delete(identity.tenantId);}
 }
}
