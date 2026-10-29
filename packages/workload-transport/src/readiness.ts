import {TransportError,type ServiceName,type WorkloadRoute} from './workload-tls.js';
export function workloadReadiness(service:ServiceName,check:()=>Promise<unknown>):WorkloadRoute{
 return {callers:['identity','chat','connector'],validate(v){
  if(Object.keys(v).sort().join(',')!=='request_id,schema_version,tenant_id'||v.schema_version!==1||typeof v.request_id!=='string'||typeof v.tenant_id!=='string')throw new TransportError('INVALID_REQUEST');
  return {request_id:v.request_id,tenant_id:v.tenant_id};
 },async handle(v){await check();return {schema_version:1,request_id:v.request_id,service,status:'ready'};}};
}
