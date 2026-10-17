import {conversionCatalog} from './conversion-catalog.js';
import {AsyncLocalStorage} from 'node:async_hooks';
import {operationsCatalog} from './operations-catalog.js';
import {digest} from './registry.js';
import {ImmutableSnapshotAdapter,validUtc,validateObservations,type Observation,type ProjectionSnapshot,type SnapshotManifest} from './projection-contract.js';
import {StorageError} from './storage-security.js';
import {hasDefinitionShape} from './compiler.js';
import type {Definition} from './types.js';
interface SourcePolicy {allowMock:boolean;snapshots:ProjectionSnapshot[]}
const context=new AsyncLocalStorage<SourcePolicy>();
const sourceBinding=(tenant:string,adapter:string)=>{const s=digest([adapter,tenant]);return `${s.slice(0,8)}-${s.slice(8,12)}-5${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20,32)}`;};
export const operationsBinding=(tenant:string)=>sourceBinding(tenant,'native_operations_v1');
export const conversionBinding=(tenant:string)=>sourceBinding(tenant,'native_conversion_v1');
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export async function withSourcePolicy<T>(tenant:string,policy:any,run:()=>Promise<T>){
 if(!(exact(policy,['allowMock','operations'])||exact(policy,['allowMock','operations','conversion']))||typeof policy.allowMock!=='boolean')throw new StorageError(400,'INVALID_SOURCE_POLICY');
 const snapshots:ProjectionSnapshot[]=[];
 for(const [slot,adapterId,maxDays,maxRows,catalog]of [['operations','native_operations_v1',31,5000,operationsCatalog().catalog],['conversion','native_conversion_v1',366,10000,conversionCatalog().catalog]] as const){
 const p=policy[slot];if(p===null||p===undefined)continue;
  if(!exact(p,['schemaVersion','tenantId','asOf','historyFrom','rows'])||p.schemaVersion!==1||p.tenantId!==tenant||!validUtc(p.asOf)||!validUtc(p.historyFrom)||Date.parse(p.asOf)-Date.parse(p.historyFrom)>maxDays*86400000||Date.parse(p.historyFrom)>Date.parse(p.asOf)||!exact(p.rows,catalog.objects.map(o=>o.id)))throw new StorageError(400,'INVALID_SOURCE_PAYLOAD');
  const records:Observation[]=[];
  for(const o of catalog.objects){if(!Array.isArray(p.rows[o.id]))throw new StorageError(400,'INVALID_SOURCE_PAYLOAD');for(const row of p.rows[o.id]){if(!exact(row,catalog.fields.filter(f=>f.object===o.id).map(f=>f.id.slice(o.id.length+1))))throw new StorageError(400,'INVALID_SOURCE_PAYLOAD');records.push({object:o.id,id:row.id,revision:'1',deleted:false,observedAt:p.asOf,values:Object.fromEntries(Object.entries(row).map(([key,value])=>[o.id+'.'+key,value as any]))});}}
  if(records.length>maxRows)throw new StorageError(422,slot==='conversion'?'CONVERSION_SOURCE_LIMIT':'OPERATIONS_SOURCE_LIMIT');
  const c={tenantId:tenant,bindingId:sourceBinding(tenant,adapterId),adapterId,environment:'connected' as const};
  const adapter=new ImmutableSnapshotAdapter(c,catalog,records,50,{historyFrom:p.historyFrom,observedThrough:p.asOf}),manifest=await adapter.describe(c);
  for(const r of records)validateObservations(manifest,[r]);
  snapshots.push({binding:{id:c.bindingId,tenantId:tenant,environment:'connected',revision:manifest.snapshotId,models:catalog.models,availableFields:manifest.availableFields},manifest,records});
 }
 return context.run({allowMock:policy.allowMock,snapshots},run);
}
export function connectedSnapshots(){return context.getStore()?.snapshots??[];}
export function connectedSnapshot(id:string,pin?:string){const s=connectedSnapshots().find(s=>s.binding.id===id);if(s&&pin&&pin!==s.manifest.catalogHash)throw new StorageError(422,'SNAPSHOT_PIN_UNAVAILABLE');return s;}
export function requireMockSource(){if(context.getStore()?.allowMock===false)throw new StorageError(403,'SOURCE_FORBIDDEN');}
export function mockSourceAllowed(){return context.getStore()?.allowMock!==false;}
export function sourcePin(m:SnapshotManifest){return m.environment==='connected'?m.catalogHash:m.snapshotId;}
export function liveDefinition(input:unknown,m:SnapshotManifest):Definition{
 if(!hasDefinitionShape(input))throw new StorageError(400,'INVALID_REQUEST');const d=structuredClone(input);
 if(m.environment==='mock'){if(d.time.rollingDays!==undefined)throw new StorageError(422,'LIVE_WINDOW_UNSUPPORTED');return d;}
 if(!Number.isInteger(d.time.rollingDays)||d.time.rollingDays!<1||d.time.rollingDays!>(m.adapterId==='native_conversion_v1'?365:30))throw new StorageError(422,'LIVE_WINDOW_REQUIRED');
 d.time.asOf=m.observedThrough;d.time.to=m.observedThrough;d.time.from=new Date(Math.max(Date.parse(m.historyFrom),Date.parse(m.observedThrough)-d.time.rollingDays!*86400000)).toISOString();return d;
}
