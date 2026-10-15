import {readFile,writeFile} from 'node:fs/promises';
const check=process.argv.includes('--check');
const base=JSON.parse(await readFile('packages/contracts/schemas/workflow-catalog.json','utf8'));
const workspace={type:'object',additionalProperties:false,required:['plural_label','description','display_property_key','enabled','position'],properties:{plural_label:{type:'string',minLength:1,maxLength:255},description:{type:'string',maxLength:1000},display_property_key:{anyOf:[{type:'null'},{type:'string',pattern:'^[a-z][a-z0-9_]{0,63}$'}]},enabled:{type:'boolean'},position:{type:'integer',minimum:0,maximum:999}}};
const schema=structuredClone(base);schema.$id='object-platform-catalog.json';schema.title='ObjectPlatformCatalog';
// Workflow catalog uses inline descriptors. Preserve every canonical wire field.
const descriptor=schema.properties.objects.items;
descriptor.required.push('workspace','extensions_supported');descriptor.properties.workspace=workspace;descriptor.properties.extensions_supported={type:'boolean'};
const input={$schema:'http://json-schema.org/draft-07/schema#',$id:'object-workspace-input.json',title:'ObjectWorkspaceInput',...structuredClone(workspace)};input.required.push('label');input.properties.label={type:'string',minLength:1,maxLength:255};
const envelope=data=>({type:'object',additionalProperties:false,required:['data','meta'],properties:{data,meta:{type:'object',additionalProperties:false,required:['correlation_id'],properties:{correlation_id:{type:'string',format:'uuid'}}}}});
const tenant={name:'X-Tenant-Id',in:'header',required:true,schema:{type:'string',format:'uuid'}},response=data=>({200:{description:'Authorized response',content:{'application/json':{schema:envelope(data)}}},...Object.fromEntries([400,401,403,404,409,422,428,503].map(code=>[code,{description:'Sanitized CRM error'}]))});
const {$schema:_,...catalogWire}=schema;delete catalogWire.$id;
const {$schema:__,...inputWire}=input;delete inputWire.$id;
const menu={type:'array',maxItems:100,items:{type:'object',additionalProperties:false,required:['id','key','label','kind','version','display_property_key','position'],properties:{id:{type:'string',format:'uuid'},key:{type:'string'},label:{type:'string'},kind:{const:'custom'},version:{type:'string',pattern:'^[1-9][0-9]*$'},display_property_key:workspace.properties.display_property_key,position:workspace.properties.position}}};
const api={openapi:'3.1.0',info:{title:'Object Platform R1',version:'1.0.0'},paths:{
 '/api/v1/crm/object-catalog':{get:{operationId:'objectPlatformCatalog',security:[{sessionCookie:[]}],parameters:[tenant],responses:response(catalogWire)}},
 '/api/v1/crm/workspace-objects':{get:{operationId:'workspaceObjects',security:[{sessionCookie:[]}],parameters:[tenant],responses:response(menu)}},
 '/api/v1/crm/association-catalog':{get:{operationId:'associationCatalog',security:[{sessionCookie:[]}],parameters:[tenant],responses:response(schema.properties.relations)}},
 '/api/v1/object-types/{key}/workspace':{put:{operationId:'saveObjectWorkspace',security:[{sessionCookie:[]}],parameters:[tenant,{name:'key',in:'path',required:true,schema:{type:'string',pattern:'^[a-z][a-z0-9_]{0,63}$'}},...['If-Match','Idempotency-Key','X-CSRF-Token','Origin'].map(name=>({name,in:'header',required:true,schema:{type:'string'}}))],requestBody:{required:true,content:{'application/json':{schema:inputWire}}},responses:response({type:'object',additionalProperties:false,required:['object_type_id','version','workspace'],properties:{object_type_id:{type:'string',format:'uuid'},version:{type:'string',pattern:'^[1-9][0-9]*$'},workspace}})}}
},components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'crm_session'}}}};
for(const [path,object]of Object.entries({'packages/contracts/schemas/object-platform-catalog.json':schema,'packages/contracts/schemas/object-workspace-input.json':input,'docs/contracts/object-platform-r1.openapi.json':api})){
 const content=JSON.stringify(object,null,2)+'\n';if(check){if(await readFile(path,'utf8')!==content)throw new Error('Object Platform contract drift: '+path);}else await writeFile(path,content);
}
console.log('PASS Object Platform generated contracts'+(check?' match source':''));
