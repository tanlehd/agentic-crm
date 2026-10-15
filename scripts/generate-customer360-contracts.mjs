import {readFile} from 'node:fs/promises';
export async function customer360Contracts(spec){
 const source=JSON.parse(await readFile('packages/contracts/schemas/customer360.json','utf8'));
 for(const [name,definition] of Object.entries(source.definitions))spec.components.schemas[name]=JSON.parse(JSON.stringify(definition).replaceAll('#/definitions/','#/components/schemas/'));
 for(const [method,path,input,output,cas] of [
  ['post','sales/records/{id}/session-context','sales-session-input','sales-session-response',true],
  ['get','sales/records/{id}/session-context',null,'sales-session-list',false],
  ['post','leads/{id}/merge-preview','lead-merge-preview-input','lead-merge-preview',false],
  ['post','leads/{id}/merge','lead-merge-input','lead-merge-response',true],
  ['get','leads/{id}/merges',null,'lead-merge-history',false],
 ]){
  const parameters=[{name:'X-Tenant-Id',in:'header',required:true,schema:{type:'string',format:'uuid'}},{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}];
  if(input)parameters.push(...['Origin','X-CSRF-Token',...(cas?['Idempotency-Key','If-Match']:[])].map(name=>({name,in:'header',required:true,schema:{type:'string'}})));
  if(output==='sales-session-list')parameters.push({name:'before_id',in:'query',schema:{type:'string',format:'uuid'}});
  (spec.paths['/api/v1/'+path]??={})[method]={operationId:'customer360-'+method+'-'+path.replaceAll(/[{}]/g,'').replaceAll('/','-'),security:[{sessionCookie:[]}],parameters,...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+input}}}}}:{}),responses:{200:{description:'Authorized result',content:{'application/json':{schema:{$ref:'#/components/schemas/'+output}}}},...Object.fromEntries([400,401,403,404,409,422,428,503].map(code=>[code,{description:'Sanitized failure'}]))}};
 }
}
