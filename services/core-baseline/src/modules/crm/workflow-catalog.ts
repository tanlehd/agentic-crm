import {createHash} from 'node:crypto';
import type {WorkflowCatalog} from '@agentic-crm/contracts';
import {canonical,CommandError} from '../../kernel/reliability/commands.js';
import {fieldAllowed,permits,type Access} from '../identity/domain/authorization.js';
import {allows,withFieldPolicies} from './access.js';
import {standardFields,corePatchFields} from './core.js';
import {standardDescriptors} from './ui.js';
import {json} from './properties.js';
import type {CrmRecords} from './records.js';

type ObjectDescriptor=WorkflowCatalog['objects'][number];
type PropertyDescriptor=ObjectDescriptor['properties'][number];
type SourceObject={id:string;key:string;label:string;kind:'standard'|'custom';version:string;schema_version:string};
type SourceProperty={id:string;key:string;label:string;type:string;required:boolean|number;options:unknown;indexed:boolean|number;version:string};
const denied=()=>{throw new CommandError(403,'FORBIDDEN');};
const limit=()=>{throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');};
const readable=(a:Access,key:string)=>a.capabilities.includes('read')&&a.grants.some(g=>g.resource===key&&g.action==='read');
const writable=(a:Access,key:string)=>a.capabilities.some(c=>['chat','sales','service'].includes(c))&&a.grants.some(g=>g.resource===key&&g.action==='update');
const propertyTypes=new Set(['string','text','integer','decimal','boolean','date','datetime','enum','reference','opaque']);

/** Projects only canonical CRM metadata; never returns record data or runtime authority. */
export function catalogObject(type:SourceObject,custom:SourceProperty[],access:Access,implemented:boolean):ObjectDescriptor {
  const read=readable(access,type.key)&&implemented;
  const patch=type.kind==='custom'||Object.hasOwn(corePatchFields,type.key);
  const write=read&&patch&&writable(access,type.key);
  const scalar=(p:SourceProperty,standard=false):PropertyDescriptor=>{
    const editor=standard?(standardDescriptors[type.key]??[]).find(f=>f.key===p.key):undefined;
    const shape=editor?.type==='preference'||editor?.type==='qualification'?'opaque':editor?.type??p.type;
    if(!propertyTypes.has(shape))throw new CommandError(503,'CATALOG_TYPE_UNSUPPORTED');
    const required=standard?!!editor?.required:!!Number(p.required);
    const indexed=!!Number(p.indexed)&&shape!=='opaque'&&shape!=='reference';
    const canFilter=read&&indexed&&fieldAllowed(access,type.key,p.key,'filter');
    const editable=!standard||!!corePatchFields[type.key]?.includes(p.key);
    return {id:p.id,key:p.key,label:editor?.label??p.label,type:shape,required,nullable:!required,
      options:p.options===null?null:json(p.options),indexed,readable:true,
      writable:write&&editable&&shape!=='opaque'&&shape!=='reference'&&fieldAllowed(access,type.key,p.key,'write'),
      filter_operators:canFilter?['eq','in','gte','lte']:[],version:String(p.version)};
  };
  const standard=type.kind==='standard'?(standardFields[type.key]??[]).filter(p=>fieldAllowed(access,type.key,p.key,'read')).map(p=>scalar(p,true)):[];
  const properties=[...standard,...custom.filter(p=>fieldAllowed(access,type.key,p.key,'read')).map(p=>scalar(p))];
  if(properties.length>200)limit();
  return {...type,version:String(type.version),schema_version:String(type.schema_version),
    owner_service:type.kind==='custom'?'crm':type.key==='lead'||type.key==='deal'?'sales':['conversation','conversation_session','conversation_need'].includes(type.key)?'chat':type.key==='ticket'?'ticket':'crm',
    properties,capabilities:{record_read:read,record_query:read,record_update:write,workflow_actions:false,object_change_events:false,change_images:false,relation_traversal:false}};
}

export class WorkflowCatalogService {
  constructor(private readonly records:CrmRecords){}
  read(account:string,tenant:string):Promise<WorkflowCatalog>{
    return this.records.authorization.runHuman(account,tenant,async(scope,raw)=>{
      const access=await withFieldPolicies(scope,raw);
      if(!permits(access,'automation','design'))denied();
      const schemaRead=allows(access,'schema','read');
      if(!schemaRead&&!access.grants.some(g=>g.action==='read'&&access.capabilities.includes('read')))denied();
      const rows:SourceObject[]=await scope.query('SELECT id,`key`,label,kind,CAST(version AS CHAR) version,CAST(schema_version AS CHAR) schema_version FROM object_type WHERE tenant_id=? AND archived_at IS NULL ORDER BY id LIMIT 1001',[tenant]);
      if(rows.length>1000)limit();
      const visible=rows.filter(o=>schemaRead||readable(access,o.key));if(!schemaRead&&!visible.length)denied();if(visible.length>100)limit();
      const objects:ObjectDescriptor[]=[];
      for(const type of visible){
        const properties:SourceProperty[]=await scope.query('SELECT id,`key`,label,type,required,options,indexed,CAST(version AS CHAR) version FROM property_definition WHERE tenant_id=? AND object_type_id=? AND archived_at IS NULL ORDER BY id LIMIT 1001',[tenant,type.id]);
        if(properties.length>1000)limit();
        objects.push(catalogObject(type,properties,access,this.records.supportsRecords(type.key,type.kind==='custom')));
      }
      const ids=new Set(objects.map(o=>o.id));
      const all:WorkflowCatalog['relations']=await scope.query('SELECT id,`key`,label,CAST(version AS CHAR) version,source_object_type_id,target_object_type_id,cardinality FROM association_type WHERE tenant_id=? ORDER BY id LIMIT 5001',[tenant]);
      if(all.length>5000)limit();
      const relations=all.filter(r=>ids.has(r.source_object_type_id)&&ids.has(r.target_object_type_id));if(relations.length>500)limit();
      const body={schema_version:1 as const,tenant_id:tenant,principal_id:access.principalId,authorization_revision:String(access.revision),objects,relations};
      return {...body,revision:createHash('sha256').update(canonical(body)).digest('hex')};
    });
  }
}
