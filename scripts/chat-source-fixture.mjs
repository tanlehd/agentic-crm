// Retained synthetic baseline42 fixture provisioner. Never accepted by runtime.
import {config,pool,rootSQL,privateRoot,userFor} from './lib/chat-native.mjs';
import {writeFile,readFile} from 'node:fs/promises';
import {databaseSource} from '../services/core-baseline/dist/kernel/database/data-source.js';
import {migrate} from '../services/core-baseline/dist/kernel/database/migration-runner.js';
import {migrations} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {createHash} from 'node:crypto';
const id=label=>{const h=createHash('sha256').update('chat-storage-retained-v1:'+label).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-7${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
const now='2026-10-18 00:00:00.123456',system='01900000-0000-7000-8000-000000000001';
const cfg=await config();
rootSQL(`ALTER USER '${userFor('fixture')}'@'%' ACCOUNT UNLOCK;`);
Object.assign(process.env,{MYSQL_HOST:cfg.host,MYSQL_PORT:String(cfg.port),MYSQL_DATABASE:cfg.source,MYSQL_MIGRATION_USER:userFor('fixture'),MYSQL_MIGRATION_PASSWORD:cfg.passwords[userFor('fixture')]});
const ds=databaseSource(true);
await ds.initialize();
try{console.log('Retained synthetic source migrations applied:',await migrate(ds,migrations));}finally{await ds.destroy();}
const p=pool(cfg,'fixture',cfg.source);
try{
 const [journal]=await p.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
 await writeFile(`${privateRoot}/source-journal.json`,JSON.stringify(journal),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});
 const c=await p.getConnection();
 const fixture={version:1,tenants:['alpha','beta'].map(label=>id(label)),labels:{},now};
 try{
  await c.beginTransaction();
  async function insert(table,row,pk){
   const [old]=await c.query('SELECT 1 FROM `'+table+'` WHERE '+pk.map(k=>'`'+k+'`=?').join(' AND '),pk.map(k=>row[k]));
   if(old.length)return;
   try{await c.execute('INSERT INTO `'+table+'` ('+Object.keys(row).map(k=>'`'+k+'`').join(',')+') VALUES ('+Object.keys(row).map(()=>'?').join(',')+')',Object.values(row));}
   catch(e){throw new Error('FIXTURE_'+table+'_'+e.code+'_'+(e.sqlMessage?.match(/(?:Unknown column|Field) '([a-z_]+)'/)?.[1]??''));}
  }
  for(const label of ['alpha','beta']){
   const tenant=id(label),team=id(label+':team'),contact=id(label+':contact'),identity=id(label+':identity'),connection=id(label+':connection'),conversation=id(label+':conversation'),archived=id(label+':archived'),session=id(label+':session'),need=id(label+':need'),note=id(label+':note');
   fixture.labels[label]={tenant,team,contact,identity,connection,conversation,archived,session,need,note,tag:id('shared-tag')};
   await insert('tenant',{id:tenant,tenant_id:tenant,name:'Synthetic Chat '+label,status:'active',kind:'business',created_at:now,updated_at:now},['id']);
   await insert('team',{id:team,tenant_id:tenant,name:'Synthetic Chat '+label,purpose:'chat',created_at:now,updated_at:now},['id']);
   for(const key of ['contact','conversation','activity','conversation_session','conversation_need'])await insert('object_type',{id:id(label+':type:'+key),tenant_id:tenant,key,label:'Synthetic '+key,kind:'standard',created_at:now,updated_at:now},['id']);
   for(const [record,type,archivedAt,values] of [[contact,'contact',null,'{}'],[conversation,'conversation',null,'{"precise":"9007199254740993","amount":"12345678901234.123456","unicode":"Tiếng Việt 🧪"}'],[archived,'conversation',now,'{}'],[note,'activity',null,'{}']])await insert('crm_record',{id:record,tenant_id:tenant,object_type_id:id(label+':type:'+type),team_id:team,version:'9007199254740993',owner_revision:'9007199254740995',custom_values:values,archived_at:archivedAt,created_at:now,updated_at:now},['id']);
   await insert('contact',{tenant_id:tenant,record_id:contact,display_name:'Synthetic Chat contact '+label},['tenant_id','record_id']);
   await insert('channel_connection',{id:connection,tenant_id:tenant,provider:'mock_messenger',external_account_id:connection,team_id:team},['id']);
   await insert('contact_identity',{id:identity,tenant_id:tenant,connection_id:connection,contact_id:contact,external_subject_id:identity},['id']);
   for(const [record,status,closed] of [[conversation,'open',null],[archived,'closed',now]])await insert('conversation',{tenant_id:tenant,record_id:record,contact_id:contact,contact_identity_id:identity,connection_id:connection,status,opened_at:now,closed_at:closed},['tenant_id','record_id']);
   await insert('activity',{tenant_id:tenant,record_id:note,kind:'note',subject:'Synthetic retained note',body:'Synthetic fixture only',status:'done',related_record_id:conversation},['tenant_id','record_id']);
   for(const [key,type,column,value] of [['precise','integer','integer_value','9007199254740993'],['amount','decimal','decimal_value','12345678901234.123456']]){
    const property=id(label+':property:'+key);
    await insert('property_definition',{id:property,tenant_id:tenant,object_type_id:id(label+':type:conversation'),key,label:key,type,required:0,indexed:1,sensitive:0,created_at:now,updated_at:now},['id']);
    await insert('property_index_value',{tenant_id:tenant,record_id:conversation,property_id:property,value_kind:type,[column]:value},['tenant_id','record_id','property_id']);
   }
   await insert('ownership_history',{id:id(label+':history'),tenant_id:tenant,record_id:conversation,from_team_id:team,to_team_id:team,owner_revision:'9007199254740995',reason:'Synthetic retained history',actor_kind:'system',actor_id:system,created_at:now},['id']);
   await insert('record_team_access',{tenant_id:tenant,record_id:conversation,team_id:team},['tenant_id','record_id','team_id']);
   await insert('conversation_acquisition_session',{tenant_id:tenant,id:session,conversation_id:conversation,sequence:'1',version:'3',status:'active',opening_reason:'first_inbound',opened_at:now,opening_occurred_at:now,source_classification:'organic',source_channel:'mock_messenger',source_connection_id:connection,policy_version:'v1'},['tenant_id','id']);
   await insert('session_process_version',{tenant_id:tenant,version:'1',definition:JSON.stringify({stages:[{key:'new',label:'New'}],milestones:[]}),created_at:now,actor_id:null},['tenant_id','version']);
   await insert('session_process_head',{tenant_id:tenant,version:'1',created_at:now,updated_at:now},['tenant_id']);
   await insert('session_progress',{tenant_id:tenant,session_id:session,process_version:'1',stage_key:'new',coverage:'full',created_at:now,updated_at:now},['tenant_id','session_id']);
   await insert('session_need',{tenant_id:tenant,id:need,session_id:session,label:'Synthetic need',created_at:now,actor_id:system},['tenant_id','id']);
   await insert('session_classification',{tenant_id:tenant,session_id:session,values_json:'{}',version:'7',created_at:now,updated_at:now},['tenant_id','session_id']);
   await insert('conversation_tag',{tenant_id:tenant,id:id('shared-tag'),name:label,normalized_name:label,color:'blue',created_at:now,updated_at:now},['tenant_id','id']);
   for(let n=0;n<1002;n++){
    const message=id(label+':message:'+n);
    await insert('message',{id:message,tenant_id:tenant,conversation_id:conversation,connection_id:connection,provider_message_id:message,direction:'inbound',text:'Synthetic migration fixture '+n,occurred_at:now,received_at:now,status:'received'},['id']);
    if(n===0){
     await insert('message_content',{tenant_id:tenant,message_id:message,content:'{"schema_version":1,"exact":9007199254740993,"fraction":1.23000000000000000001,"unicode":"é 🧪","nullable":null}'},['tenant_id','message_id']);
     await insert('message_acquisition_membership',{tenant_id:tenant,message_id:message,conversation_id:conversation,session_id:session,resolution:'assigned',created_at:now},['tenant_id','message_id']);
    }
   }
   for(const [key,route] of [['legacy',`POST /api/v1/threads/${conversation}/sessions/${session}/needs/${need}/assessment`],['sales',`need-outcome:${conversation}:${session}:${need}`],['note',`POST /api/v1/conversations/${conversation}/notes`],['assignment',`POST /api/v1/records/${contact}/assignment`]])await insert('idempotency_record',{id:id(label+':receipt:'+key),tenant_id:tenant,actor_kind:'system',actor_id:system,route_key:route,key:'synthetic-'+key,request_hash:createHash('sha256').update(key).digest('hex'),status:'completed',response_status:200,response_body:JSON.stringify({data:{id:key==='note'?note:conversation}}),created_at:now,updated_at:now,expires_at:'2020-01-01 00:00:00.000001'},['id']);
   await insert('audit_entry',{id:id(label+':audit'),tenant_id:tenant,actor_kind:'system',actor_id:system,action:'messages',resource_type:'conversation',resource_id:conversation,outcome:'accepted',changed_fields:'[]',reason:null,correlation_id:'synthetic-chat-storage',occurred_at:now,created_at:now},['id']);
   await insert('outbox_event',{id:id(label+':created'),tenant_id:tenant,event_type:'conversation.created',schema_version:'1',aggregate_type:'conversation',aggregate_id:conversation,aggregate_version:'9007199254740993',payload:JSON.stringify({contact_id:contact,connection_id:connection}),correlation_id:'synthetic-chat-storage',actor_kind:'system',actor_id:system,occurred_at:now,created_at:now,status:'dispatched'},['id']);
  }
  await c.commit();
  try{await writeFile(`${privateRoot}/fixture.json`,JSON.stringify(fixture,null,2),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
  console.log('PASS retained Alpha/Beta synthetic fixtures seeded without deleting existing rows');
 }catch(e){await c.rollback();console.error('FIXTURE_FAILED',e.code??e.message);process.exitCode=1;}finally{c.release();}
 if(process.argv.includes('--metadata')){
  for(const name of ['tenant','principal','object_type','contact','contact_identity','channel_connection','property_definition','activity']){
   const [rows]=await p.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[name]);
   const [checks]=await p.query('SELECT cc.CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS cc JOIN information_schema.TABLE_CONSTRAINTS tc ON tc.CONSTRAINT_SCHEMA=cc.CONSTRAINT_SCHEMA AND tc.CONSTRAINT_NAME=cc.CONSTRAINT_NAME WHERE tc.TABLE_SCHEMA=DATABASE() AND tc.TABLE_NAME=?',[name]);
   console.log(name,JSON.stringify(rows),JSON.stringify(checks));
  }
 }
}finally{await p.end();}
