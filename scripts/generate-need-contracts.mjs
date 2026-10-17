import {readFile,writeFile} from 'node:fs/promises';
const str={type:'string'},uuid={type:'string',format:'uuid'},revision={type:'string',pattern:'^(0|[1-9][0-9]{0,19})$'},obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const scalar={type:['string','number','boolean','null']},values={type:'object',maxProperties:100,additionalProperties:scalar},strings={type:'array',maxItems:100,uniqueItems:true,items:str};
const envelope=data=>obj({data,meta:obj({correlation_id:str})});
export async function needContracts(spec){
 const proposal=obj({values,confidence:{type:'number',minimum:0,maximum:1},evidence_ids:{...strings,items:uuid},provider:str,model:str,config_version:str,input_fingerprint:str,assessed_at:{type:'string',format:'date-time'}},['values']);
 const definition=obj({id:str,key:str,label:str,type:{enum:['string','text','integer','decimal','boolean','date','datetime','enum']},required:{type:'boolean'},default_value:scalar,options:{type:['array','null'],items:str},indexed:{type:'boolean'},sensitive:{type:'boolean'},version:revision,can_write:{type:'boolean'}});
 const definitions={
  'need-assessment-input':obj({values,release_pins:strings},[]),
  'need-enrich-input':obj({}),
  'need-outcome-input':obj({record_id:uuid}),
  'need-assessment-result':envelope(obj({conversation_id:uuid,session_id:uuid,need_id:uuid,version:revision})),
  'need-assessment-response':envelope(obj({conversation_id:uuid,session_id:uuid,need_id:uuid,version:revision,outcomes:{type:'array',maxItems:100,items:obj({id:uuid,label:str,linked:{type:'boolean'},can_link:{type:'boolean'}})},can_edit:{type:'boolean'},definitions:{type:'array',maxItems:105,items:definition},values,pinned:strings,proposal,history:{type:'array',maxItems:50,items:obj({version:revision,values,recorded_at:{type:'string',format:'date-time'},proposal})}})),
  'need-assessed-event-data':obj({conversation_id:uuid,session_id:uuid,need_id:uuid,assessment_version:revision,contact_id:uuid,connection_id:uuid}),
 };
 const file='packages/contracts/schemas/need-assessment.json',body=JSON.stringify({$schema:'http://json-schema.org/draft-07/schema#',$id:'need-assessment.json',definitions},null,2)+'\n';
 if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==body)throw Error('Need schema drift');}else await writeFile(file,body);Object.assign(spec.components.schemas,definitions);
 for(const [method,suffix,input,output] of [['get','assessment',null,'need-assessment-response'],['post','assessment','need-assessment-input','need-assessment-result'],['post','enrich','need-enrich-input','need-assessment-result'],['post','outcome','need-outcome-input','need-assessment-result']]){
  const path='/api/v1/conversations/{conversation}/sessions/{session}/needs/{need}/'+suffix;
  (spec.paths[path]??={})[method]={operationId:'need-'+method+'-'+suffix,security:[{sessionCookie:[]}],parameters:[{name:'X-Tenant-Id',in:'header',required:true,schema:uuid},...['conversation','session','need'].map(name=>({name,in:'path',required:true,schema:uuid})),...(input?['Origin','X-CSRF-Token','Idempotency-Key','If-Match'].map(name=>({name,in:'header',required:true,schema:str})):[])],...(input?{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+input}}}}}:{}),responses:{200:{description:'Authorized need assessment',content:{'application/json':{schema:{$ref:'#/components/schemas/'+output}}}},...Object.fromEntries([400,401,403,404,409,422,428,502,503].map(status=>[status,{description:'Sanitized failure'}]))}};
 }
}
