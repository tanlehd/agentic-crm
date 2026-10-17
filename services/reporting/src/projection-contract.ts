import {createRegistry,digest} from './registry.js';
import type {Catalog,Binding} from './types.js';
import {systemTenant} from './storage-security.js';
export class ProjectionError extends Error {constructor(readonly code:string){super(code);}}
export interface ProjectionContext {tenantId:string;bindingId:string;environment:'mock'|'connected';adapterId:'synthetic_g1_v1'|'native_operations_v1'|'native_conversion_v1'}
export type Scalar=string|number|boolean|null;
export interface Observation {object:string;id:string;revision:string;deleted:boolean;observedAt:string;values:Record<string,Scalar>}
export interface SnapshotManifest extends ProjectionContext {schemaVersion:1;snapshotId:string;catalog:Catalog;catalogHash:string;observedThrough:string;historyFrom:string;availableFields:string[];pageHashes:string[];observationCount:number}
export interface SnapshotAdapter {describe(context:ProjectionContext):Promise<SnapshotManifest>;page(context:ProjectionContext,snapshotId:string,pageNumber:number):Promise<Observation[]>}
export interface SnapshotWindow {historyFrom:string;observedThrough:string}
export interface ProjectionSnapshot {binding:Binding;manifest:SnapshotManifest;records:Observation[]}
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,sha=/^[a-f0-9]{64}$/;
export function requireProjection(ok:unknown,code='INVALID_PROJECTION'):asserts ok{if(!ok)throw new ProjectionError(code);}
function exact(v:unknown,keys:string[]):asserts v is Record<string,unknown>{requireProjection(v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k)));}
export function validUtc(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;}
export function validateContext(c:ProjectionContext){requireProjection(c&&uuid.test(c.tenantId)&&![systemTenant,'00000000-0000-0000-0000-000000000000'].includes(c.tenantId)&&uuid.test(c.bindingId)&&c.bindingId!=='00000000-0000-0000-0000-000000000000'&&((c.environment==='mock'&&c.adapterId==='synthetic_g1_v1')||(c.environment==='connected'&&['native_operations_v1','native_conversion_v1'].includes(c.adapterId))),'INVALID_PROJECTION_CONTEXT');}
export function validateManifest(c:ProjectionContext,m:SnapshotManifest){
 validateContext(c);exact(m,['tenantId','bindingId','environment','adapterId','schemaVersion','snapshotId','catalog','catalogHash','observedThrough','historyFrom','availableFields','pageHashes','observationCount']);
 requireProjection(['tenantId','bindingId','environment','adapterId'].every(k=>m[k as keyof ProjectionContext]===c[k as keyof ProjectionContext]),'PROJECTION_CONTEXT_MISMATCH');
 requireProjection(m.schemaVersion===1&&sha.test(m.snapshotId)&&sha.test(m.catalogHash)&&validUtc(m.historyFrom)&&validUtc(m.observedThrough)&&m.historyFrom<=m.observedThrough);
 requireProjection(Array.isArray(m.pageHashes)&&m.pageHashes.length>0&&m.pageHashes.length<=200&&m.pageHashes.every(h=>sha.test(h))&&Number.isSafeInteger(m.observationCount)&&m.observationCount>=0&&m.observationCount<=10000&&m.observationCount<=m.pageHashes.length*100);
 const registry=createRegistry(m.catalog);requireProjection(registry.fingerprint===m.catalogHash,'CATALOG_HASH_MISMATCH');
 requireProjection(Array.isArray(m.availableFields)&&new Set(m.availableFields).size===m.availableFields.length&&m.availableFields.length===m.catalog.fields.length&&m.availableFields.every(f=>registry.field(f)),'COVERAGE_MISMATCH');
 const {snapshotId,...content}=m;requireProjection(digest(content)===snapshotId,'SNAPSHOT_HASH_MISMATCH');return m;
}
export function validateObservations(m:SnapshotManifest,input:unknown):asserts input is Observation[]{
 requireProjection(Array.isArray(input)&&input.length<=100&&Buffer.byteLength(JSON.stringify(input))<=131072,'PAGE_LIMIT');
 const objects=new Map(m.catalog.objects.map(o=>[o.id,o]));
 for(const r of input){
  exact(r,['object','id','revision','deleted','observedAt','values']);const row=r as unknown as Observation;const obj=objects.get(row.object);
  requireProjection(obj&&/^[a-z][a-z0-9_]{0,63}$/.test(row.object)&&typeof row.id==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(row.id)&&typeof row.revision==='string'&&/^[1-9][0-9]{0,15}$/.test(row.revision)&&typeof row.deleted==='boolean'&&validUtc(row.observedAt)&&row.observedAt>=m.historyFrom&&row.observedAt<=m.observedThrough);
  const fields=m.catalog.fields.filter(f=>f.object===row.object);exact(row.values,row.deleted?[]:fields.map(f=>f.id));if(row.deleted)continue;requireProjection(row.values[obj.key]===row.id);
  for(const field of fields){const v=row.values[field.id];if(v===null)continue;let ok=false;
   switch(field.type){
    case 'reference':ok=typeof v==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(v);break;
    case 'string':ok=typeof v==='string'&&v.length<=2048;break;
    case 'enum':ok=typeof v==='string'&&v.length<=2048&&!!field.values?.includes(v);break;
    case 'integer':ok=Number.isSafeInteger(v);break;
    case 'decimal':case 'money':ok=typeof v==='string'&&/^-?(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,6})?$/.test(v)&&v!=='-0';break;
    case 'datetime':ok=validUtc(v);break;
    case 'boolean':ok=typeof v==='boolean';break;
   }requireProjection(ok,'FIELD_TYPE_MISMATCH');
  }
 }
}
export function canonicalObservations(rows:Observation[]):Observation[]{
 const current=new Map<string,Observation>(),seen=new Map<string,string>();
 for(const r of rows){const key=r.object+':'+r.id,revisionKey=key+':'+r.revision,h=digest(r);requireProjection(!seen.has(revisionKey)||seen.get(revisionKey)===h,'OBSERVATION_CONFLICT');seen.set(revisionKey,h);const old=current.get(key);if(!old||BigInt(r.revision)>BigInt(old.revision))current.set(key,r);}
 return [...current.values()].filter(r=>!r.deleted).sort((a,b)=>a.object.localeCompare(b.object)||a.id.localeCompare(b.id)).map(r=>structuredClone(r));
}
export class ImmutableSnapshotAdapter implements SnapshotAdapter {
 private readonly manifest:SnapshotManifest;private readonly pages:Observation[][];
 constructor(context:ProjectionContext,catalog:Catalog,rows:Observation[],pageSize=50,window:SnapshotWindow={historyFrom:'2026-08-01T00:00:00.000Z',observedThrough:'2026-10-08T00:00:00.000Z'}){
  requireProjection(Number.isInteger(pageSize)&&pageSize>=1&&pageSize<=100);this.pages=[];for(let i=0;i<rows.length;i+=pageSize)this.pages.push(structuredClone(rows.slice(i,i+pageSize)));if(!this.pages.length)this.pages.push([]);
  const content={...context,schemaVersion:1 as const,catalog:structuredClone(catalog),catalogHash:digest(catalog),...window,availableFields:catalog.fields.map(f=>f.id),pageHashes:this.pages.map(digest),observationCount:rows.length};
  this.manifest={...content,snapshotId:digest(content)};validateManifest(context,this.manifest);for(const page of this.pages)validateObservations(this.manifest,page);
 }
 async describe(c:ProjectionContext){validateManifest(c,this.manifest);return structuredClone(this.manifest);}
 async page(c:ProjectionContext,id:string,n:number){validateManifest(c,this.manifest);requireProjection(id===this.manifest.snapshotId&&Number.isInteger(n)&&n>=0&&n<this.pages.length,'PAGE_NOT_FOUND');return structuredClone(this.pages[n]!);}
}
