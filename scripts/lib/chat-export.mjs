// Offline-capable encrypted retained snapshot. Only the separate read-only source
// credential is accepted. No domain runtime imports or fallback credentials.
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,randomBytes,createCipheriv,createDecipheriv,createHmac,timingSafeEqual} from 'node:crypto';
import {privateRoot,pool,rootSQL,userFor} from './chat-native.mjs';
import {sha,canonical,chunkHash,tableHash,q,projection,primary,keyset} from './chat-exact.mjs';
export const key=()=>readFile(`${privateRoot}/export.key`);
const seal=(bytes,key,aad)=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));return Buffer.concat([iv,c.update(bytes),c.final(),c.getAuthTag()]);};
const open=(bytes,key,aad)=>{const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));d.setAAD(Buffer.from(aad));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]);};
export function decodeChunk(cipher,k,run,t,chunk){
 if(sha(cipher)!==chunk.cipherHash)throw new Error('SNAPSHOT_CIPHER_MISMATCH');
 let content;try{content=JSON.parse(open(cipher,k,`${run}:${chunk.file}`).toString('utf8'));}catch{throw new Error('SNAPSHOT_AUTHENTICATION_FAILED');}
 if(content.length!==chunk.count||chunkHash(t,content)!==chunk.hash)throw new Error('SNAPSHOT_ROW_MISMATCH');return content;
}
export async function sign(value){return createHmac('sha256',await key()).update(canonical(value)).digest('hex');}
export async function verified(document){const {signature,...body}=document,actual=await sign(body);if(typeof signature!=='string'||signature.length!==64||!timingSafeEqual(Buffer.from(signature),Buffer.from(actual)))throw new Error('MANIFEST_SIGNATURE_INVALID');return body;}
export async function fenceSource(cfg){
 // This dedicated source has one fixture writer; account lock plus session kill
 // prevents the old connection from continuing after credential revocation.
 rootSQL(`ALTER USER '${userFor('fixture')}'@'%' ACCOUNT LOCK;`);
 const ids=rootSQL(`SELECT ID FROM information_schema.PROCESSLIST WHERE USER='${userFor('fixture')}';`).trim().split(/\s+/).filter(Boolean);
 for(const id of ids){if(!/^\d+$/.test(id))throw new Error('FENCE_SESSION_INVALID');rootSQL(`KILL ${id};`);}
 const evidence={environment:cfg.environment,source:cfg.source,writer:userFor('fixture'),fenced:true,at:new Date().toISOString()};
 await writeFile(`${privateRoot}/fence.json`,JSON.stringify({...evidence,signature:await sign(evidence)}),{mode:0o600});
 return evidence;
}
export async function assertFence(cfg){
 const f=await verified(JSON.parse(await readFile(`${privateRoot}/fence.json`,'utf8')));
 if(f.environment!==cfg.environment||f.source!==cfg.source||f.writer!==userFor('fixture')||!f.fenced)throw new Error('SOURCE_FENCE_REQUIRED');
 if(rootSQL(`SELECT account_locked FROM mysql.user WHERE user='${userFor('fixture')}' AND host='%';`).trim()!=='Y'||rootSQL(`SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE USER='${userFor('fixture')}';`).trim()!=='0')throw new Error('SOURCE_WRITER_NOT_DRAINED');
 return f;
}
export async function exportSnapshot(cfg,{afterChunk=async()=>{},expectedTenants}={}){
 const fence=await assertFence(cfg),run=randomUUID(),folder=join(privateRoot,'exports',run),k=await key();await mkdir(folder,{recursive:true});
 if(!Array.isArray(expectedTenants)||expectedTenants.length<2)throw new Error('EXPLICIT_TENANTS_REQUIRED');
 const p=pool(cfg,'export',cfg.source),c=await p.getConnection();let chunksWritten=0;
 try{
  await c.query("SET time_zone='+00:00'");await c.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  const [[identity]]=await c.query('SELECT @@server_uuid AS instance,@@version AS version,DATABASE() AS db,CAST(UTC_TIMESTAMP(6) AS CHAR) AS at,@@global.gtid_executed AS gtid');
  if(!identity.version.startsWith('8.4.')||identity.db!==cfg.source)throw new Error('SOURCE_ENVIRONMENT_MISMATCH');
  const [journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
  if(journal.length!==42||journal.some((r,i)=>Number(r.version)!==i+1||r.state!=='applied'))throw new Error('SOURCE_LINEAGE_MISMATCH');
  if(canonical(journal)!==canonical(JSON.parse(await readFile(`${privateRoot}/source-journal.json`,'utf8'))))throw new Error('SOURCE_JOURNAL_CHANGED');
  const [tenants]=await c.query('SELECT id,tenant_id,kind FROM tenant ORDER BY id');
  const system='01900000-0000-7000-8000-000000000001';
  if(!tenants.some(t=>t.id===system&&t.tenant_id===system&&t.kind==='system'))throw new Error('REGISTERED_SYSTEM_REQUIRED');
  if(canonical(tenants.filter(t=>t.kind==='business').map(t=>t.id).sort())!==canonical([...expectedTenants].sort()))throw new Error('TENANT_SET_MISMATCH');
  const [tables]=await c.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const entries=[];
  for(const {TABLE_NAME:name} of tables){
   const [cols]=await c.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,GENERATION_EXPRESSION,EXTRA,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[name]);
   const [pk]=await c.query("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX",[name]);
   if(!pk.length)throw new Error('SOURCE_PRIMARY_KEY_REQUIRED');
   const t={name,columns:cols.map(r=>({name:r.COLUMN_NAME,type:r.COLUMN_TYPE+(r.COLLATION_NAME?` CHARACTER SET ${r.COLLATION_NAME.split('_')[0]} COLLATE ${r.COLLATION_NAME}`:''),nullable:r.IS_NULLABLE==='YES',generated:r.GENERATION_EXPRESSION,extra:r.EXTRA})),keys:[{name:'PRIMARY',columns:pk.map(r=>({name:r.COLUMN_NAME}))}]};
   const keys=primary(t),chunks=[];let last;
   while(true){
    // ORDER BY must bind native typed columns, not CAST aliases (version 42
    // must sort after9). Keysets and ordering use the same physical key types.
    const where=keyset(keys,last),[rows]=await c.query(`SELECT ${projection(t)} FROM ${q(name)}${where.sql} ORDER BY ${keys.map(k=>q(name)+'.'+q(k)).join(',')} LIMIT 1000`,where.args);
    if(!rows.length)break;
    const number=chunks.length,filename=`${name}-${number}.enc`,hash=chunkHash(t,rows),bytes=seal(Buffer.from(JSON.stringify(rows)),k,`${run}:${filename}`);
    await writeFile(join(folder,filename),bytes,{flag:'wx',mode:0o600});
    chunks.push({number,count:rows.length,hash,file:filename,cipherHash:sha(bytes)});last=keys.map(k=>rows.at(-1)[k]);chunksWritten++;await afterChunk({run,name,number,chunksWritten});
   }
   const [[count]]=await c.query(`SELECT COUNT(*) AS total FROM ${q(name)}`),rowCount=chunks.reduce((n,c)=>n+c.count,0);
   if(String(count.total)!==String(rowCount))throw new Error('SOURCE_KEYSET_COUNT_MISMATCH');
   entries.push({...t,chunks,rowCount,tableHash:tableHash(chunks)});
  }
  await c.commit();await assertFence(cfg);
  const dictionary=sha((await readFile('services/chat/migrations/dictionary.json','utf8')).replaceAll('\r\n','\n'));
  const body={format:1,environment:cfg.environment,run,source:identity,destination:cfg.destination,tenants:expectedTenants,sourceJournal:journal,journalHash:sha(canonical(journal)),fence,watermark:identity.gtid||'GTID_UNAVAILABLE_WRITERS_FENCED',dictionary,tables:entries,complete:true};
  const manifest={...body,signature:await sign(body)},file=join(folder,'complete.json');
  await writeFile(join(folder,'publishing.json'),JSON.stringify(manifest),{flag:'wx',mode:0o600});await rename(join(folder,'publishing.json'),file);
  return {file,run,tableCount:entries.length,rowCount:entries.reduce((n,t)=>n+t.rowCount,0)};
 }catch(e){await c.rollback().catch(()=>{});await writeFile(join(folder,'incomplete.json'),JSON.stringify({run,complete:false,chunksWritten,reason:'SNAPSHOT_ABORTED'}),{flag:'wx',mode:0o600});throw e;}
 finally{c.release();await p.end();}
}
export async function loadSnapshot(file,cfg){
 const m=await verified(JSON.parse(await readFile(file,'utf8')));
 if(!m.complete||m.format!==1||m.environment!=='retained-test'||m.source.db!==cfg.source||m.destination!==cfg.destination||m.dictionary!==sha((await readFile('services/chat/migrations/dictionary.json','utf8')).replaceAll('\r\n','\n')))throw new Error('SNAPSHOT_IDENTITY_MISMATCH');
 const folder=join(privateRoot,'exports',m.run),k=await key(),rows={};
 for(const t of m.tables){
  q(t.name);rows[t.name]=[];
  for(const [i,chunk] of t.chunks.entries()){
   if(chunk.number!==i||chunk.file!==`${t.name}-${i}.enc`||chunk.count<1||chunk.count>1000||i<t.chunks.length-1&&chunk.count!==1000)throw new Error('SNAPSHOT_CHUNK_ORDER');
   const cipher=await readFile(join(folder,chunk.file));rows[t.name].push(...decodeChunk(cipher,k,m.run,t,chunk));
  }
  if(rows[t.name].length!==t.rowCount||tableHash(t.chunks)!==t.tableHash||new Set(rows[t.name].map(r=>canonical(primary(t).map(k=>r[k])))).size!==t.rowCount)throw new Error('SNAPSHOT_TABLE_MISMATCH');
 }
 return {manifest:m,rows,bytes:(await stat(file)).size};
}
