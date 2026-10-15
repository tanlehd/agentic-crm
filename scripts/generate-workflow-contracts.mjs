import {readFile,writeFile} from 'node:fs/promises';
import {compile} from 'json-schema-to-typescript';
const check=process.argv.includes('--check');
for(const name of ['workflow-catalog','workflow-authoring']) {
  const schema=JSON.parse(await readFile(`packages/contracts/schemas/${name}.json`,'utf8'));
  const outputs={
    [`packages/contracts/src/generated/${name}.ts`]:await compile(schema,schema.title,{bannerComment:'/* Generated. Do not edit. */'}),
    [`packages/contracts/src/generated/${name}-schema.ts`]:'/* Generated. Do not edit. */\nexport const '+(name==='workflow-catalog'?'workflowCatalogSchema':'workflowAuthoringSchema')+' = '+JSON.stringify(schema,null,2)+';\n',
  };
  if(name==='workflow-catalog') {
    const {$schema,$id,...wire}=schema;
    outputs['docs/contracts/workflow-catalog.openapi.json']=JSON.stringify({openapi:'3.1.0',info:{title:'Workflow CRM metadata discovery',version:'1.0.0'},paths:{'/api/v1/automation/catalog':{get:{operationId:'workflowCatalog',security:[{sessionCookie:[]}],parameters:[{name:'X-Tenant-Id',in:'header',required:true,schema:{type:'string',format:'uuid'}}],responses:{200:{description:'Current authorized metadata; never execution authorization',content:{'application/json':{schema:{type:'object',required:['data','meta'],additionalProperties:false,properties:{data:wire,meta:{type:'object',required:['correlation_id'],additionalProperties:false,properties:{correlation_id:{type:'string',format:'uuid'}}}}}}}},...Object.fromEntries([400,401,403,422,503].map(code=>[code,{description:'Sanitized error'}]))}}}},components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'crm_session'}}}},null,2)+'\n';
  }
  for(const [path,body] of Object.entries(outputs)) {
    if(check){if(await readFile(path,'utf8').catch(()=>'')!==body)throw new Error('Workflow contract drift: '+path);}
    else await writeFile(path,body);
  }
}
console.log(check?'Workflow contracts match schemas.':'Generated Workflow catalog/authoring contracts.');
