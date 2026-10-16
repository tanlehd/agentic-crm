import {readFile,writeFile} from 'node:fs/promises';
const check=process.argv.includes('--check');
const exact=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const array=(items,maxItems)=>({type:'array',items,maxItems});
const nullable=s=>({anyOf:[{type:'null'},s]});
const id={type:'string',pattern:'^[a-z][a-z0-9_]{0,63}$'},uuid={type:'string',format:'uuid'},title={type:'string',minLength:1,maxLength:120,pattern:'\\S'};
const card=exact({id,title,kind:{enum:['properties','activities','association']},fields:{...array(id,50),uniqueItems:true},relation:nullable({anyOf:[uuid,{enum:['contact_leads','contact_deals']}]}),limit:{enum:[5,10,20]},filter:nullable(exact({field:id,value:{type:'string',maxLength:255}})),sort:nullable(exact({field:id,direction:{enum:['asc','desc']}}))});
const layout=exact({schema_version:{const:1},left:array(card,30),tabs:array(exact({id,title,cards:array(card,30)}),6),right:array(card,30)});
const input=exact({name:title,team_ids:{...array(uuid,20),uniqueItems:true},priority:{type:'integer',minimum:0,maximum:999},layout});
const view=exact({...input.properties,key:{anyOf:[{const:'default'},uuid]},version:{type:'string',pattern:'^(0|[1-9][0-9]*)$'},updated_at:nullable({type:'string',format:'date-time'}),editable:{type:'boolean'}});
const library=exact({views:array(view,101),teams:array(exact({id:uuid,name:{type:'string'}}),1000),supported:{type:'boolean'}});
const catalog=JSON.parse(await readFile('packages/contracts/schemas/object-platform-catalog.json','utf8'));
const resolved=exact({view,objects:catalog.properties.objects,relations:catalog.properties.relations});
const envelope=data=>exact({data,meta:exact({correlation_id:uuid})});
const param=(name,where,schema)=>({name,in:where,required:true,schema});
const base=[param('X-Tenant-Id','header',uuid),param('key','path',id)],surface=param('surface','path',{enum:['detail','preview']}),key=param('view','path',{anyOf:[uuid,{const:'default'}]});
const mutation=['If-Match','Idempotency-Key','X-CSRF-Token','Origin'].map(n=>param(n,'header',{type:'string'}));
const responses=data=>({200:{description:'Authorized response',content:{'application/json':{schema:envelope(data)}}},...Object.fromEntries([400,401,403,404,409,422,428,503].map(c=>[c,{description:'Sanitized CRM error'}]))});
const operation=(operationId,parameters,data,body)=>({operationId,security:[{sessionCookie:[]}],parameters,responses:responses(data),...(body?{requestBody:{required:true,content:{'application/json':{schema:body}}}}:{})});
const saved=exact({key:{type:'string'},version:{type:'string'},removed:{type:'boolean'}});
const records=JSON.parse(await readFile('packages/contracts/schemas/crm-records.json','utf8'));
const api={openapi:'3.1.0',info:{title:'Record detail and preview pages',version:'1.0.0'},paths:{
 '/api/v1/object-types/{key}/record-pages/{surface}':{get:operation('recordPageLibrary',[...base,surface],library)},
 '/api/v1/object-types/{key}/record-pages/{surface}/{view}':{put:operation('saveRecordPage',[...base,surface,key,...mutation],saved,input)},
 '/api/v1/object-types/{key}/record-pages/{surface}/{view}/remove':{post:operation('removeRecordPage',[...base,surface,key,...mutation],saved,exact({}))},
 '/api/v1/objects/{key}/record-page/{surface}':{get:operation('resolveRecordPage',[...base,surface],resolved)},
 '/api/v1/objects/{key}/records/{id}/page-activities':{get:operation('recordPageActivities',[...base,param('id','path',uuid)],{type:'array',maxItems:20,items:{$ref:'#/components/schemas/crm-record'}})}
},components:{schemas:{...records.definitions},securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'crm_session'}}}};
// Rebase the existing CRM schemas' local references for the standalone OpenAPI.
const rebase=s=>JSON.parse(JSON.stringify(s).replaceAll('#/definitions/','#/components/schemas/'));
for(const [path,data]of Object.entries({
 'packages/contracts/schemas/record-page-input.json':{$schema:'http://json-schema.org/draft-07/schema#',$id:'record-page-input.json',title:'RecordPageInput',...input},
 'packages/contracts/schemas/record-page-library.json':{$schema:'http://json-schema.org/draft-07/schema#',$id:'record-page-library.json',title:'RecordPageLibrary',...library},
 'packages/contracts/schemas/record-page-resolved.json':{$schema:'http://json-schema.org/draft-07/schema#',$id:'record-page-resolved.json',title:'ResolvedRecordPage',...resolved},
 'docs/contracts/record-pages.openapi.json':rebase(api)
})){
 const content=JSON.stringify(data,null,2)+'\n';if(check){if(await readFile(path,'utf8')!==content)throw new Error('Contract drift: '+path);}else await writeFile(path,content);
}
console.log('PASS record page schemas and OpenAPI'+(check?' match source':''));
