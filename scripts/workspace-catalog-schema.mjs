// Deterministic authoring source for the strict catalog wire schemas.
import { writeFile } from 'node:fs/promises';
const str=(max)=>({type:'string',minLength:1,maxLength:max}),uuid={type:'string',format:'uuid'},revision={type:'string',pattern:'^[1-9][0-9]{0,19}$'},count={type:'string',pattern:'^(0|[1-9][0-9]{0,19})$'};
const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const array=(items,maxItems)=>({type:'array',items,...(maxItems?{maxItems}:{})});
const ref=name=>({$ref:'#/definitions/'+name});
const colors={enum:['gray','blue','green','amber','red','purple']},sort={enum:['latest_message_desc','latest_message_asc','waiting_longest']};
const predicate=obj({scope:{enum:['all','mine','unassigned','team']},team_id:uuid,status:{...array({enum:['open','pending','closed']},3),minItems:1,uniqueItems:true},snooze:{enum:['exclude','include','only']},unread:{enum:['any','only']},channel:{enum:['messenger','mock_messenger']},channel_id:uuid,tag_ids:{...array(uuid,10),uniqueItems:true}},['scope','status','snooze','unread']);
const shares=array(obj({kind:{enum:['principal','team']},id:uuid}),50),actions=array(str(32));
const meta=obj({correlation_id:{type:'string'},as_of:{type:'string',format:'date-time'},allowed_actions:actions},['correlation_id']);
const defs={
 'catalog-predicate':predicate,
 'catalog-predicate-input':{...predicate,required:[]},
 'catalog-tag-create':obj({name:str(40),color:colors}),
 'catalog-tag-patch':{...obj({name:str(40),color:colors},[]),minProperties:1},
 'catalog-tag':obj({id:uuid,name:str(40),color:colors,version:revision,archived:{type:'boolean'},allowed_actions:actions}),
 'catalog-snippet-create':obj({title:str(80),shortcut:{type:'string',pattern:'^[a-z0-9_-]{1,32}$'},text:str(4000)}),
 'catalog-snippet-patch':{...obj({title:str(80),shortcut:{type:'string',pattern:'^[a-z0-9_-]{1,32}$'},text:str(4000)},[]),minProperties:1},
 'catalog-snippet':obj({id:uuid,title:str(80),shortcut:str(32),text:str(4000),version:revision,archived:{type:'boolean'},allowed_actions:actions}),
 'catalog-inbox-create':obj({name:str(80),predicate_schema_version:{const:1},predicate:ref('catalog-predicate-input'),sort,shares}),
 'catalog-inbox-patch':{...obj({name:str(80),predicate_schema_version:{const:1},predicate:ref('catalog-predicate-input'),sort,creator_principal_id:uuid},[]),minProperties:1},
 'catalog-inbox-shares':obj({shares}),
 'catalog-inbox':obj({id:uuid,name:str(80),creator_principal_id:uuid,predicate_schema_version:{const:1},predicate:ref('catalog-predicate'),sort,version:revision,archived:{type:'boolean'},shared:{type:'boolean'},shares,allowed_actions:actions},['id','name','creator_principal_id','predicate_schema_version','predicate','sort','version','archived','shared','allowed_actions']),
 'catalog-archive':obj({data:obj({id:uuid,archived:{const:true}}),meta}),
 'catalog-tag-links':obj({data:obj({conversation_id:uuid,tag_ids:array(uuid,20),tag_set_revision:count,version:revision}),meta}),
 'catalog-empty':obj({}),
};
for(const kind of ['tag','snippet','inbox']){
 defs[`catalog-${kind}-response`]=obj({data:ref(`catalog-${kind}`),meta});
 defs[`catalog-${kind}-list`]=obj({data:array(ref(`catalog-${kind}`)),next_cursor:{type:['string','null']},meta});
}
for(const [kind,operations] of [['inbox',['created','updated','shared','archived','transferred']],['snippet',['created','updated','archived']],['tag',['created','updated','archived']]])defs[`catalog-${kind}-event`]=obj({[kind+'_id']:uuid,operation:{enum:operations}});
defs['catalog-tag-link-event']=obj({conversation_id:uuid,tag_id:uuid,operation:{enum:['attached','detached']},tag_set_revision:revision});
await writeFile('packages/contracts/schemas/chat-catalogs.json',JSON.stringify({$schema:'http://json-schema.org/draft-07/schema#',$id:'https://agentic-crm.local/schemas/chat-catalogs.json',title:'ChatWorkspaceCatalogs',definitions:defs},null,2)+'\n');
