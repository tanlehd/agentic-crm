import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {loadExceptions} from '../lib/chat-exceptions.mjs';
import {privateRoot} from '../lib/chat-native.mjs';
import {canonical,sha,rowHash} from '../lib/chat-exact.mjs';

test('signed legacy and relocated evidence resolve the same source without changing frozen hashes or bypassing signatures',async()=>{
 const previous=process.cwd(),directory=await mkdtemp(join(tmpdir(),'crm-relocation-'));
 const oldPath='apps/backend/src/modules/crm/activity-port.ts',newPath='services/core-baseline/src/modules/crm/activity-port.ts';
 const source='export const fixture = true;\n',digest=sha(source);
 const table=name=>({name,columns:[{name:'id',type:'char(36)'},{name:'tenant_id',type:'char(36)'}],keys:[{name:'PRIMARY',columns:[{name:'id'}]}]});
 const command=table('idempotency_record'),activity=table('activity');
 const row={id:'synthetic-command',tenant_id:'synthetic-tenant'},proof={id:'synthetic-note',tenant_id:row.tenant_id};
 const snapshot={manifest:{tenants:[row.tenant_id],tables:[command,activity]},rows:{idempotency_record:[row],activity:[proof]}};
 const snapshotDigest=sha(canonical(snapshot.manifest)),pair=generateKeyPairSync('ed25519');
 const entry={format:1,snapshotDigest,table:command.name,tenant:row.tenant_id,key:[row.id],rowHash:rowHash(command,row),owner:'crm',decision:'retain-owner',approver:'synthetic-reviewer',reason:'Synthetic compatibility test only.',sourceSite:{path:oldPath,sha256:digest},ownerEvidence:[{table:activity.name,key:[proof.id],rowHash:rowHash(activity,proof)}]};
 const save=async(path,data)=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,typeof data==='string'?data:JSON.stringify(data));};
 const writeApproval=async(value,signature=sign(null,Buffer.from(canonical(value)),pair.privateKey).toString('base64'))=>save(privateRoot+'/approvals.json',{format:1,environment:'retained-test',snapshotDigest,entries:[{...value,signature}]});
 try {
  process.chdir(directory);
  await save(newPath,source);
  await save('docs/data/chat-extraction/source-v42.json',{sourceHashes:{[oldPath]:digest}});
  await save(privateRoot+'/reviewers.json',{environment:'retained-test',reviewers:[{id:entry.approver,owners:['crm'],publicKey:pair.publicKey.export({type:'spki',format:'pem'})}]});
  for(const path of [oldPath,newPath]) {
   await writeApproval({...entry,sourceSite:{path,sha256:digest}});
   const loaded=await loadExceptions(snapshot);
   assert.equal(loaded.resolve(command.name,row).sourceSite.path,path);
   loaded.finish();
  }
  const legacySignature=sign(null,Buffer.from(canonical(entry)),pair.privateKey).toString('base64');
  await writeApproval({...entry,sourceSite:{path:newPath,sha256:digest}},legacySignature);
  await assert.rejects(loadExceptions(snapshot),/EXCEPTION_SIGNATURE/);
  await writeApproval({...entry,sourceSite:{path:'apps/backend/src/modules/sales/activity-port.ts',sha256:digest}});
  await assert.rejects(loadExceptions(snapshot),/EXCEPTION_COMMAND_OWNER/);
  await writeApproval(entry); await save(newPath,source+'// changed\n');
  await assert.rejects(loadExceptions(snapshot),/EXCEPTION_COMMAND_HASH/);
 } finally {process.chdir(previous);assert.equal(dirname(directory),resolve(tmpdir()));await rm(directory,{recursive:true,force:true});}
});
