// Read-only main-local diagnostic snapshot. This is never a cutover/import input:
// writers are not fenced here. Payloads stay encrypted outside Git.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomBytes,randomUUID,createCipheriv,createHmac} from 'node:crypto';
import {createPool} from './lib/chat-native.mjs';
import {canonical,sha,projection,primary,keyset,chunkHash,tableHash} from './lib/chat-exact.mjs';
import {migrations,checksum} from '../services/core-baseline/dist/kernel/database/migrations.js';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';

const root='.local/chat-cutover',env=parseEnv(await readFile('.env','utf8'));
const host=parseEnv(await readFile('.local/services/api.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||host.APP_ENV!=='development'||host.MYSQL_DATABASE!==env.MYSQL_DATABASE||host.MYSQL_HOST!=='127.0.0.1'||Number(host.MYSQL_PORT)!==13306)throw Error('LOCAL_MAIN_REQUIRED');
if(!env.MYSQL_MIGRATION_USER||!env.MYSQL_MIGRATION_PASSWORD)throw Error('LOCAL_OPERATOR_REQUIRED');
await mkdir(root,{recursive:true});
try{await writeFile(root+'/main-snapshot.key',randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
const key=await readFile(root+'/main-snapshot.key');if(key.length!==32)throw Error('SNAPSHOT_KEY_INVALID');
const pool=createPool({host:'127.0.0.1',port:13306,user:env.MYSQL_MIGRATION_USER,password:env.MYSQL_MIGRATION_PASSWORD,database:'agentic_crm',timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true,connectionLimit:1,multipleStatements:false});
const c=await pool.getConnection(),run=randomUUID(),folder=root+'/main-preflight/'+run;
await mkdir(folder,{recursive:true});
try{
 await c.query("SET time_zone='+00:00'");
 await c.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
 await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
 const [[identity]]=await c.query('SELECT @@server_uuid instance,@@version version,DATABASE() db,CAST(UTC_TIMESTAMP(6) AS CHAR) at');
 if(identity.db!=='agentic_crm'||!identity.version.startsWith('8.4.'))throw Error('MAIN_IDENTITY_MISMATCH');
 const [journal]=await c.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');
 if(journal.length!==43||journal.some((r,i)=>Number(r.version)!==i+1||r.name!==migrations[i].name||r.checksum!==checksum(migrations[i])||r.state!=='applied'))throw Error('MAIN_SOURCE43_REQUIRED');
 const [inventory]=await c.query("SELECT TABLE_NAME name,ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
 // Complete privileged inventory, unlike API credentials' intentionally partial view.
 if(inventory.length!==122||inventory.some(t=>t.engine!=='InnoDB'))throw Error('MAIN_INVENTORY_CHANGED');
 const tables=[],rows={};
 for(const {name}of inventory){
  const [columns]=await c.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,GENERATION_EXPRESSION,EXTRA,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[name]);
  const [pk]=await c.query("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX",[name]);
  if(!pk.length)throw Error('PRIMARY_KEY_REQUIRED');
  const table={name,columns:columns.map(r=>({name:r.COLUMN_NAME,type:r.COLUMN_TYPE+(r.COLLATION_NAME?` CHARACTER SET ${r.COLLATION_NAME.split('_')[0]} COLLATE ${r.COLLATION_NAME}`:''),nullable:r.IS_NULLABLE==='YES',generated:r.GENERATION_EXPRESSION,extra:r.EXTRA})),keys:[{name:'PRIMARY',columns:pk.map(r=>({name:r.COLUMN_NAME}))}]};
  const keys=primary(table),chunks=[];let last;rows[name]=[];
  for(;;){
   const where=keyset(keys,last),[page]=await c.query(`SELECT ${projection(table)} FROM \`${name}\`${where.sql} ORDER BY ${keys.map(k=>`\`${name}\`.\`${k}\``).join(',')} LIMIT 1000`,where.args);
   if(!page.length)break;
   chunks.push({number:chunks.length,count:page.length,hash:chunkHash(table,page)});rows[name].push(...page);last=keys.map(k=>page.at(-1)[k]);
  }
  const [[count]]=await c.query(`SELECT COUNT(*) total FROM \`${name}\``);
  if(String(count.total)!==String(rows[name].length))throw Error('SNAPSHOT_COUNT_MISMATCH');
  tables.push({...table,rowCount:rows[name].length,chunks,tableHash:tableHash(chunks)});
 }
 const [foreignKeys]=await c.query('SELECT TABLE_NAME source_table,CONSTRAINT_NAME constraint_name,COLUMN_NAME source_column,REFERENCED_TABLE_NAME target_table,REFERENCED_COLUMN_NAME target_column,ORDINAL_POSITION position FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION');
 await c.commit();
 const tenants=rows.tenant.filter(t=>t.kind==='business').map(t=>t.id).sort();
 if(tenants.length!==2||!rows.tenant.some(t=>t.kind==='system'&&t.id===t.tenant_id&&t.id==='01900000-0000-7000-8000-000000000001'))throw Error('MAIN_TENANTS_CHANGED');
 const manifest={format:1,environment:'local-main-preflight',purpose:'diagnostic-only-not-importable',writersFenced:false,run,source:identity,sourceJournal:journal,tenants,tables,foreignKeys};
 const plain=Buffer.from(JSON.stringify({manifest,rows}));if(plain.length>268435456)throw Error('SNAPSHOT_SIZE_LIMIT');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(canonical(manifest)));
 const sealed=Buffer.concat([iv,cipher.update(plain),cipher.final(),cipher.getAuthTag()]);
 await writeFile(folder+'/snapshot.enc',sealed,{flag:'wx',mode:0o600});
 const body={manifest,cipherHash:sha(sealed)},signature=createHmac('sha256',key).update(canonical(body)).digest('hex');
 await writeFile(folder+'/publishing.json',JSON.stringify({...body,signature}),{flag:'wx',mode:0o600});
 await rename(folder+'/publishing.json',folder+'/complete.json');
 await writeFile(root+'/main-preflight-latest.json',JSON.stringify({folder}),{mode:0o600});
 const report={status:'PASS',purpose:manifest.purpose,writersFenced:false,sourceVersion:43,tableCount:tables.length,rowCount:tables.reduce((n,t)=>n+t.rowCount,0),tenantCount:tenants.length,encrypted:true,manifestHash:sha(canonical(manifest)),tables:tables.map(t=>({name:t.name,rowCount:t.rowCount,hash:t.tableHash}))};
 await writeFile((await mainEvidenceDirectory())+'/main-preflight-snapshot.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,tableCount:report.tableCount,rowCount:report.rowCount,encrypted:true,purpose:report.purpose}));
}catch(e){await c.rollback().catch(()=>{});throw e;}finally{c.release();await pool.end();}
