import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {CrmRecords} from '../../services/core-baseline/dist/modules/crm/records.js';
import {CrmController} from '../../services/core-baseline/dist/modules/crm/http.js';
import {CrmMetadataWriter} from '../../services/core-baseline/dist/modules/crm/metadata-writer.js';
import {DurableCommands} from '../../services/core-baseline/dist/kernel/reliability/commands.js';
import {databaseSource} from '../../services/core-baseline/dist/kernel/database/data-source.js';
import {rootSQL} from './chat-native.mjs';

export async function chatMetadataWriterNative(ctx){
 const {check,operator,tenant,f,object,metadata,peers,call,request,read,setRole,field,chatServer,servers}=ctx;
 const path='.local/chat-ownership/metadata-writer-fixture.json';let fixture;try{fixture=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;fixture={database:'native_identity_test',tenant,password:randomBytes(32).toString('hex')};await writeFile(path,JSON.stringify(fixture),{flag:'wx',mode:0o600});}
 assert.equal(fixture.database,'native_identity_test');assert.equal(fixture.tenant,tenant);assert.match(fixture.password,/^[a-f0-9]{64}$/);
 if(process.argv.includes('--provision'))rootSQL(`CREATE USER IF NOT EXISTS 't06_crm_metadata_writer_test'@'%' IDENTIFIED BY '${fixture.password}';\nGRANT UPDATE (id) ON native_identity_test.tenant TO 't06_crm_metadata_writer_test'@'%';\n`+Object.entries({...Object.fromEntries(['tenant','membership','principal','principal_role','role','team','team_member','field_policy','crm_record'].map(t=>[t,'SELECT'])),object_type:'SELECT,UPDATE',object_workspace_config:'SELECT,INSERT,UPDATE',property_definition:'SELECT,INSERT,UPDATE',crm_reference_gate:'SELECT,UPDATE',crm_reference_reservation:'SELECT',idempotency_record:'SELECT,INSERT,UPDATE,DELETE',audit_entry:'INSERT'}).map(([table,grants])=>`GRANT ${grants} ON native_identity_test.\`${table}\` TO 't06_crm_metadata_writer_test'@'%';`).join('\n'));
 const source=databaseSource(false,{user:'t06_crm_metadata_writer_test',password:fixture.password});await source.initialize();
 const writer=new CrmMetadataWriter(metadata),commands=new DurableCommands(),records=new CrmRecords(source,'synthetic-metadata-writer',undefined,commands,[],writer);
 const controller=new CrmController({service:ctx.auth},{ready:async()=>{},records});
 const publicServer=createServer(async(req,res)=>{
  const workspace=req.method==='PUT'&&req.url==='/api/v1/object-types/conversation_session/workspace';
  const match=/^\/api\/v1\/object-types\/conversation_session\/properties(?:\/([a-z0-9_]+))?$/.exec(req.url??'');
  if(!workspace&&(!match||!['POST','PATCH'].includes(req.method))){res.writeHead(404);res.end();return;}
  let body='';for await(const chunk of req)body+=chunk;req.body=JSON.parse(body);req.params={key:'conversation_session',...(match?.[1]?{id:match[1]}:{})};req.query={};
  await controller[workspace?'workspaceSave':req.method==='POST'?'createProperty':'patchProperty'](req,res);
 });servers.push(publicServer);publicServer.listen(0,'127.0.0.1');await once(publicServer,'listening');
 const property='t06_metadata_writer',body={key:property,label:'Synthetic writer',type:'string',required:false,indexed:false,sensitive:false,default_value:null},url='http://127.0.0.1:'+publicServer.address().port+'/api/v1/object-types/conversation_session/properties';
 const publicCall=async(input,version,key=randomUUID(),headersPatch={})=>{
  const response=await fetch(url+(input.key?'':'/'+property),{method:input.key?'POST':'PATCH',headers:{cookie:'crm_session='+ctx.actorSession,'x-tenant-id':tenant,origin:'http://localhost:18080','content-type':'application/json','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'idempotency-key':key,'if-match':'"'+version+'"',...headersPatch},body:JSON.stringify(input)});
  return {status:response.status,etag:response.headers.get('etag'),body:await response.json()};
 };
 const current=async()=>{const [[row]]=await operator.execute('SELECT version FROM property_definition WHERE tenant_id=? AND object_type_id=? AND `key`=?',[tenant,object,property]);return row?String(row.version):null;};
 const gate=async()=>{const [[row]]=await operator.execute("SELECT state,resource_revision,barrier_command_id FROM crm_reference_gate WHERE tenant_id=? AND resource_kind='metadata' AND resource_id=?",[tenant,object]);return row;};
 const schema=async()=>{const [[row]]=await operator.execute('SELECT schema_version,version FROM object_type WHERE tenant_id=? AND id=?',[tenant,object]);return row;};
 const [[seat]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);
 const grants=[...ctx.grants,{resource:'schema',action:'read',scope:'all'},{resource:'schema',action:'update',scope:'all'}];await setRole(grants);await operator.execute("UPDATE membership SET seat_code='admin' WHERE tenant_id=? AND id=?",[tenant,f.member]);
 try{
  await check('Chat classification metadata writer public create or retained rename increments schema atomically',async()=>{
   const old=await schema(),version=await current(),response=await publicCall(version?{label:'Synthetic writer '+randomUUID()}:body,version??String(old.version));assert.equal(response.status,version?200:201,response.body.error?.code);
   const next=await schema();assert.equal(BigInt(next.schema_version),BigInt(old.schema_version)+1n);assert.equal((await gate()).state,'open');assert.equal(String((await gate()).resource_revision),String(next.schema_version));assert.equal((await read()).definitions.find(d=>d.key===property).label,response.body.data.label);
   await assert.rejects(source.query('SELECT * FROM test_crm_chat_owner.conversation LIMIT 1'));await assert.rejects(source.query('SELECT * FROM auth_session LIMIT 1'));
  });
  await check('Chat classification metadata writer current schema field and CSRF denial never closes gate',async()=>{
   const before=await gate(),version=await current();assert.equal((await publicCall({label:'Synthetic denied'},version,randomUUID(),{'x-csrf-token':'bad'})).status,403);
   await setRole(ctx.grants);try{assert.equal((await publicCall({label:'Synthetic denied'},version)).status,403);}finally{await setRole(grants);}
   await field(object,property,['write'],async()=>assert.equal((await publicCall({label:'Synthetic denied'},version)).status,403));assert.deepEqual(await gate(),before);
  });
  await check('Chat classification metadata writer immutable replay conflict CAS and concurrent same key',async()=>{
   const version=await current(),key=randomUUID(),input={label:'Synthetic concurrent '+randomUUID()},results=await Promise.all([publicCall(input,version,key),publicCall(input,version,key)]);assert(results.every(r=>r.status===200),results.map(r=>r.body.error?.code).join(','));assert.deepEqual(results[0],results[1]);assert.equal(await current(),String(BigInt(version)+1n));
   assert.deepEqual(await publicCall(input,version,key),results[0]);assert.equal((await publicCall({label:'Changed'},version,key)).status,409);assert.equal((await publicCall({label:'Stale'},version)).status,409);assert.equal((await gate()).state,'open');
  });
  await check('Chat classification metadata writer drains actual held Chat read before rename',async()=>{
   const contact=peers.contact;let changed=false;
   peers.contact=async(...args)=>{const result=await contact(...args);const response=await publicCall({label:'Synthetic drain '+randomUUID()},await current());assert.equal(response.status,200,response.body.error?.code);changed=true;return result;};
   try{await assert.rejects(call(request()),e=>e.code==='FORBIDDEN');assert(changed);}finally{peers.contact=contact;}
   const [[held]]=await operator.execute("SELECT COUNT(*) n FROM crm_reference_reservation WHERE tenant_id=? AND resource_id=? AND state='held'",[tenant,object]);assert.equal(Number(held.n),0);assert.equal((await gate()).state,'open');
  });
  await check('Chat classification metadata writer releases committed read proof without undoing it',async()=>{
   const release=peers.release;peers.release=async()=>{const e=new Error('Synthetic lost release');e.code='DEPENDENCY_UNAVAILABLE';throw e;};
   try{await assert.rejects(call(request()),e=>e.code==='DEPENDENCY_UNAVAILABLE');}finally{peers.release=release;}
   const [held]=await operator.execute("SELECT command_id,binding_digest FROM crm_reference_reservation WHERE tenant_id=? AND resource_id=? AND state='held'",[tenant,object]);assert(held.length);
   for(const ref of held)assert.equal((await ctx.commands.proof(tenant,ref)).state,'committed');
   assert.equal((await publicCall({label:'Synthetic committed drain'},await current())).status,200);for(const ref of held)assert.equal((await ctx.commands.proof(tenant,ref)).state,'committed');
  });
  await check('Chat classification metadata writer proof outage retains closing gate and original key recovers',async()=>{
   const release=peers.release;peers.release=async()=>{const e=new Error('Synthetic held proof');e.code='DEPENDENCY_UNAVAILABLE';throw e;};try{await assert.rejects(call(request()));}finally{peers.release=release;}
   const version=await current(),key=randomUUID(),input={label:'Synthetic recovered '+randomUUID()},port=chatServer.address().port;chatServer.closeAllConnections();await new Promise(resolve=>chatServer.close(resolve));
   try{assert.equal((await publicCall(input,version,key)).status,503);assert.equal((await gate()).state,'closing');assert.equal(await current(),version);}finally{chatServer.listen(port,'127.0.0.1');await once(chatServer,'listening');}
   assert.equal((await publicCall(input,version,key)).status,200);assert.equal((await gate()).state,'open');
  });
  await check('Chat classification metadata writer transaction failure rolls back schema receipt and gate then retries',async()=>{
   const version=await current(),before=await schema(),key=randomUUID(),input={label:'Synthetic rollback '+randomUUID()},audit=commands.audit;commands.audit=async()=>{throw new Error('SYNTHETIC_AUDIT_ROLLBACK');};
   try{assert.equal((await publicCall(input,version,key)).status,503);}finally{commands.audit=audit;}
   assert.equal(await current(),version);assert.equal(String((await schema()).schema_version),String(before.schema_version));assert.equal((await gate()).state,'open');assert.equal((await publicCall(input,version,key)).status,200);
  });
  await check('Chat classification metadata writer workspace schema change drains holds and preserves protected standards',async()=>{
   const [[type]]=await operator.execute('SELECT label,version FROM object_type WHERE tenant_id=? AND id=?',[tenant,object]),version=String(type.version),key=randomUUID(),input={label:type.label,plural_label:'Synthetic sessions',description:'Synthetic presentation',display_property_key:null,enabled:false,position:101};
   const save=async(body=input)=>{const response=await fetch(url.replace('/properties','/workspace'),{method:'PUT',headers:{cookie:'crm_session='+ctx.actorSession,'x-tenant-id':tenant,origin:'http://localhost:18080','content-type':'application/json','x-csrf-token':await ctx.auth.csrf(ctx.actorSession),'idempotency-key':key,'if-match':'"'+version+'"'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
   const before=await schema(),contact=peers.contact;let saved;
   peers.contact=async(...args)=>{const result=await contact(...args);saved=await save();assert.equal(saved.status,200,saved.body.error?.code);return result;};
   try{await assert.rejects(call(request()),e=>e.code==='FORBIDDEN');}finally{peers.contact=contact;}
   assert.deepEqual(await save(),saved);assert.equal(BigInt((await schema()).schema_version),BigInt(before.schema_version)+1n);assert.equal((await gate()).state,'open');assert.equal((await save({...input,enabled:true})).status,422);
  });
 }finally{await setRole(ctx.grants);await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);await source.destroy();}
}
