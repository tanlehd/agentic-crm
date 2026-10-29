// Explicit, asymmetric reviewed compatibility input. Snapshot HMAC keys cannot
// manufacture reviewer signatures. The final fixture registers test-only keys.
import {readFile} from 'node:fs/promises';
import {verify} from 'node:crypto';
import {privateRoot} from './chat-native.mjs';
import {canonical,sha,rowHash,primary} from './chat-exact.mjs';
import {currentSourcePath} from './repository-paths.mjs';
const fail=code=>{throw new Error('NO_GO_'+code);};
const evidenceTables={crm:['crm_record','contact','company','activity','custom_record'],sales:['lead','deal','sales_need_outcome'],workflow:['workflow_run','workflow_definition','workflow_version'],identity:['principal','service_actor','account'],routing:['human_routing_work','human_routing_allocation'],connector:['inbound_delivery','channel_connection']};
export async function loadExceptions(snapshot){
 let input;try{input=JSON.parse(await readFile(privateRoot+'/approvals.json','utf8'));}catch(e){if(e.code==='ENOENT')return {resolve:()=>null,finish:()=>{},entries:[],digest:sha('[]')};throw e;}
 const trusted=JSON.parse(await readFile(privateRoot+'/reviewers.json','utf8')),source=JSON.parse(await readFile('docs/data/chat-extraction/source-v42.json','utf8')),snapshotDigest=sha(canonical(snapshot.manifest));
 if(input.format!==1||input.environment!=='retained-test'||input.snapshotDigest!==snapshotDigest||!Array.isArray(input.entries)||trusted.environment!=='retained-test')fail('EXCEPTION_MANIFEST');
 const map=new Map(),used=new Set();
 for(const signed of input.entries){
  const {signature,...entry}=signed,reviewer=trusted.reviewers.find(r=>r.id===entry.approver);
  if(!reviewer||!reviewer.owners.includes(entry.owner)||!verify(null,Buffer.from(canonical(entry)),reviewer.publicKey,Buffer.from(signature??'','base64')))fail('EXCEPTION_SIGNATURE');
  if(entry.format!==1||entry.snapshotDigest!==snapshotDigest||!snapshot.manifest.tenants.includes(entry.tenant)||!['idempotency_record','outbox_event','audit_entry'].includes(entry.table)||!evidenceTables[entry.owner]||typeof entry.reason!=='string'||entry.reason.length<10)fail('EXCEPTION_SCOPE');
  if(entry.table==='audit_entry'?(entry.decision!=='archive'||entry.policy!=='legacy-audit-no-purge-v1'):entry.decision!=='retain-owner')fail('EXCEPTION_DECISION');
  const table=snapshot.manifest.tables.find(t=>t.name===entry.table),keys=primary(table),matches=snapshot.rows[entry.table].filter(r=>r.tenant_id===entry.tenant&&canonical(keys.map(k=>r[k]))===canonical(entry.key));
  if(matches.length!==1||rowHash(table,matches[0])!==entry.rowHash)fail('EXCEPTION_ROW_BINDING');
  const site=entry.sourceSite;
  if(!site||!currentSourcePath(site.path).startsWith('services/core-baseline/src/modules/'+(entry.owner==='connector'?'channels':entry.owner)+'/'))fail('EXCEPTION_COMMAND_OWNER');
  const frozen=Array.isArray(source.sourceHashes)?source.sourceHashes.find(s=>currentSourcePath(s.path??s.file)===currentSourcePath(site.path))?.sha256:Object.entries(source.sourceHashes).find(([file])=>currentSourcePath(file)===currentSourcePath(site.path))?.[1];
  const expected=typeof frozen==='string'?frozen:frozen?.sha256;
  if(!expected||expected!==site.sha256||sha((await readFile(currentSourcePath(site.path),'utf8')).replaceAll('\r\n','\n'))!==site.sha256)fail('EXCEPTION_COMMAND_HASH');
  if(!Array.isArray(entry.ownerEvidence)||!entry.ownerEvidence.length)fail('EXCEPTION_OWNER_PROOF');
  for(const proof of entry.ownerEvidence){
   if(!evidenceTables[entry.owner].includes(proof.table))fail('EXCEPTION_OWNER_TABLE');
   const t=snapshot.manifest.tables.find(t=>t.name===proof.table),list=t&&snapshot.rows[proof.table].filter(r=>r.tenant_id===entry.tenant&&canonical(primary(t).map(k=>r[k]))===canonical(proof.key));
   if(list?.length!==1||rowHash(t,list[0])!==proof.rowHash)fail('EXCEPTION_OWNER_ROW');
  }
  const id=canonical([entry.table,entry.tenant,entry.key]);if(map.has(id))fail('EXCEPTION_DUPLICATE');map.set(id,entry);
 }
 return {entries:[...map.values()],digest:sha(canonical(input)),resolve(table,row){const t=snapshot.manifest.tables.find(t=>t.name===table),id=canonical([table,row.tenant_id,primary(t).map(k=>row[k])]),entry=map.get(id);if(entry){if(rowHash(t,row)!==entry.rowHash)fail('EXCEPTION_ROW_CHANGED');used.add(id);}return entry??null;},finish(){if(used.size!==map.size)fail('UNUSED_EXCEPTION');}};
}
// No baseline SQL fallback in normal Chat endpoints. An adapter must perform a
// current authorization check before every bounded page; no stored approval is ACL.
export async function readAuditArchive(snapshot,exceptions,{tenant,principal,after='',limit=50,authorize}){
 if(!snapshot.manifest.tenants.includes(tenant)||typeof principal!=='string'||!Number.isInteger(limit)||limit<1||limit>100||typeof authorize!=='function')fail('ARCHIVE_SCOPE');
 const authorization=await authorize({tenant,principal,permission:'audit.read',fields:['id','action','resource_type','outcome','occurred_at']});
 if(!authorization||authorization.tenant!==tenant||authorization.principal!==principal||authorization.permission!=='audit.read'||authorization.allowed!==true||!Number.isFinite(authorization.validUntil)||authorization.validUntil<=Date.now())fail('ARCHIVE_FORBIDDEN');
 const approved=new Set(exceptions.entries.filter(e=>e.table==='audit_entry'&&e.decision==='archive'&&e.tenant===tenant).map(e=>e.rowHash));
 const table=snapshot.manifest.tables.find(t=>t.name==='audit_entry');
 const rows=snapshot.rows.audit_entry.filter(r=>r.tenant_id===tenant&&r.id>after&&approved.has(rowHash(table,r))).sort((a,b)=>a.id<b.id?-1:1).slice(0,limit);
 // Deliberately omit reason, correlation, actor/resource IDs and changed fields.
 return {data:rows.map(({id,action,resource_type,outcome,occurred_at})=>({id,action,resource_type,outcome,occurred_at})),next:rows.length===limit?rows.at(-1).id:null};
}
