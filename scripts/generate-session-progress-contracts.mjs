import {readFile} from 'node:fs/promises';
export async function sessionProgressContracts(spec){
 const schema=JSON.parse(await readFile('packages/contracts/schemas/session-progress.json','utf8'));
 for(const [name,value] of Object.entries(schema.definitions))spec.components.schemas[name]=JSON.parse(JSON.stringify(value).replaceAll('#/definitions/','#/components/schemas/'));
 for(const [method,path,input,output,query] of [
  ['get','session-process',null,'session-process-response',['version']],['post','session-process','session-process-input','session-process-response',[]],
  ['get','conversations/{conversation}/sessions/{session}/progress',null,'session-progress-response',['before_revision']],['post','conversations/{conversation}/sessions/{session}/progress','session-progress-input','session-progress-result',[]],
  ['get','session-funnel',null,'session-funnel-response',['from','to','as_of','process_version']],
 ]){
  const parameters=[{name:'X-Tenant-Id',in:'header',required:true,schema:{type:'string',format:'uuid'}},...Array.from(path.matchAll(/\{(\w+)\}/g),m=>({name:m[1],in:'path',required:true,schema:{type:'string',format:'uuid'}})),...query.map(name=>({name,in:'query',required:path==='session-funnel'&&name!=='as_of',schema:{type:'string'}}))];
  if(input)parameters.push(...['Origin','X-CSRF-Token','Idempotency-Key','If-Match'].map(name=>({name,in:'header',required:true,schema:{type:'string'}})));
  (spec.paths['/api/v1/'+path]??={})[method]={operationId:'session-progress-'+method+'-'+path.replaceAll(/[{}]/g,'').replaceAll('/','-'),security:[{sessionCookie:[]}],parameters,...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+input}}}}}:{}),responses:{200:{description:'Native authorized session result',content:{'application/json':{schema:{$ref:'#/components/schemas/'+output}}}},...Object.fromEntries([400,401,403,404,409,422,428,503].map(code=>[code,{description:'Sanitized failure'}]))}};
 }
}
