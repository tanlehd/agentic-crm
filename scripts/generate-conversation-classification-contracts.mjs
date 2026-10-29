import {readFile,writeFile} from 'node:fs/promises';
const str={type:'string'},uuid={type:'string',format:'uuid'},nullableId={type:['string','null'],format:'uuid'},revision={type:'string',pattern:'^(0|[1-9][0-9]{0,19})$'},bool={type:'boolean'};
const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const scalar={anyOf:['string','number','boolean','null'].map(type=>({type}))};
const actor={anyOf:[{type:'null'},obj({kind:str,id:uuid})]};
const definition=obj({id:uuid,key:str,label:str,type:{enum:['string','text','integer','decimal','boolean','date','datetime','enum']},required:bool,default_value:scalar,options:{type:['array','null'],items:str},indexed:bool,sensitive:bool,version:revision,can_write:bool});
const envelope=data=>obj({data,meta:obj({correlation_id:str})});
export async function conversationClassificationContracts(spec){
 const definitions={
  'conversation-classification-input':obj({values:{type:'object',minProperties:1,maxProperties:100,additionalProperties:scalar}}),
  'conversation-classification-response':envelope(obj({session_id:uuid,conversation_id:uuid,status:{enum:['active','closed']},version:revision,can_edit:bool,definitions:{type:'array',maxItems:100,items:definition},values:{type:'object',additionalProperties:scalar}})),
  'conversation-classification-result':envelope(obj({session_id:uuid,version:revision})),
  'conversation-contributions-response':envelope(obj({session_id:uuid,coverage:{enum:['full','partial','none']},owner:{anyOf:[{type:'null'},obj({id:nullableId,team_id:nullableId,revision})]},history:{type:'array',maxItems:50,items:obj({id:uuid,revision,kind:{enum:['opened','closed','assignment','outbound_submitted','note','stage','evidence','classification','outcome']},source_id:uuid,source_revision:revision,actor,owner_id:nullableId,handling_team_id:nullableId,owner_revision:revision,recorded_at:{type:'string',format:'date-time'},payload:{type:'object'}})},next_before_revision:{type:['string','null'],pattern:'^[1-9][0-9]{0,19}$'}})),
  'conversation-assignment-teams-response':envelope({type:'array',maxItems:200,items:obj({id:uuid,name:str,purpose:str})}),
 };
 const schema={$schema:'http://json-schema.org/draft-07/schema#',$id:'conversation-classification.json',title:'ConversationClassification',definitions};
 const path='packages/contracts/schemas/conversation-classification.json',body=JSON.stringify(schema,null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==body)throw Error('Classification schema drift');}else await writeFile(path,body);
 Object.assign(spec.components.schemas,definitions);
 for(const [method,path,input,output,queries] of [
  ['get','conversations/{conversation}/sessions/{session}/classification',null,'conversation-classification-response',[]],
  ['post','conversations/{conversation}/sessions/{session}/classification','conversation-classification-input','conversation-classification-result',[]],
  ['get','conversations/{conversation}/sessions/{session}/contributions',null,'conversation-contributions-response',['before_revision']],
  ['get','records/{id}/assignment-teams',null,'conversation-assignment-teams-response',[]],
 ]){
  const parameters=[{name:'X-Tenant-Id',in:'header',required:true,schema:uuid},...Array.from(path.matchAll(/\{(\w+)\}/g),m=>({name:m[1],in:'path',required:true,schema:uuid})),...queries.map(name=>({name,in:'query',schema:{type:'string',pattern:'^[1-9][0-9]{0,19}$'}})),...(input?['Origin','X-CSRF-Token','Idempotency-Key','If-Match'].map(name=>({name,in:'header',required:true,schema:str})):[])];
  (spec.paths['/api/v1/'+path]??={})[method]={operationId:'conversation-classification-'+method+'-'+path.replaceAll(/[{}]/g,'').replaceAll('/','-'),security:[{sessionCookie:[]}],parameters,...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+input}}}}}:{}),responses:{200:{description:'Authorized episode result',content:{'application/json':{schema:{$ref:'#/components/schemas/'+output}}}},...Object.fromEntries([400,401,403,404,409,422,428,503].map(code=>[code,{description:'Sanitized failure'}]))}};
 }
 spec.paths['/api/v1/records/{id}/assignment-targets'].get.parameters.push({name:'team_id',in:'query',schema:uuid});
}
