import {readFile} from 'node:fs/promises';
import {createHmac,createDecipheriv,timingSafeEqual} from 'node:crypto';
import {canonical,sha,chunkHash,tableHash,primary} from './chat-exact.mjs';
export const loadMainPreflight=()=>loadMainSnapshot(false);
export const loadMainFinalSnapshot=()=>loadMainSnapshot(true);
async function loadMainSnapshot(final){
 const root='.local/chat-cutover',key=await readFile(root+'/main-snapshot.key');
 const {folder}=JSON.parse(await readFile(root+(final?'/main-final-latest.json':'/main-preflight-latest.json'),'utf8'));
 if(!(final?/^\.local\/chat-cutover\/main-final\/[a-f0-9-]{36}$/:/^\.local\/chat-cutover\/main-preflight\/[a-f0-9-]{36}$/).test(folder))throw Error('PREFLIGHT_PATH_INVALID');
 const {signature,...body}=JSON.parse(await readFile(folder+'/complete.json','utf8'));
 const expected=createHmac('sha256',key).update(canonical(body)).digest('hex');
 if(typeof signature!=='string'||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error('PREFLIGHT_SIGNATURE_INVALID');
 const m=body.manifest;
 if(m.environment!==(final?'local-main-cutover':'local-main-preflight')||m.purpose!==(final?'fenced-main-cutover':'diagnostic-only-not-importable')||m.writersFenced!==final||m.source.db!=='agentic_crm'||m.sourceJournal.length!==43)throw Error('PREFLIGHT_SCOPE_INVALID');
 const {migrations,checksum}=await import('../../services/core-baseline/dist/kernel/database/migrations.js');
 if(m.sourceJournal.some((r,i)=>Number(r.version)!==i+1||r.name!==migrations[i].name||r.checksum!==checksum(migrations[i])||r.state!=='applied'))throw Error('PREFLIGHT_JOURNAL_INVALID');
 const bytes=await readFile(folder+'/snapshot.enc');if(sha(bytes)!==body.cipherHash)throw Error('PREFLIGHT_CIPHER_MISMATCH');
 const cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));cipher.setAAD(Buffer.from(canonical(m)));cipher.setAuthTag(bytes.subarray(-16));
 const snapshot=JSON.parse(Buffer.concat([cipher.update(bytes.subarray(12,-16)),cipher.final()]).toString('utf8'));
 if(canonical(snapshot.manifest)!==canonical(m))throw Error('PREFLIGHT_MANIFEST_MISMATCH');
 for(const t of m.tables){
  const rows=snapshot.rows[t.name];
  if(rows.length!==t.rowCount||new Set(rows.map(r=>canonical(primary(t).map(k=>r[k])))).size!==rows.length)throw Error('PREFLIGHT_ROWS_INVALID');
  for(const ch of t.chunks)if(chunkHash(t,rows.slice(ch.number*1000,ch.number*1000+ch.count))!==ch.hash)throw Error('PREFLIGHT_CHUNK_INVALID');
  if(tableHash(t.chunks)!==t.tableHash)throw Error('PREFLIGHT_TABLE_INVALID');
 }
 return snapshot;
}

export function mainFacts(snapshot){
 const {rows,manifest}=snapshot,tenants=new Set(manifest.tenants),index=new Map();
 const find=(table,tenant,id,col='id')=>{
  const key=table+':'+col;
  if(!index.has(key))index.set(key,new Map((rows[table]??[]).map(r=>[r.tenant_id+':'+r[col],r])));
  return index.get(key).get(tenant+':'+id);
 };
 return {find,removedPage:(tenant,id)=>rows.audit_entry.some(r=>r.tenant_id===tenant&&r.resource_type==='record_page_view'&&r.resource_id===id&&r.action==='record_page.remove'&&r.outcome==='accepted'),businessTenant:t=>tenants.has(t),entity:(tenant,kind,id)=>{
  const record=find('crm_record',tenant,id),type=record&&find('object_type',tenant,record.object_type_id);
  if(['record','conversation','sales-record'].includes(kind)){
   if(!record||!type)return;
   const subtype=type.kind==='custom'?'custom_record':type.key;
   if(!find(subtype,tenant,id,'record_id')||kind==='conversation'&&type.key!=='conversation'||kind==='sales-record'&&!['lead','deal'].includes(type.key))return;
   return {owner:type.key==='conversation'?'chat':['lead','deal'].includes(type.key)?'sales':'crm',object_key:type.key,...(type.key==='conversation'?{conversation_id:id}:{})};
  }
  if(kind==='session'){const r=find('conversation_acquisition_session',tenant,id);return r?{owner:'chat',conversation_id:r.conversation_id}:undefined;}
  if(kind==='need'){const n=find('session_need',tenant,id),s=n&&find('conversation_acquisition_session',tenant,n.session_id);return s?{owner:'chat',conversation_id:s.conversation_id,session_id:n.session_id}:undefined;}
  const tables={tag:['conversation_tag','chat'],inbox:['chat_inbox','chat'],snippet:['chat_snippet','chat'],'read-state':['conversation_read_state','chat'],delivery:['inbound_delivery','connector'],connection:['channel_connection','connector']};
  const t=tables[kind];return t&&find(t[0],tenant,id)?{owner:t[1]}:undefined;
 },event:(tenant,id)=>{const r=find('outbox_event',tenant,id);return r?{...r,payload:JSON.parse(r.payload)}:undefined;}};
}
