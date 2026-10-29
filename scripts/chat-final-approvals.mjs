// Test-only reviewer registration for synthetic compatibility cases. This is
// not human approval and these keys are never eligible for main cutover.
import {readFile,writeFile} from 'node:fs/promises';
import {generateKeyPairSync,sign} from 'node:crypto';
import {config,privateRoot,profileName} from './lib/chat-native.mjs';
import {loadSnapshot} from './lib/chat-export.mjs';
import {canonical,sha,rowHash,primary} from './lib/chat-exact.mjs';
if(profileName!=='final')throw new Error('FINAL_PROFILE_REQUIRED');
const pointer=JSON.parse(await readFile(privateRoot+'/latest.json','utf8')),snapshot=await loadSnapshot(pointer.file,await config());
async function once(path,value){try{await writeFile(privateRoot+'/'+path,JSON.stringify(value),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}}
const pair=generateKeyPairSync('ed25519');
await once('synthetic-reviewer-key.json',{privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:pair.publicKey.export({type:'spki',format:'pem'})});
const key=JSON.parse(await readFile(privateRoot+'/synthetic-reviewer-key.json','utf8'));
await once('reviewers.json',{environment:'retained-test',synthetic:true,reviewers:[{id:'synthetic-core-reviewer',owners:['crm'],publicKey:key.publicKey}]});
const digest=sha(canonical(snapshot.manifest)),path='services/core-baseline/src/modules/crm/activity-port.ts',hash=sha((await readFile(path,'utf8')).replaceAll('\r\n','\n')),entries=[];
for(const table of ['idempotency_record','outbox_event','audit_entry'])for(const row of snapshot.rows[table].filter(r=>table==='idempotency_record'?r.route_key==='POST /synthetic/legacy/core-note':table==='outbox_event'?r.event_type==='synthetic.legacy.note':r.action==='synthetic.legacy.note')){
 const metadata=snapshot.manifest.tables.find(t=>t.name===table),activity=snapshot.rows.activity.find(a=>a.tenant_id===row.tenant_id&&a.kind==='note'),proof=snapshot.manifest.tables.find(t=>t.name==='activity');
 const entry={format:1,snapshotDigest:digest,table,tenant:row.tenant_id,key:primary(metadata).map(k=>row[k]),rowHash:rowHash(metadata,row),owner:'crm',decision:table==='audit_entry'?'archive':'retain-owner',...(table==='audit_entry'?{policy:'legacy-audit-no-purge-v1'}:{}),approver:'synthetic-core-reviewer',reason:'Synthetic retained fixture only: preserve existing Core note, never execute the unknown legacy command.',sourceSite:{path,sha256:hash},ownerEvidence:[{table:'activity',key:primary(proof).map(k=>activity[k]),rowHash:rowHash(proof,activity)}]};
 entries.push({...entry,signature:sign(null,Buffer.from(canonical(entry)),key.privateKey).toString('base64')});
}
if(entries.length!==6)throw new Error('SYNTHETIC_EXCEPTION_FIXTURE_REQUIRED');
await once('approvals.json',{format:1,environment:'retained-test',synthetic:true,snapshotDigest:digest,entries});
console.log('PASS 6 exact synthetic reviewer-signed retained-owner/archive decisions; not main approvals');
