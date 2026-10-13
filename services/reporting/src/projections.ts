import type {Pool,PoolConnection,RowDataPacket} from 'mysql2/promise';
import {canonical,digest} from './registry.js';
import {ProjectionError,requireProjection,validateContext,validateManifest,validateObservations,canonicalObservations,type ProjectionContext,type SnapshotManifest,type Observation,type ProjectionSnapshot,type SnapshotAdapter} from './projection-contract.js';
type Row=RowDataPacket&Record<string,any>;
const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
async function rows(c:PoolConnection,sql:string,args:(string|number|boolean)[]=[]){return (await c.execute<Row[]>(sql,args))[0];}
export class ProjectionStore {
 constructor(private readonly pool:Pool){}
 private async transaction<T>(context:ProjectionContext,work:(c:PoolConnection)=>Promise<T>){
  validateContext(context);const c=await this.pool.getConnection();
  try{await c.query("SET SESSION time_zone='+00:00'");await c.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");await c.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const result=await work(c);await c.commit();return result;}
  catch(e){await c.rollback();if(e instanceof ProjectionError)throw e;throw new ProjectionError('PROJECTION_STORAGE_UNAVAILABLE');}finally{c.release();}
 }
 private async binding(c:PoolConnection,ctx:ProjectionContext,lock=false){const [b]=await rows(c,`SELECT * FROM report_source_binding WHERE tenant_id=? AND id=? ${lock?'FOR UPDATE':''}`,[ctx.tenantId,ctx.bindingId]);requireProjection(b&&b.environment===ctx.environment&&b.adapter_id===ctx.adapterId,'BINDING_NOT_FOUND');return b;}
 private async generation(c:PoolConnection,ctx:ProjectionContext,id:string,lock=false){requireProjection(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'INVALID_GENERATION');const [g]=await rows(c,`SELECT * FROM report_projection_generation WHERE tenant_id=? AND binding_id=? AND id=? ${lock?'FOR UPDATE':''}`,[ctx.tenantId,ctx.bindingId,id]);requireProjection(g,'GENERATION_NOT_FOUND');return g;}
 async begin(ctx:ProjectionContext,input:SnapshotManifest){
  const manifest=structuredClone(input);validateManifest(ctx,manifest);
  return this.transaction(ctx,async c=>{
   await c.execute('INSERT INTO report_source_binding(tenant_id,id,adapter_id,environment,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[ctx.tenantId,ctx.bindingId,ctx.adapterId,ctx.environment]);const binding=await this.binding(c,ctx,true);
   await c.execute("INSERT INTO report_projection_generation(tenant_id,binding_id,id,manifest,base_revision,state,created_at) VALUES (?,?,?,?,?,'building',UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id",[ctx.tenantId,ctx.bindingId,manifest.snapshotId,canonical(manifest),binding.revision]);
   const generation=await this.generation(c,ctx,manifest.snapshotId);requireProjection(digest(parse(generation.manifest))===digest(manifest),'MANIFEST_CONFLICT');return {snapshotId:manifest.snapshotId,nextPage:Number(generation.next_page),state:String(generation.state)};
  });
 }
 async append(ctx:ProjectionContext,id:string,pageNumber:number,input:Observation[]){
  const page=structuredClone(input);requireProjection(Number.isInteger(pageNumber)&&pageNumber>=0&&pageNumber<200,'INVALID_PAGE');
  return this.transaction(ctx,async c=>{
   await this.binding(c,ctx,true);const generation=await this.generation(c,ctx,id,true),m=parse(generation.manifest) as SnapshotManifest;validateManifest(ctx,m);validateObservations(m,page);const hash=digest(page);requireProjection(m.pageHashes[pageNumber]===hash,'PAGE_HASH_MISMATCH');
   const keys=[ctx.tenantId,ctx.bindingId,id];const [receipt]=await rows(c,'SELECT payload_hash FROM report_projection_page WHERE tenant_id=? AND binding_id=? AND generation_id=? AND page_number=?',[...keys,pageNumber]);if(receipt){requireProjection(receipt.payload_hash===hash,'PAGE_CONFLICT');return {nextPage:Number(generation.next_page),replayed:true};}
   requireProjection(generation.state==='building','GENERATION_FROZEN');requireProjection(Number(generation.next_page)===pageNumber,'PAGE_OUT_OF_ORDER');requireProjection(Number(generation.received_count)+page.length<=m.observationCount,'OBSERVATION_COUNT_MISMATCH');
   for(const observation of page){const h=digest(observation);const [existing]=await rows(c,'SELECT payload_hash FROM report_projection_observation WHERE tenant_id=? AND binding_id=? AND generation_id=? AND object_key=? AND source_id=? AND source_revision=?',[...keys,observation.object,observation.id,observation.revision]);if(existing){requireProjection(existing.payload_hash===h,'OBSERVATION_CONFLICT');continue;}
    await c.execute('INSERT INTO report_projection_observation(tenant_id,binding_id,generation_id,object_key,source_id,source_revision,deleted,observed_at,payload,payload_hash) VALUES (?,?,?,?,?,?,?,?,?,?)',[...keys,observation.object,observation.id,observation.revision,observation.deleted,observation.observedAt.slice(0,-1).replace('T',' '),canonical(observation),h]);
   }
   await c.execute('INSERT INTO report_projection_page(tenant_id,binding_id,generation_id,page_number,payload_hash,record_count,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[...keys,pageNumber,hash,page.length]);
   await c.execute('UPDATE report_projection_generation SET next_page=next_page+1,received_count=received_count+? WHERE tenant_id=? AND binding_id=? AND id=?',[page.length,...keys]);return {nextPage:pageNumber+1,replayed:false};
  });
 }
 async activate(ctx:ProjectionContext,id:string){return this.transaction(ctx,async c=>{
  const binding=await this.binding(c,ctx,true),generation=await this.generation(c,ctx,id,true),manifest=parse(generation.manifest) as SnapshotManifest;validateManifest(ctx,manifest);
  if(binding.active_generation===id&&generation.state==='ready')return {snapshotId:id,revision:String(binding.revision)};
  requireProjection(generation.state==='building'&&String(binding.revision)===String(generation.base_revision),'GENERATION_CONFLICT');requireProjection(Number(generation.next_page)===manifest.pageHashes.length&&Number(generation.received_count)===manifest.observationCount,'SNAPSHOT_INCOMPLETE');
  const revision=String(BigInt(binding.revision)+1n);requireProjection(revision.length<=16,'REVISION_EXHAUSTED');
  await c.execute("UPDATE report_projection_generation SET state='ready' WHERE tenant_id=? AND binding_id=? AND id=?",[ctx.tenantId,ctx.bindingId,id]);await c.execute('UPDATE report_source_binding SET active_generation=?,revision=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[id,revision,ctx.tenantId,ctx.bindingId]);await c.execute('INSERT INTO report_projection_activation VALUES (?,?,?,?,UTC_TIMESTAMP(6))',[ctx.tenantId,ctx.bindingId,revision,id]);return {snapshotId:id,revision};
 });}
 async read(ctx:ProjectionContext,id?:string):Promise<ProjectionSnapshot>{return this.transaction(ctx,async c=>{
  const binding=await this.binding(c,ctx);const selected=id??binding.active_generation;requireProjection(selected,'SNAPSHOT_UNAVAILABLE');const generation=await this.generation(c,ctx,selected);requireProjection(generation.state==='ready','SNAPSHOT_NOT_READY');const manifest=parse(generation.manifest) as SnapshotManifest;validateManifest(ctx,manifest);
  const data=await rows(c,'SELECT payload FROM report_projection_observation WHERE tenant_id=? AND binding_id=? AND generation_id=? ORDER BY object_key,source_id,source_revision LIMIT 10001',[ctx.tenantId,ctx.bindingId,selected]);requireProjection(data.length<=10000,'SNAPSHOT_LIMIT');const records=canonicalObservations(data.map(r=>parse(r.payload)));
  return {binding:{id:ctx.bindingId,tenantId:ctx.tenantId,environment:'mock',revision:selected,models:manifest.catalog.models.map(({id,version})=>({id,version})),availableFields:manifest.availableFields},manifest,records};
 });}
}
export async function ingestSnapshot(store:ProjectionStore,adapter:SnapshotAdapter,context:ProjectionContext){
 const manifest=await adapter.describe(context),checkpoint=await store.begin(context,manifest);for(let n=checkpoint.nextPage;n<manifest.pageHashes.length;n++)await store.append(context,manifest.snapshotId,n,await adapter.page(context,manifest.snapshotId,n));return store.activate(context,manifest.snapshotId);
}
