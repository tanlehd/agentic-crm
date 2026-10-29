// Retained main recovery counts and hashes only; never publish application rows.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
import {loadMainFinalSnapshot} from './lib/chat-main-preflight.mjs';
import {canonical,chunkHash,primary,projection,q,sha} from './lib/chat-exact.mjs';
import {chatExclusiveTables} from '../services/core-baseline/dist/kernel/database/runtime-grants.js';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const mode=process.argv[2];if(!['before','after'].includes(mode))throw Error('EXPLICIT_PHASE_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8'));if(!s.note||!s.intent||!s.inboundMessage||!s.outboundMessage)throw Error('COMPLETE_SMOKE_REQUIRED');
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,connectionLimit:1,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
const out=await mainEvidenceDirectory(),snapshot=await loadMainFinalSnapshot();
try{
 const source=[];
 for(const table of snapshot.manifest.tables.filter(t=>chatExclusiveTables.has(t.name))){
  const [rows]=await pool.query(`SELECT ${projection(table)} FROM agentic_crm.${q(table.name)} ORDER BY ${primary(table).map(q).join(',')}`);
  const unchanged=rows.length===snapshot.rows[table.name].length&&chunkHash(table,rows)===chunkHash(table,snapshot.rows[table.name]);
  if(!unchanged)throw Error('SOURCE_CHAT_CHANGED:'+table.name);
  source.push({table:table.name,count:rows.length,hash:chunkHash(table,rows)});
 }
 const effects={};
 for(const [name,sql,params]of [
  ['messages','SELECT id,direction,status,outbound_intent_id FROM crm_chat.message WHERE conversation_id=? ORDER BY id',[s.conversation]],
  ['intent','SELECT id,status,provider_message_id FROM crm_chat.outbound_intent WHERE id=?',[s.intent]],
  ['job','SELECT intent_id,phase,status,failures FROM crm_chat.chat_outbound_job WHERE intent_id=?',[s.intent]],
  ['note','SELECT record_id FROM agentic_crm.activity WHERE related_record_id=? AND kind=\'note\' ORDER BY record_id',[s.conversation]],
  ['contributions','SELECT id,kind,source_id,revision FROM crm_chat.session_contribution WHERE conversation_id=? ORDER BY id',[s.conversation]],
  ['activity','SELECT id,source_kind,source_id,kind FROM crm_chat.conversation_activity WHERE conversation_id=? ORDER BY id',[s.conversation]],
 ]){
  const [rows]=await pool.query(sql,params);effects[name]={count:rows.length,digest:sha(canonical(rows))};
  if(name==='messages'&&(rows.length!==2||!rows.some(r=>r.id===s.inboundMessage)||!rows.some(r=>r.id===s.outboundMessage)))throw Error('MESSAGE_EFFECT_MISMATCH');
  if(name==='intent'&&(rows.length!==1||rows[0].status!=='sent'))throw Error('SEND_NOT_TERMINAL');
  if(name==='job'&&(rows.length!==1||rows[0].status!=='done'))throw Error('JOB_NOT_DONE');
  if(name==='note'&&(rows.length!==1||rows[0].record_id!==s.note))throw Error('NOTE_EFFECT_MISMATCH');
 }
 const [gates]=await pool.query('SELECT mode,epoch,COUNT(*) tenants FROM crm_chat.chat_writer_gate GROUP BY mode,epoch');
 if(gates.length!==1||gates[0].mode!=='active'||Number(gates[0].tenants)!==2)throw Error('GATE_STATE');
 const backlog={};
 for(const [name,sql]of Object.entries({publication:'SELECT consumer_name,state,COUNT(*) n FROM crm_chat.chat_event_delivery GROUP BY consumer_name,state ORDER BY consumer_name,state',inbox:'SELECT consumer_name,state,COUNT(*) n FROM crm_chat.chat_event_inbox GROUP BY consumer_name,state ORDER BY consumer_name,state',ingress:'SELECT state,COUNT(*) n FROM crm_chat.chat_ingress_inbox GROUP BY state',outbound:'SELECT status,COUNT(*) n FROM crm_chat.chat_outbound_job GROUP BY status'}))backlog[name]=(await pool.query(sql))[0];
 const report={status:'PASS',phase:mode,sourceTables:source,effects,gates,backlog};
 if(mode==='after'){
  const before=JSON.parse(await readFile(out+'/main-recovery-before.json','utf8'));
  if(canonical(before.effects)!==canonical(effects)||canonical(before.sourceTables)!==canonical(source))throw Error('RECOVERY_EFFECT_DRIFT');
  if(BigInt(gates[0].epoch)!==BigInt(before.gates[0].epoch)+1n)throw Error('RECOVERY_EPOCH');
  report.sameEffects=true;report.sameSource=true;
 }
 await writeFile(out+'/main-recovery-'+mode+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:'PASS',phase:mode,sourceTables:source.length,effectCounts:Object.fromEntries(Object.entries(effects).map(([k,v])=>[k,v.count])),gates,backlog}));
}finally{await pool.end();}
