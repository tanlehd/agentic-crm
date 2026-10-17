import {connectedSnapshot,requireMockSource,sourcePin,liveDefinition} from './connected-sources.js';
import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {ReportingStore} from './storage.js';
import {StorageError,hash,validateOperation,type Admission} from './storage-security.js';
import {assertDashboard,dashboardOperation,mutations,validateLayout,DashboardVerifier,type DashboardAdmission,type Widget} from './dashboard-security.js';
import {dashboardTemplates} from './dashboard-templates.js';
import {canonical,createRegistry} from './registry.js';
import {compileDefinition,hasDefinitionShape} from './compiler.js';
import type {Definition} from './types.js';
import type {SnapshotManifest} from './projection-contract.js';
import {ReportingQueryService} from './query-service.js';
type Row=RowDataPacket&Record<string,any>;
const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const idFor=(v:unknown)=>{const s=hash(canonical(v));return `${s.slice(0,8)}-${s.slice(8,12)}-5${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20,32)}`;};
const increment=(v:string)=>{const n=String(BigInt(v)+1n);if(n.length>16)throw new StorageError(409,'VERSION_EXHAUSTED');return n;};
const iso=(v:string)=>v.replace(' ','T')+'Z';
async function rows(c:PoolConnection,sql:string,args:any[]=[]):Promise<Row[]>{const [r]=await c.execute<Row[]>(sql,args);return r;}
function permit(a:DashboardAdmission,r:Row,write=false){const scope=write?a.designScope:a.readScope;if(scope==='none'||scope==='own'&&r.owner_principal_id!==a.principalId)throw new StorageError(404,'NOT_FOUND');}
const actions=(a:DashboardAdmission,r:Row)=>a.designScope==='all'||a.designScope==='own'&&r.owner_principal_id===a.principalId?['read','design']:['read'];
export class DashboardService {
 constructor(private readonly store:ReportingStore,private readonly verifier:DashboardVerifier,private readonly queries:ReportingQueryService){}
 private async head(c:PoolConnection,a:DashboardAdmission,id:string,lock=false){const [r]=await rows(c,`SELECT * FROM dashboard_definition WHERE tenant_id=? AND id=?${lock?' FOR UPDATE':''}`,[a.tenantId,id]);if(!r)throw new StorageError(404,'NOT_FOUND');permit(a,r);return r;}
 private async report(c:PoolConnection,a:DashboardAdmission,id:string,version?:string,lock=false):Promise<Record<string,any>>{
  const [h]=await rows(c,`SELECT * FROM report_definition WHERE tenant_id=? AND id=?${lock?' FOR UPDATE':''}`,[a.tenantId,id]);if(!h)throw new StorageError(404,'NOT_FOUND');permit(a,h);if(h.archived)throw new StorageError(422,'REPORT_NOT_PICKABLE');
  const [v]=await rows(c,'SELECT * FROM report_version WHERE tenant_id=? AND report_id=? AND version=?',[a.tenantId,id,version??String(h.latest_version)]);if(!v)throw new StorageError(404,'NOT_FOUND');return {...h,version:String(v.version),versionName:v.name,definition:parse(v.definition)};
 }
 private async source(c:PoolConnection,a:DashboardAdmission,id:string,generation?:string,lock=false){
  if(!a.canRun)throw new StorageError(403,'FORBIDDEN');
  if(typeof id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))throw new StorageError(422,'REPORT_NOT_PICKABLE');
  const connected=connectedSnapshot(id,generation);if(connected){if(lock)await c.execute('INSERT IGNORE INTO report_connected_catalog(tenant_id,binding_id,catalog_hash,catalog,adapter_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,id,sourcePin(connected.manifest),JSON.stringify(connected.manifest.catalog),connected.manifest.adapterId]);return connected.manifest;}requireMockSource();
  const [b]=await rows(c,`SELECT * FROM report_source_binding WHERE tenant_id=? AND id=?${lock?' FOR UPDATE':''}`,[a.tenantId,id]);
  if(!b||b.environment!=='mock'||b.adapter_id!=='synthetic_g1_v1')throw new StorageError(404,'NOT_FOUND');
  if(!b.active_generation||generation&&b.active_generation!==generation)throw new StorageError(422,'SNAPSHOT_PIN_UNAVAILABLE');
  const [g]=await rows(c,"SELECT manifest FROM report_projection_generation WHERE tenant_id=? AND binding_id=? AND id=? AND state='ready'",[a.tenantId,id,b.active_generation]);if(!g)throw new StorageError(422,'SNAPSHOT_PIN_UNAVAILABLE');return parse(g.manifest) as SnapshotManifest;
 }
 private compile(a:DashboardAdmission,d:any,m:SnapshotManifest){
  d=liveDefinition(d,m);const binding={id:d.bindingId,tenantId:a.tenantId,environment:m.environment,revision:m.snapshotId,models:m.catalog.models,availableFields:m.availableFields};
  const compiled=compileDefinition(createRegistry(m.catalog),d,{tenantId:a.tenantId,principalId:a.principalId,authRevision:a.authRevision,scopeFingerprint:'dashboard_mock_v1',permissions:['report.design'],objects:m.catalog.objects.map(o=>o.id),fields:m.availableFields,bindings:[d.bindingId]},binding);
  if(!compiled.ok||Date.parse(d.time?.asOf)!==Date.parse(m.observedThrough)||Date.parse(d.time?.from)<Date.parse(m.historyFrom))throw new StorageError(422,'REPORT_NOT_PICKABLE');
 }
 private async validateWidgets(c:PoolConnection,a:DashboardAdmission,widgets:Widget[]){
  validateLayout(widgets);const reports=new Map<string,any>();
  for(const w of [...widgets].sort((x,y)=>x.reportId.localeCompare(y.reportId)))reports.set(w.id,await this.report(c,a,w.reportId,w.reportVersion,true));
  for(const w of [...widgets].sort((x,y)=>x.bindingId.localeCompare(y.bindingId))){const r=reports.get(w.id);if(r.definition.bindingId!==w.bindingId)throw new StorageError(422,'REPORT_NOT_PICKABLE');const m=await this.source(c,a,w.bindingId,w.generationId,true);this.compile(a,r.definition,m);}
 }
 private async widgets(c:PoolConnection,a:DashboardAdmission,id:string,version:string):Promise<Widget[]>{return (await rows(c,'SELECT * FROM dashboard_widget WHERE tenant_id=? AND dashboard_id=? AND dashboard_version=? ORDER BY grid_y,grid_x,id',[a.tenantId,id,version])).map(w=>({id:w.id,reportId:w.report_id,reportVersion:String(w.report_version),bindingId:w.binding_id,generationId:w.connected_catalog_hash??w.generation_id,titleOverride:w.title_override,note:w.note,layout:{x:w.grid_x,y:w.grid_y,w:w.grid_w,h:w.grid_h}}));}
 private async detail(c:PoolConnection,a:DashboardAdmission,id:string){
  const h=await this.head(c,a,id),[v]=await rows(c,'SELECT * FROM dashboard_version WHERE tenant_id=? AND dashboard_id=? AND version=?',[a.tenantId,id,h.latest_version]);if(!v)throw new StorageError(503,'STORAGE_UNAVAILABLE');
  const widgets=[];for(const w of await this.widgets(c,a,id,String(h.latest_version))){try{const r=await this.report(c,a,w.reportId,w.reportVersion);widgets.push({...w,reportName:r.versionName,definition:r.definition,latestReportVersion:String(r.latest_version)});}catch(e){if(!(e instanceof StorageError)||![403,404,422].includes(e.status))throw e;widgets.push({id:w.id,layout:w.layout,unavailable:true});}}
  return {id:h.id,name:v.name,description:v.description,revision:String(h.revision),version:String(h.latest_version),ownerPrincipalId:h.owner_principal_id,archived:!!h.archived,updatedAt:iso(h.updated_at),allowedActions:actions(a,h),widgets,templateOrigin:v.template_key?{key:v.template_key,version:v.template_version,hash:v.template_hash}:null};
 }
 private async list(c:PoolConnection,a:DashboardAdmission,op:Record<string,any>){
  const f=op.filters??{},report=op.kind==='reports'||op.kind==='legacy',table=report?'report_definition':'dashboard_definition',limit=f.limit??20,params:any[]=[a.tenantId,!!f.archived];
  let where='h.tenant_id=? AND h.archived=?';if(a.readScope==='own'||f.owner==='me'){where+=' AND h.owner_principal_id=?';params.push(a.principalId);}if(f.q){where+=' AND INSTR(LOWER(h.name),LOWER(?))>0';params.push(f.q);}
  let join='';if(report){join=' JOIN report_version v ON v.tenant_id=h.tenant_id AND v.report_id=h.id AND v.version=h.latest_version';where+=op.kind==='legacy'?" AND JSON_UNQUOTE(JSON_EXTRACT(v.definition,'$.kind'))='dashboard'":" AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(v.definition,'$.kind')),'report')<>'dashboard'";for(const [field,path]of [['model','$.model.id'],['chart','$.visualization.type']])if(f[field!]){where+=` AND JSON_UNQUOTE(JSON_EXTRACT(v.definition,'${path}'))=?`;params.push(f[field!]);}}
  if(op.kind==='usage'){await this.report(c,a,op.id);where+=' AND EXISTS(SELECT 1 FROM dashboard_widget w WHERE w.tenant_id=h.tenant_id AND w.dashboard_id=h.id AND w.dashboard_version=h.latest_version AND w.report_id=?)';params.push(op.id);}
  const signature=hash(canonical([a.tenantId,a.principalId,a.authRevision,op.kind,op.id??null,{...f,cursor:undefined}]));
  if(f.cursor){const cursor=this.verifier.readCursor(f.cursor);if(cursor.signature!==signature||typeof cursor.time!=='string'||typeof cursor.id!=='string')throw new StorageError(400,'INVALID_CURSOR');where+=' AND (h.updated_at<? OR (h.updated_at=? AND h.id<?))';params.push(cursor.time,cursor.time,cursor.id);}
  const data=await rows(c,`SELECT h.*${report?',v.definition':''} FROM ${table} h${join} WHERE ${where} ORDER BY h.updated_at DESC,h.id DESC LIMIT ${limit+1}`,params),items=[];
  for(const h of data.slice(0,limit)){
   const item:any={id:h.id,name:h.name,ownerPrincipalId:h.owner_principal_id,revision:String(h.revision),latestVersion:String(h.latest_version),archived:!!h.archived,updatedAt:iso(h.updated_at),allowedActions:actions(a,h)};
   if(report){const d=parse(h.definition),supported=hasDefinitionShape(d);item.modelRef=supported?d.model:null;item.visualizationType=supported?d.visualization.type:null;item.pickable=false;if(!supported)item.unavailableReason='REPORT_NOT_PICKABLE';
    if(op.kind==='reports'&&supported&&a.canRun&&!h.archived){try{const m=await this.source(c,a,d.bindingId);this.compile(a,d,m);item.pickable=true;item.bindingId=d.bindingId;item.generationId=sourcePin(m);}catch(e){if(!(e instanceof StorageError))throw e;item.unavailableReason=e.code;}}
    const [count]=await rows(c,`SELECT COUNT(DISTINCT dh.id) n FROM dashboard_definition dh JOIN dashboard_widget w ON w.tenant_id=dh.tenant_id AND w.dashboard_id=dh.id AND w.dashboard_version=dh.latest_version WHERE dh.tenant_id=? AND dh.archived=0 AND w.report_id=?${a.readScope==='own'?' AND dh.owner_principal_id=?':''}`,[a.tenantId,h.id,...(a.readScope==='own'?[a.principalId]:[])]);item.authorizedDashboardCount=Number(count!.n);
   }else{const [count]=await rows(c,'SELECT COUNT(*) n FROM dashboard_widget WHERE tenant_id=? AND dashboard_id=? AND dashboard_version=?',[a.tenantId,h.id,h.latest_version]);item.widgetCount=Number(count!.n);}
   if(op.kind==='legacy'){const [converted]=await rows(c,`SELECT id FROM dashboard_definition WHERE tenant_id=? AND legacy_report_id=? AND legacy_report_version=?${a.readScope==='own'?' AND owner_principal_id=?':''}`,[a.tenantId,h.id,h.latest_version,...(a.readScope==='own'?[a.principalId]:[])]);item.convertedDashboardId=converted?.id??null;}
   items.push(item);
  }
  const last=data[limit-1];return {items,nextCursor:data.length>limit?this.verifier.cursor({signature,time:last!.updated_at,id:last!.id}):null};
 }
 private async mutate(c:PoolConnection,a:DashboardAdmission,op:Record<string,any>){
  const existing=op.kind==='update'||op.kind==='archive',id=existing?op.id:idFor([a.tenantId,a.principalId,op.key]),requestHash=hash(canonical(op)),body=op.body;
  if(!existing)await c.execute('INSERT INTO dashboard_definition(tenant_id,id,owner_principal_id,name,created_at,updated_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id',[a.tenantId,id,a.principalId,body.name??'Dashboard']);
  const head=await this.head(c,a,id,true);permit(a,head,true);
  const [receipt]=await rows(c,'SELECT request_hash,result FROM dashboard_command_receipt WHERE tenant_id=? AND principal_id=? AND command_id=?',[a.tenantId,a.principalId,op.key]);if(receipt){if(receipt.request_hash!==requestHash)throw new StorageError(409,'IDEMPOTENCY_CONFLICT');return {...parse(receipt.result),replayed:true};}
  if(existing&&String(head.revision)!==op.expectedRevision)throw new StorageError(409,'VERSION_CONFLICT');
  if(existing&&head.archived&&op.kind!=='archive')throw new StorageError(409,'DASHBOARD_ARCHIVED');
  let revision=String(head.revision),version=String(head.latest_version),name=body.name??head.name,description=body.description??'',widgets:Widget[]=body.widgets??[],origin:any=null,legacy:any=null;const createdReportIds:string[]=[];
  if(existing){revision=increment(revision);if(op.kind!=='archive')version=increment(version);const [v]=await rows(c,'SELECT * FROM dashboard_version WHERE tenant_id=? AND dashboard_id=? AND version=?',[a.tenantId,id,head.latest_version]);if(v?.template_key)origin={key:v.template_key,version:v.template_version,hash:v.template_hash};}
  if(op.kind==='duplicate'){const src=await this.head(c,a,op.id,true);if(src.archived||String(src.revision)!==op.expectedRevision||String(src.latest_version)!==body.sourceVersion)throw new StorageError(409,'VERSION_CONFLICT');const [v]=await rows(c,'SELECT description FROM dashboard_version WHERE tenant_id=? AND dashboard_id=? AND version=?',[a.tenantId,src.id,src.latest_version]);description=v!.description;widgets=await this.widgets(c,a,src.id,String(src.latest_version));}
  if(op.kind==='from_template'||op.kind==='convert_legacy'){
   let recipes:any[];
   if(op.kind==='from_template'){
    const t=dashboardTemplates().find(t=>t.key===body.templateKey);if(!t||t.version!==body.templateVersion||t.contentHash!==body.templateHash)throw new StorageError(409,'TEMPLATE_CHANGED');origin={key:t.key,version:t.version,hash:t.contentHash};
    if(Object.keys(body.sourceBindings).length!==1||!body.sourceBindings[t.sourceSlot])throw new StorageError(400,'INVALID_REQUEST');
    recipes=body.selectedRecipeKeys.map((key:string)=>{const r=t.recipes.find(r=>r.key===key);if(!r)throw new StorageError(400,'INVALID_REQUEST');const definition:Definition={...r.definition,bindingId:body.sourceBindings[t.sourceSlot].bindingId};if(t.key==='business_conversion_v1'&&r.key==='won_value'){if(!body.currency)throw new StorageError(422,'CURRENCY_REQUIRED');definition.currency=body.currency;definition.filters=definition.filters.map(f=>f.field==='cv_deal.currency'?{...f,value:body.currency}:f);}return {...r,generation:body.sourceBindings[t.sourceSlot].generationId,definition};});
   }else{
    const r=await this.report(c,a,body.legacyReportId,body.legacyVersion,true);if(String(r.revision)!==op.expectedRevision||String(r.latest_version)!==body.legacyVersion)throw new StorageError(409,'VERSION_CONFLICT');
    const d=r.definition;if(d.kind!=='dashboard'||d.schemaVersion!==1||typeof d.description!=='string'||d.description.length>4000||!Array.isArray(d.widgets)||d.widgets.length>12)throw new StorageError(422,'REPORT_NOT_PICKABLE');
    const [prior]=await rows(c,'SELECT * FROM dashboard_definition WHERE tenant_id=? AND legacy_report_id=? AND legacy_report_version=?',[a.tenantId,r.id,body.legacyVersion]);if(prior)throw new StorageError(409,'LEGACY_ALREADY_CONVERTED');
    legacy={id:r.id,version:body.legacyVersion};name=r.versionName;description=d.description;recipes=d.widgets.map((w:any)=>({key:w.id,label:w.title,note:w.note,generation:w.generation,definition:w.definition}));
   }
   if(!a.canRun)throw new StorageError(403,'FORBIDDEN');widgets=[];
   for(const [i,r]of recipes.entries()){
    const m=await this.source(c,a,r.definition?.bindingId,r.generation,true);r.definition=liveDefinition(r.definition,m);this.compile(a,r.definition,m);
    const report=await this.store.mutate(c,{...a,audience:'reporting-definition-v1'} as Admission,validateOperation({kind:'create',key:idFor([op.key,'recipe',i]),body:{name:r.label,definition:r.definition}}));
    createdReportIds.push(report.id);widgets.push({id:idFor([id,'widget',i]),reportId:report.id,reportVersion:report.version,bindingId:r.definition.bindingId,generationId:r.generation,titleOverride:null,note:r.note??'',layout:r.definition.time.rollingDays?{x:(i%2)*6,y:Math.floor(i/2)*6,w:6,h:6}:{x:0,y:i*4,w:12,h:4}});
   }
  }
  if(op.kind!=='archive'){
   await this.validateWidgets(c,a,widgets);
   await c.execute('INSERT INTO dashboard_version(tenant_id,dashboard_id,version,schema_version,name,description,template_key,template_version,template_hash,created_by,created_at) VALUES (?,?,?,1,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,id,version,name,description,origin?.key??null,origin?.version??null,origin?.hash??null,a.principalId]);
   for(const w of widgets){const connected=connectedSnapshot(w.bindingId,w.generationId);await c.execute('INSERT INTO dashboard_widget(tenant_id,dashboard_id,dashboard_version,id,report_id,report_version,binding_id,generation_id,title_override,note,grid_x,grid_y,grid_w,grid_h,connected_catalog_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[a.tenantId,id,version,w.id,w.reportId,w.reportVersion,w.bindingId,connected?null:w.generationId,w.titleOverride,w.note,w.layout.x,w.layout.y,w.layout.w,w.layout.h,connected?w.generationId:null]);}
  }
  await c.execute('UPDATE dashboard_definition SET name=?,revision=?,latest_version=?,archived=?,legacy_report_id=COALESCE(?,legacy_report_id),legacy_report_version=COALESCE(?,legacy_report_version),updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[name,revision,version,op.kind==='archive'?body.archived:head.archived,legacy?.id??null,legacy?.version??null,a.tenantId,id]);
  await c.execute('INSERT INTO dashboard_audit_entry VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,randomUUID(),id,a.principalId,op.kind==='archive'?(body.archived?'archive':'restore'):op.kind,revision]);
  const event=op.kind==='archive'?(body.archived?'archived':'restored'):existing?'updated':'created';await c.execute('INSERT INTO dashboard_outbox_event VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,randomUUID(),id,'reporting.dashboard.'+event+'.v1',revision]);
  const result={dashboardId:id,revision,version,createdReportIds,replayed:false};await c.execute('INSERT INTO dashboard_command_receipt VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[a.tenantId,a.principalId,op.key,requestHash,id,JSON.stringify(result)]);return result;
 }
 private async resolveQuery(c:PoolConnection,a:DashboardAdmission,op:Record<string,any>){
  if(!a.canRun)throw new StorageError(403,'FORBIDDEN');let id=op.id,version=op.version,generation=op.body.generationId;
  if(op.kind==='query'){const h=await this.head(c,a,op.id);if(h.archived)throw new StorageError(422,'DASHBOARD_ARCHIVED');const w=(await this.widgets(c,a,op.id,op.body.dashboardVersion)).find(w=>w.id===op.widgetId);if(!w)throw new StorageError(404,'NOT_FOUND');id=w.reportId;version=w.reportVersion;generation=w.generationId;}
  const r=await this.report(c,a,id,version),m=await this.source(c,a,r.definition.bindingId,generation);this.compile(a,r.definition,m);return {definition:liveDefinition(r.definition,m) as Definition,generation,reportId:id,reportVersion:version};
 }
 async execute(a:DashboardAdmission,input:unknown,raw=JSON.stringify(input)){
  assertDashboard(a);if(a.bodyHash!==hash(raw))throw new StorageError(401,'REQUEST_BINDING_MISMATCH');const op=dashboardOperation(input);if(a.readScope==='none'||mutations.has(op.kind)&&a.designScope==='none')throw new StorageError(403,'FORBIDDEN');
  if(op.kind==='templates')return {items:dashboardTemplates()};if(op.kind==='template'){const t=dashboardTemplates().find(t=>t.key===op.templateKey);if(!t)throw new StorageError(404,'NOT_FOUND');return t;}
  const c=await this.store.pool.getConnection();try{
   if(op.kind==='query'||op.kind==='preview'){
    const r=await this.resolveQuery(c,a,op),request={definition:r.definition,generation:r.generation},body=JSON.stringify(request);
    const result=await this.queries.execute({audience:'reporting-query-v1',tenantId:a.tenantId,principalId:a.principalId,authRevision:a.authRevision,mockSource:'all',canExport:false,bodyHash:hash(body),issuedAt:a.issuedAt,expiresAt:a.expiresAt},request,body);
    await this.resolveQuery(c,a,op);assertDashboard(a);return {widgetId:op.widgetId??null,reportId:r.reportId,reportVersion:r.reportVersion,generationId:r.generation,result,completedAt:new Date().toISOString()};
   }
   await c.query("SET SESSION time_zone='+00:00'");await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
   const result=mutations.has(op.kind)?await this.mutate(c,a,op):op.kind==='get'?await this.detail(c,a,op.id):await this.list(c,a,op);assertDashboard(a);await c.commit();return result;
  }catch(e){await c.rollback();if(e instanceof StorageError)throw e;if((e as {code?:string}).code==='ER_DUP_ENTRY')throw new StorageError(409,'IDEMPOTENCY_CONFLICT');throw e;}finally{c.release();}
 }
}
