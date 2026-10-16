import {defaultRecordPage,recordPageCards,type RecordPageSurface,type RecordPageInput,type RecordPageLayout,type RecordPageCard,type RecordPageView,type ResolvedRecordPage} from '@agentic-crm/contracts';
import {CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {permits,fieldAllowed,type Access} from '../identity/domain/authorization.js';
import {recordPageTeams} from '../identity/record-page-teams.js';
import {uuid} from '../identity/admin.js';
import {allows,withFieldPolicies} from './access.js';
import {object,properties,json,validKey,value} from './properties.js';
import {catalogObject} from './workflow-catalog.js';
import {workspaceSettings,supportsExtensions} from './object-platform.js';
import {RecordRegistry} from './registry.js';
import {registryId} from './ids.js';
import type {CrmRecords} from './records.js';

type Metadata=Pick<ResolvedRecordPage,'objects'|'relations'>;
const invalid=()=>{throw new CommandError(422,'INVALID_RECORD_PAGE');};
const readable=(a:Access,key:string)=>a.capabilities.includes('read')&&a.grants.some(g=>g.resource===key&&g.action==='read');
const title=(s:unknown)=>typeof s==='string'&&s.trim().length>0&&s.length<=120;
const strings=(v:unknown,max:number):v is string[]=>Array.isArray(v)&&v.length<=max&&v.every(k=>typeof k==='string')&&new Set(v).size===v.length;
export function pageSurface(surface:string):RecordPageSurface {if(surface!=='detail'&&surface!=='preview')throw new CommandError(400,'INVALID_REQUEST');return surface;}
export function recordPageInput(input:unknown,surface:RecordPageSurface):RecordPageInput {
  const b=object(input,['name','team_ids','priority','layout']);
  if(!title(b.name)||!strings(b.team_ids,20)||b.team_ids.some(k=>!uuid(k))||!Number.isInteger(b.priority)||b.priority<0||b.priority>999)invalid();
  const l=object(b.layout,['schema_version','left','tabs','right']);
  if(l.schema_version!==1||!Array.isArray(l.left)||!Array.isArray(l.right)||!Array.isArray(l.tabs)||l.tabs.length>6||surface==='detail'&&!l.tabs.length||surface==='preview'&&(l.tabs.length||l.right.length))invalid();
  const ids=new Set<string>();
  const unique=(id:unknown)=>{if(!validKey(id)||ids.has(id))invalid();ids.add(id as string);};
  for(const tab of l.tabs){const t=object(tab,['id','title','cards']);unique(t.id);if(!title(t.title)||!Array.isArray(t.cards))invalid();}
  const cards=recordPageCards(l as RecordPageLayout);if(cards.length>30||Buffer.byteLength(JSON.stringify(l),'utf8')>65536)invalid();
  for(const raw of cards){const c=object(raw,['id','title','kind','fields','relation','limit','filter','sort']);unique(c.id);
    if(!title(c.title)||!['properties','activities','association'].includes(c.kind)||!strings(c.fields,c.kind==='properties'?50:5)||c.fields.some(k=>!validKey(k))||![5,10,20].includes(c.limit)||!(c.relation===null||typeof c.relation==='string'&&(uuid(c.relation)||['contact_leads','contact_deals'].includes(c.relation))))invalid();
    if(c.filter!==null){const f=object(c.filter,['field','value']);if(!validKey(f.field)||typeof f.value!=='string'||f.value.length>255)invalid();}
    if(c.sort!==null){const s=object(c.sort,['field','direction']);if(!validKey(s.field)||!['asc','desc'].includes(s.direction))invalid();}
    if(c.kind!=='association'&&(c.relation!==null||c.filter!==null||c.sort!==null)||c.kind==='association'&&c.relation===null||c.kind==='activities'&&c.fields.length)invalid();
  }
  return {name:b.name.trim(),team_ids:b.team_ids,priority:b.priority,layout:l as RecordPageLayout};
}
export function chooseRecordPage(views:RecordPageView[],teamIds:readonly string[]):RecordPageView {
  return views.filter(v=>v.key!=='default'&&v.team_ids.some(t=>teamIds.includes(t))).sort((a,b)=>a.priority-b.priority||a.key.localeCompare(b.key))[0]??views.find(v=>v.key==='default')!;
}
export function relationTarget(card:RecordPageCard,root:string,meta:Metadata):string|undefined {
  if(card.relation==='contact_leads'||card.relation==='contact_deals')return root==='contact'?(card.relation==='contact_leads'?'lead':'deal'):undefined;
  const source=meta.objects.find(o=>o.key===root),relation=meta.relations.find(r=>r.id===card.relation);
  if(!source||!relation)return undefined;
  return meta.objects.find(o=>o.id===(relation.source_object_type_id===source.id?relation.target_object_type_id:relation.target_object_type_id===source.id?relation.source_object_type_id:''))?.key;
}
export class RecordPages {
  constructor(private readonly records:CrmRecords,private readonly commands=new DurableCommands()){}
  private async metadata(s:TransactionScope,a:Access,admin:boolean):Promise<Metadata>{
    const types=await s.query('SELECT id,`key`,label,kind,CAST(version AS CHAR) version,CAST(schema_version AS CHAR) schema_version FROM object_type WHERE tenant_id=? AND archived_at IS NULL ORDER BY id LIMIT 101',[a.tenantId]);
    if(types.length>100)throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');
    const objects:Metadata['objects']=[];
    for(const t of types){if(!admin&&!readable(a,t.key))continue;const p=await properties(s,t.id);if(p.length>200)throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');const o=catalogObject(t,p,a,this.records.supportsRecords(t.key,t.kind==='custom'));objects.push({...o,workspace:workspaceSettings({},t.label),extensions_supported:supportsExtensions(t.key,t.kind)});}
    const relations=allows(a,'association','read')?await s.query('SELECT id,`key`,label,CAST(version AS CHAR) version,source_object_type_id,target_object_type_id,cardinality FROM association_type WHERE tenant_id=? ORDER BY id LIMIT 501',[a.tenantId]):[];
    if(relations.length>500)throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');
    const ids=new Set(objects.filter(o=>readable(a,o.key)).map(o=>o.id));return {objects,relations:relations.filter((r:any)=>ids.has(r.source_object_type_id)&&ids.has(r.target_object_type_id))};
  }
  private async views(s:TransactionScope,type:any,surface:RecordPageSurface,meta:Metadata):Promise<RecordPageView[]>{
    const rows=await s.query('SELECT id,view_key, name,priority,layout,CAST(version AS CHAR) version,updated_at FROM record_page_view WHERE tenant_id=? AND object_type_id=? AND surface=? ORDER BY view_key LIMIT 101',[s.context.tenantId,type.id,surface]);if(rows.length>100)throw new CommandError(422,'VIEW_LIMIT_EXCEEDED');
    const assignments=await s.query('SELECT team_id,view_id FROM record_page_team WHERE tenant_id=? AND object_type_id=? AND surface=?',[s.context.tenantId,type.id,surface]);
    const views:RecordPageView[]=rows.map((r:any)=>({key:r.view_key,name:r.name,priority:Number(r.priority),layout:json(r.layout),version:r.version,updated_at:new Date(r.updated_at).toISOString(),team_ids:assignments.filter((t:any)=>t.view_id===r.id).map((t:any)=>t.team_id),editable:true}));
    if(!views.some(v=>v.key==='default'))views.unshift({key:'default',name:'Default view',priority:999,team_ids:[],version:'0',updated_at:null,editable:true,layout:defaultRecordPage(surface,meta.objects.find(o=>o.key===type.key)?.properties.map(p=>p.key)??[])});
    return views.sort((a,b)=>a.key==='default'?-1:b.key==='default'?1:a.priority-b.priority||a.key.localeCompare(b.key));
  }
  private filter(view:RecordPageView,root:string,a:Access,meta:Metadata):RecordPageView {
    const copy=structuredClone(view);let changed=false;
    const filter=(cards:RecordPageCard[])=>cards.flatMap(c=>{
      const target=c.kind==='association'?relationTarget(c,root,meta):root;
      if(c.kind==='activities'&&(!readable(a,'activity')||!fieldAllowed(a,'activity','related_record_id','read'))||!target||c.kind==='association'&&(!readable(a,target)||!meta.objects.find(o=>o.key===target)?.capabilities.record_read)){changed=true;return [];}
      const fields=meta.objects.find(o=>o.key===target)?.properties??[];
      if(c.filter&&!fields.some(p=>p.key===c.filter!.field&&p.filter_operators.some(op=>op==='eq'))||c.sort&&!fields.some(p=>p.key===c.sort!.field&&p.filter_operators.some(op=>op==='eq'))){changed=true;return [];}
      const visible=c.fields.filter(k=>fields.some(p=>p.key===k));if(visible.length!==c.fields.length)changed=true;return [{...c,fields:visible}];
    });
    copy.layout.left=filter(copy.layout.left);copy.layout.right=filter(copy.layout.right);copy.layout.tabs=copy.layout.tabs.map(t=>({...t,cards:filter(t.cards)}));copy.editable=!changed;return copy;
  }
  list(account:string,tenant:string,key:string,surface:RecordPageSurface){return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw);if(!allows(a,'schema','read'))throw new CommandError(403,'FORBIDDEN');
    const type=await this.records.type(s,key),meta=await this.metadata(s,a,true),teams=permits(a,'team','read')?await recordPageTeams(s,a,true):[];
    const views=(await this.views(s,type,surface,meta)).filter(v=>v.key==='default'||permits(a,'team','read')).map(v=>this.filter(v,key,a,meta));
    return {views,teams,supported:this.records.supportsRecords(key,type.kind==='custom')};
  });}
  resolve(account:string,tenant:string,key:string,surface:RecordPageSurface){return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw);if(!readable(a,key))throw new CommandError(403,'FORBIDDEN');
    const type=await this.records.type(s,key);if(!this.records.supportsRecords(key,type.kind==='custom'))throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');
    const meta=await this.metadata(s,a,false),teams=await recordPageTeams(s,a),view=chooseRecordPage(await this.views(s,type,surface,meta),teams.map(t=>t.id));
    return {...meta,view:{...this.filter(view,key,a,meta),team_ids:[]}};
  });}
  async save(account:string,tenant:string,key:string,surface:RecordPageSurface,viewKey:string,input:unknown,receipt:string,version:string|undefined,correlation:string,remove=false){
    if(viewKey!=='default'&&!uuid(viewKey)||!receipt||receipt.length>128||!/^[\x21-\x7e]+$/.test(receipt))throw new CommandError(400,'INVALID_REQUEST');
    if(version===undefined)throw new CommandError(428,'PRECONDITION_REQUIRED');if(!/^(0|[1-9][0-9]{0,19})$/.test(version))throw new CommandError(400,'INVALID_REQUEST');
    const body=remove?object(input,[]):recordPageInput(input,surface);
    return this.records.uow.run({tenantId:tenant},async s=>{
      const a=await withFieldPolicies(s,await this.records.authorization.loadHuman(s,account,undefined,true));if(!allows(a,'schema','read')||!allows(a,'schema','update')||viewKey!=='default'&&!permits(a,'team','read'))throw new CommandError(403,'FORBIDDEN');
      const type=await this.records.type(s,key);if(!this.records.supportsRecords(key,type.kind==='custom'))throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');
      const meta=await this.metadata(s,a,true),current=(await this.views(s,type,surface,meta)).find(v=>v.key===viewKey);
      if(current&&!this.filter(current,key,a,meta).editable)throw new CommandError(403,'LAYOUT_FIELDS_RESTRICTED');
      if(!remove){const b=body as RecordPageInput;if(viewKey==='default'&&b.team_ids.length||viewKey!=='default'&&!b.team_ids.length)invalid();
        const teams=viewKey==='default'?[]:await recordPageTeams(s,a,true);if(b.team_ids.some(id=>!teams.some(t=>t.id===id)))invalid();
        const candidate={...b,key:viewKey,version,updated_at:null,editable:true};if(!this.filter(candidate,key,a,meta).editable)throw new CommandError(403,'LAYOUT_FIELDS_RESTRICTED');
        for(const c of recordPageCards(b.layout)){
          if(c.kind==='association'&&c.relation!=='contact_leads'&&c.relation!=='contact_deals'&&(c.filter||c.sort))invalid();
          if(c.filter){
            const target=relationTarget(c,key,meta),p=meta.objects.find(o=>o.key===target)?.properties.find(p=>p.key===c.filter!.field);
            if(!p)invalid();
            const input=c.filter.value;
            if(p!.type==='boolean'&&!['true','false'].includes(input)||p!.type==='integer'&&!/^-?(0|[1-9][0-9]*)$/.test(input))invalid();
            value({key:p!.key,type:p!.type,options:p!.options},p!.type==='integer'?Number(input):p!.type==='boolean'?input==='true':input);
          }
        }
      }
      const command={actorId:a.principalId,correlationId:correlation,route:`${remove?'POST':'PUT'} /api/v1/object-types/${key}/record-pages/${surface}/${viewKey}${remove?'/remove':''}`,key:receipt,body,version};
      const replay=await this.commands.replay(s,command,async()=>{if(!remove&&!this.filter({...body,key:viewKey,version,updated_at:null,editable:true} as RecordPageView,key,a,meta).editable)throw new CommandError(403,'LAYOUT_FIELDS_RESTRICTED');});if(replay)return replay;
      if((current?.version??'0')!==version)throw new CommandError(409,'VERSION_CONFLICT');
      const [row]=await s.query('SELECT id FROM record_page_view WHERE tenant_id=? AND object_type_id=? AND surface=? AND view_key=?',[tenant,type.id,surface,viewKey]);
      if(remove){if(viewKey==='default')throw new CommandError(422,'DEFAULT_VIEW_PROTECTED');if(!row)throw new CommandError(404,'NOT_FOUND');}
      const id=row?.id??registryId();
      if(!remove){const b=body as RecordPageInput;
        for(const team of b.team_ids){const [assigned]=await s.query('SELECT view_id FROM record_page_team WHERE tenant_id=? AND object_type_id=? AND surface=? AND team_id=?',[tenant,type.id,surface,team]);if(assigned&&assigned.view_id!==id)throw new CommandError(409,'TEAM_VIEW_CONFLICT');}
        if(!row){const [count]=await s.query('SELECT COUNT(*) n FROM record_page_view WHERE tenant_id=? AND object_type_id=? AND surface=?',[tenant,type.id,surface]);if(Number(count.n)>=100)throw new CommandError(422,'VIEW_LIMIT_EXCEEDED');}
        await s.query('INSERT INTO record_page_view(tenant_id,id,object_type_id,surface,view_key,name,priority,layout,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE name=?,priority=?,layout=?,version=version+1,updated_at=UTC_TIMESTAMP(6)',[tenant,id,type.id,surface,viewKey,b.name,b.priority,JSON.stringify(b.layout),b.name,b.priority,JSON.stringify(b.layout)]);
      }
      await s.query('DELETE FROM record_page_team WHERE tenant_id=? AND view_id=?',[tenant,id]);
      if(remove)await s.query('DELETE FROM record_page_view WHERE tenant_id=? AND id=?',[tenant,id]);
      else for(const team of (body as RecordPageInput).team_ids)await s.query('INSERT INTO record_page_team(tenant_id,object_type_id,surface,team_id,view_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,type.id,surface,team,id]);
      const response={status:200,body:{data:{key:viewKey,version:String(BigInt(version)+1n),removed:remove},meta:{correlation_id:correlation}}};
      await this.commands.audit(s,a.principalId,correlation,'record_page_view',id,remove?'record_page.remove':'record_page.save',['layout','assignments']);await this.commands.complete(s,command,response);return response;
    });
  }
  activities(account:string,tenant:string,key:string,id:string){return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
    const a=await withFieldPolicies(s,raw),registry=new RecordRegistry();if(!uuid(id))throw new CommandError(400,'INVALID_REQUEST');const parent=await registry.get(s,id);if(parent.objectKey!==key)throw new CommandError(404,'NOT_FOUND');registry.read(a,parent);
    if(!readable(a,'activity')||!fieldAllowed(a,'activity','related_record_id','read'))throw new CommandError(403,'FORBIDDEN');
    const rows=await s.query('SELECT a.record_id FROM activity a JOIN crm_record r ON r.tenant_id=a.tenant_id AND r.id=a.record_id WHERE a.tenant_id=? AND a.related_record_id=? AND r.archived_at IS NULL ORDER BY r.created_at DESC,r.id DESC LIMIT 101',[tenant,id]);if(rows.length>100)throw new CommandError(422,'ACTIVITY_CARD_LIMIT_EXCEEDED');
    const data=[];for(const row of rows){const record=await registry.get(s,row.record_id);if(allows(a,'activity','read',record)){data.push(await this.records.output(s,a,record));if(data.length===20)break;}}return {data};
  });}
}
