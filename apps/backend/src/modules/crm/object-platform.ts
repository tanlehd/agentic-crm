import {createHash} from 'node:crypto';
import type {ObjectPlatformCatalog,ObjectWorkspace,ObjectWorkspaceInput,WorkspaceObject} from '@agentic-crm/contracts';
import {canonical,CommandError,DurableCommands} from '../../kernel/reliability/commands.js';
import {fieldAllowed,type Access} from '../identity/domain/authorization.js';
import {allows,withFieldPolicies} from './access.js';
import {catalogObject} from './workflow-catalog.js';
import {object,properties,validKey,checkField} from './properties.js';
import type {CrmRecords} from './records.js';

export const supportsExtensions=(key:string,kind:string)=>kind==='custom'||['contact','company','activity','lead','conversation_session','conversation_need'].includes(key);
const hasRead=(a:Access,key:string)=>a.capabilities.includes('read')&&a.grants.some(g=>g.resource===key&&g.action==='read');
const overflow=()=>{throw new CommandError(422,'CATALOG_LIMIT_EXCEEDED');};
export function workspaceSettings(row:Record<string,any>,label:string):ObjectWorkspace {
  return {plural_label:row.plural_label??label,description:row.description??'',display_property_key:row.display_property_key??null,enabled:!!Number(row.enabled??0),position:Number(row.position??100)};
}
export function workspaceInput(input:unknown):ObjectWorkspaceInput {
  const keys=['label','plural_label','description','display_property_key','enabled','position'],b=object(input,keys);
  if(keys.some(k=>!Object.hasOwn(b,k)))throw new CommandError(400,'INVALID_REQUEST');
  if(['label','plural_label'].some(k=>typeof b[k]!=='string'||!b[k].trim()||b[k].length>255)||typeof b.description!=='string'||b.description.length>1000||typeof b.enabled!=='boolean'||!Number.isInteger(b.position)||b.position<0||b.position>999||b.display_property_key!==null&&!validKey(b.display_property_key))throw new CommandError(422,'VALIDATION_FAILED');
  return {...b,label:b.label.trim(),plural_label:b.plural_label.trim()} as ObjectWorkspaceInput;
}
export class ObjectPlatform {
  constructor(private readonly records:CrmRecords,private readonly commands=new DurableCommands()){}
  associations(account:string,tenant:string){return this.records.authorization.runHuman(account,tenant,async(scope,raw)=>{
    const access=await withFieldPolicies(scope,raw);if(!hasRead(access,'association'))throw new CommandError(403,'FORBIDDEN');
    const rows=await scope.query('SELECT a.id,a.`key`,a.label,CAST(a.version AS CHAR) version,a.source_object_type_id,a.target_object_type_id,a.cardinality,s.`key` source_key,t.`key` target_key FROM association_type a JOIN object_type s ON s.tenant_id=a.tenant_id AND s.id=a.source_object_type_id JOIN object_type t ON t.tenant_id=a.tenant_id AND t.id=a.target_object_type_id WHERE a.tenant_id=? AND s.archived_at IS NULL AND t.archived_at IS NULL ORDER BY a.id LIMIT 5001',[tenant]);
    if(rows.length>5000)overflow();const visible=rows.filter((r:any)=>hasRead(access,r.source_key)&&hasRead(access,r.target_key));if(visible.length>500)overflow();
    return visible.map(({source_key:_source,target_key:_target,...relation}:Record<string,any>)=>relation);
  });}
  catalog(account:string,tenant:string):Promise<ObjectPlatformCatalog>{return this.records.authorization.runHuman(account,tenant,async(scope,raw)=>{
    const access=await withFieldPolicies(scope,raw);if(!allows(access,'schema','read'))throw new CommandError(403,'FORBIDDEN');
    const rows=await scope.query('SELECT o.id,o.`key`,o.label,o.kind,CAST(o.version AS CHAR) version,CAST(o.schema_version AS CHAR) schema_version,c.plural_label,c.description,c.display_property_key,c.enabled,c.position FROM object_type o LEFT JOIN object_workspace_config c ON c.tenant_id=o.tenant_id AND c.object_type_id=o.id WHERE o.tenant_id=? AND o.archived_at IS NULL ORDER BY o.id LIMIT 101',[tenant]);
    if(rows.length>100)overflow();
    const objects:ObjectPlatformCatalog['objects']=[];
    for(const row of rows){
      const defs=await scope.query('SELECT id,`key`,label,type,required,options,indexed,CAST(version AS CHAR) version FROM property_definition WHERE tenant_id=? AND object_type_id=? AND archived_at IS NULL ORDER BY id LIMIT 1001',[tenant,row.id]);if(defs.length>1000)overflow();
      const {id,key,label,kind,version,schema_version}=row;
      const projected=catalogObject({id,key,label,kind,version,schema_version},defs,access,this.records.supportsRecords(key,kind==='custom'));
      const workspace=workspaceSettings(row,label);
      if(workspace.display_property_key&&!fieldAllowed(access,key,workspace.display_property_key,'read'))workspace.display_property_key=null;
      objects.push({...projected,workspace,extensions_supported:supportsExtensions(key,kind)});
    }
    const ids=new Set(objects.map(o=>o.id));
    const all=await scope.query('SELECT id,`key`,label,CAST(version AS CHAR) version,source_object_type_id,target_object_type_id,cardinality FROM association_type WHERE tenant_id=? ORDER BY id LIMIT 5001',[tenant]);
    if(all.length>5000)overflow();const relations=all.filter((r:any)=>ids.has(r.source_object_type_id)&&ids.has(r.target_object_type_id));if(relations.length>500)overflow();
    const body={schema_version:1 as const,tenant_id:tenant,principal_id:access.principalId,authorization_revision:String(access.revision),objects,relations};
    return {...body,revision:createHash('sha256').update(canonical(body)).digest('hex')};
  });}
  workspace(account:string,tenant:string):Promise<WorkspaceObject[]>{return this.records.authorization.runHuman(account,tenant,async(scope,raw)=>{
    const access=await withFieldPolicies(scope,raw);if(!access.capabilities.includes('read'))throw new CommandError(403,'FORBIDDEN');
    const rows=await scope.query("SELECT o.id,o.`key`,o.label,o.kind,CAST(o.version AS CHAR) version,c.plural_label,c.display_property_key,c.position FROM object_type o JOIN object_workspace_config c ON c.tenant_id=o.tenant_id AND c.object_type_id=o.id WHERE o.tenant_id=? AND o.archived_at IS NULL AND o.kind='custom' AND c.enabled=1 ORDER BY c.position,c.plural_label,o.id LIMIT 1001",[tenant]);
    if(rows.length>1000)overflow();const visible=rows.filter((r:any)=>hasRead(access,r.key));if(visible.length>100)overflow();
    return visible.map((r:any)=>({id:r.id,key:r.key,label:r.plural_label,kind:'custom' as const,version:r.version,display_property_key:r.display_property_key&&fieldAllowed(access,r.key,r.display_property_key,'read')?r.display_property_key:null,position:Number(r.position)}));
  });}
  async save(account:string,tenant:string,objectKey:string,input:unknown,key:string,version:string|undefined,correlation:string){
    const body=workspaceInput(input);
    if(!version)throw new CommandError(428,'PRECONDITION_REQUIRED');
    if(!/^[1-9][0-9]{0,19}$/.test(version)||!key||key.length>128||!/^[\x21-\x7e]+$/.test(key))throw new CommandError(400,'INVALID_REQUEST');
    return this.records.uow.run({tenantId:tenant},async scope=>{
      const access=await withFieldPolicies(scope,await this.records.authorization.loadHuman(scope,account,undefined,true));
      if(!allows(access,'schema','read')||!allows(access,'schema','update'))throw new CommandError(403,'FORBIDDEN');
      const type=await this.records.type(scope,objectKey),defs=await properties(scope,type.id);
      if(type.kind!=='custom'&&(body.enabled||body.display_property_key!==null||body.label!==type.label))throw new CommandError(422,'STANDARD_OBJECT_PROTECTED');
      if(body.display_property_key){checkField(access,objectKey,body.display_property_key,'read');if(!defs.some(p=>p.key===body.display_property_key&&['string','enum'].includes(p.type)))throw new CommandError(422,'INVALID_DISPLAY_PROPERTY');}
      const command={actorId:access.principalId,correlationId:correlation,route:`PUT /api/v1/object-types/${objectKey}/workspace`,key,body,version};
      const replay=await this.commands.replay(scope,command,async response=>{
        const prior=response.body.data.workspace as ObjectWorkspace;if(prior.display_property_key)checkField(access,objectKey,prior.display_property_key,'read');
      });if(replay)return replay;
      if(String(type.version)!==version)throw new CommandError(409,'VERSION_CONFLICT');
      await scope.query('INSERT INTO object_workspace_config(tenant_id,object_type_id,plural_label,description,display_property_key,enabled,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE plural_label=?,description=?,display_property_key=?,enabled=?,position=?,updated_at=UTC_TIMESTAMP(6)',[tenant,type.id,body.plural_label,body.description,body.display_property_key,body.enabled,body.position,body.plural_label,body.description,body.display_property_key,body.enabled,body.position]);
      await scope.query('UPDATE object_type SET label=?,version=version+1,schema_version=schema_version+1,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[body.label,tenant,type.id]);
      const response={status:200,body:{data:{object_type_id:type.id,version:String(BigInt(version)+1n),workspace:workspaceSettings(body,body.label)},meta:{correlation_id:correlation}}};
      await this.commands.audit(scope,access.principalId,correlation,'object_type',type.id,'workspace.update',Object.keys(body));
      await this.commands.complete(scope,command,response);return response;
    });
  }
}
