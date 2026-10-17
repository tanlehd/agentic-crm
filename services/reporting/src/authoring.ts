import {connectedSnapshots,mockSourceAllowed,sourcePin} from './connected-sources.js';
import {describeMeasures} from './authoring-measures.js';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {assertQueryAdmission,type QueryAdmission} from './query-security.js';
import {hash,StorageError} from './storage-security.js';
import {validateManifest,type SnapshotManifest} from './projection-contract.js';
export function authoringRequest(input:unknown):{kind:'authoring';after?:string}{
 const op=input as Record<string,unknown>;
 if(!op||typeof op!=='object'||Array.isArray(op)||op.kind!=='authoring'||Object.keys(op).some(k=>!['kind','after'].includes(k))||op.after!==undefined&&(typeof op.after!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(op.after)))throw new StorageError(400,'INVALID_REQUEST');
 return op as {kind:'authoring';after?:string};
}
export async function discoverAuthoring(pool:Pool,a:QueryAdmission,input:unknown,raw:string){
 assertQueryAdmission(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');const op=authoringRequest(input);
 const [rows]=mockSourceAllowed()?await pool.execute<RowDataPacket[]>(`SELECT b.id,g.manifest FROM report_source_binding b JOIN report_projection_generation g ON g.tenant_id=b.tenant_id AND g.binding_id=b.id AND g.id=b.active_generation WHERE b.tenant_id=? AND b.adapter_id='synthetic_g1_v1' AND b.environment='mock' AND g.state='ready' AND b.id>? ORDER BY b.id LIMIT 51`,[a.tenantId,op.after??'']):[[]];
 const sources=rows.slice(0,50).map(row=>{
  const m:SnapshotManifest=typeof row.manifest==='string'?JSON.parse(row.manifest):row.manifest;
  validateManifest({tenantId:a.tenantId,bindingId:String(row.id),adapterId:'synthetic_g1_v1',environment:'mock'},m);
  return {id:String(row.id),environment:'mock',name:'Snapshot mô phỏng',generation:m.snapshotId,historyFrom:m.historyFrom,observedThrough:m.observedThrough,catalog:m.catalog,availableFields:m.availableFields,measureOptions:describeMeasures(m.catalog,m.availableFields)};
 });
 if(!op.after)for(const s of connectedSnapshots())sources.unshift({id:s.binding.id,environment:'connected',name:s.manifest.adapterId==='native_conversion_v1'?'Chuyển đổi kinh doanh · CRM':'Vận hành hội thoại · CRM',generation:sourcePin(s.manifest),historyFrom:s.manifest.historyFrom,observedThrough:s.manifest.observedThrough,catalog:s.manifest.catalog,availableFields:s.manifest.availableFields,measureOptions:describeMeasures(s.manifest.catalog,s.manifest.availableFields)});
 assertQueryAdmission(a);return {environment:connectedSnapshots().length?'connected':'mock',sources,next_after:rows.length>50?sources.at(-1)!.id:null,capabilities:{visualizations:['table','kpi','bar','horizontal_bar','stacked_bar','line','area','pie','donut','pivot'],filterOperators:['eq','in','gte','lte','is_null'],maxDimensions:4,maxMetrics:8,maxRelations:5}};
}
