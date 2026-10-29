// Immutable, private operator plans. No credentials or row bodies in public evidence.
import {readFile,writeFile,mkdir,link,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {privateRoot,profileName,userFor} from './chat-native.mjs';
import {key,sign,verified} from './chat-export.mjs';
import {canonical,sha,primary,rowHash,chunkHash,tableHash} from './chat-exact.mjs';
const fail=code=>{throw new Error('NO_GO_'+code);};
export const migrationTables=new Set(['schema_migration','chat_migration_run','chat_migration_chunk']);
export function typedSort(t,rows){
 const keys=primary(t);return [...rows].sort((a,b)=>{for(const key of keys){const col=t.columns.find(c=>c.name===key);if(a[key]===b[key])continue;if(/^(?:bigint|int|smallint|tinyint)/i.test(col.type))return BigInt(a[key])<BigInt(b[key])?-1:1;return a[key]<b[key]?-1:1;}return 0;});
}
export function planContents(plan,tenants){
 if(plan.classificationHash!==sha(canonical(plan.dispositions))||plan.mappingHash!==sha(canonical(plan.mappings)))fail('PLAN_HASH_INVALID');
 if(canonical(Object.keys(plan.selected).sort())!==canonical(plan.dictionary.tables.map(t=>t.name).sort()))fail('PLAN_TABLE_SET');
 const reports=[];
 for(const t of plan.dictionary.tables){
  const all=plan.selected[t.name];
  if(all.some(r=>!tenants.includes(r.tenant_id))||new Set(all.map(r=>canonical(primary(t).map(k=>r[k])))).size!==all.length)fail('PLAN_TENANT_OR_DUPLICATE');
  if(migrationTables.has(t.name)&&all.length)fail('PLAN_OPERATOR_ROWS');
 }
 for(const tenant of [...tenants].sort()){
  const tables=[];
  for(const t of plan.dictionary.tables.filter(t=>!migrationTables.has(t.name))){
   const rows=typedSort(t,plan.selected[t.name].filter(r=>r.tenant_id===tenant)),chunks=[];
   for(let n=0;n<rows.length;n+=1000)chunks.push({number:n/1000,count:Math.min(1000,rows.length-n),hash:chunkHash(t,rows.slice(n,n+1000))});
   tables.push({table:t.name,row_count:String(rows.length),table_hash:tableHash(chunks)});
  }
  tables.sort((a,b)=>a.table<b.table?-1:1);reports.push({tenant,tables,tenantHash:sha(canonical(tables))});
 }
 // Exact hashes include empty operator tables, all columns and deterministic PK order.
 return {dictionary:sha(canonical(plan.dictionary)),classificationHash:plan.classificationHash,mappingHash:plan.mappingHash,
  rows:plan.dictionary.tables.map(t=>({table:t.name,rows:typedSort(t,plan.selected[t.name]).map(r=>rowHash(t,r))})),reports};
}
const codeFiles=[
 'scripts/lib/chat-plan.mjs','scripts/lib/chat-import.mjs','scripts/lib/chat-export.mjs','scripts/lib/chat-selection.mjs','scripts/lib/chat-exact.mjs','scripts/lib/chat-native.mjs','scripts/lib/chat-data-partition.mjs','scripts/lib/chat-events.mjs','scripts/lib/chat-exceptions.mjs','scripts/lib/chat-references.mjs','scripts/lib/chat-recovery.mjs',
 'services/chat/src/schema.ts','services/chat/src/database.ts','services/chat/dist/schema.js','services/chat/dist/database.js',
 'services/chat/migrations/dictionary.json','services/chat/migrations/mysql84-metadata.json','services/chat/migrations/checksums.json','services/chat/migrations/chat001-owned-storage.sql','services/chat/migrations/chat002-local-constraints.sql',
 'docs/data/chat-extraction/source-v42.json','docs/data/chat-extraction/manifest-v1.json','packages/contracts/schemas/chat-owner-v1.json','packages/contracts/schemas/chat-control-v1.json','packages/contracts/schemas/chat-dispatch-v1.json','services/chat/package.json','package.json','pnpm-lock.yaml'
];
export async function describePlan(cfg,snapshot,plan,identity){
 if(![cfg.destination,cfg.restore].includes(identity.db)||identity.db===snapshot.manifest.source.db)fail('DESTINATION_ALLOWLIST');
 const files=[];for(const file of codeFiles)files.push({file,sha256:sha((await readFile(file,'utf8')).replaceAll('\r\n','\n'))});
 const contents=planContents(plan,snapshot.manifest.tenants),m=snapshot.manifest;
 const body={format:1,kind:'chat-import-plan',run:m.run,snapshotDigest:sha(canonical(m)),sourceIdentity:`${m.source.instance}/${m.source.db}/42`,destinationIdentity:`${identity.instance}/${identity.db}/chat-owner-v1`,destination:identity.db,
  contents,code:{node:process.version,files},configuration:{profile:profileName,environment:cfg.environment,host:cfg.host,port:cfg.port,source:cfg.source,destination:cfg.destination,restore:cfg.restore,role:userFor('migrator'),chunkSize:1000,writerEpoch:'1',writerMode:'shadow'}};
 return {...body,digest:sha(canonical(body))};
}
function folder(binding){
 if(!/^[a-f0-9-]{36}$/.test(binding.run)||!/^test_crm_chat(?:_final)?(?:_restore)?$/.test(binding.destination)||!(/^[a-f0-9]{64}$/.test(binding.digest)))fail('PLAN_PATH');
 return join(privateRoot,'plans',binding.run,binding.destination,binding.digest);
}
export async function loadPlan(binding){
 const dir=folder(binding),index=await verified(JSON.parse(await readFile(join(dir,'index.json'),'utf8')));
 if(index.kind!=='chat-import-plan-index'||canonical(index.binding)!==canonical(binding))fail('PLAN_INDEX_MISMATCH');
 const bytes=await readFile(join(dir,'plan.enc'));
 if(sha(bytes)!==index.cipherHash)fail('PLAN_CIPHER_HASH');
 const d=createDecipheriv('aes-256-gcm',await key(),bytes.subarray(0,12));d.setAAD(Buffer.from(canonical(binding)));d.setAuthTag(bytes.subarray(-16));
 let plan;try{plan=JSON.parse(Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]).toString('utf8'));}catch{fail('PLAN_AUTHENTICATION');}
 if(canonical(planContents(plan,binding.contents.reports.map(r=>r.tenant)))!==canonical(binding.contents))fail('PLAN_CONTENT_MISMATCH');
 return plan;
}
export async function readBinding(run,destination,digest){
 const index=await verified(JSON.parse(await readFile(join(folder({run,destination,digest}),'index.json'),'utf8')));
 const {digest:actual,...body}=index.binding;
 if(actual!==digest||sha(canonical(body))!==digest||index.binding.run!==run||index.binding.destination!==destination)fail('PLAN_BINDING_DIGEST');
 await loadPlan(index.binding);return index.binding;
}
export async function savePlan(binding,plan){
 const dir=folder(binding);await mkdir(dir,{recursive:true});
 try{await loadPlan(binding);return;}catch(e){if(e.code!=='ENOENT')throw e;}
 // Cipher is immutable too; an interrupted publication reuses and authenticates it.
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',await key(),iv);c.setAAD(Buffer.from(canonical(binding)));
 const bytes=Buffer.concat([iv,c.update(Buffer.from(JSON.stringify(plan))),c.final(),c.getAuthTag()]);
 try{await writeFile(join(dir,'plan.enc'),bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const saved=await readFile(join(dir,'plan.enc')),body={kind:'chat-import-plan-index',binding,cipherHash:sha(saved)};
 await immutableSigned(join(dir,'index.json'),body);await loadPlan(binding);
}
export async function immutableSigned(file,body){
 try{const old=await verified(JSON.parse(await readFile(file,'utf8')));if(canonical(old)!==canonical(body))fail('IMMUTABLE_ARTIFACT_CONFLICT');return;}catch(e){if(e.code!=='ENOENT')throw e;}
 // Publish complete bytes; keep temporary files after process death for diagnosis.
 const temp=file+'.'+randomBytes(8).toString('hex')+'.tmp';
 await writeFile(temp,JSON.stringify({...body,signature:await sign(body)}),{flag:'wx',mode:0o600});
 try{await link(temp,file);}catch(e){if(e.code!=='EEXIST')throw e;const old=await verified(JSON.parse(await readFile(file,'utf8')));if(canonical(old)!==canonical(body))fail('IMMUTABLE_ARTIFACT_CONFLICT');}
 await unlink(temp);
}
