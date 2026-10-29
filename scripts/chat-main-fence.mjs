// Explicit local maintenance operation. Data/volumes remain untouched.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createConnection} from 'node:net';
import {createPool} from './lib/chat-native.mjs';
import {mainWriterInventory,assertMainFence} from './lib/chat-main-fence.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
if(process.argv.length!==3||process.argv[2]!=='--fence-local-main')throw Error('EXPLICIT_MAIN_FENCE_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||env.MYSQL_MIGRATION_USER!=='crm_migrate')throw Error('LOCAL_MAIN_REQUIRED');
const config=JSON.parse(await readFile('.local/chat-main/images.json','utf8'));if(![config.backend,config.chat].every(s=>/^sha256:[a-f0-9]{64}$/.test(s)))throw Error('PREPARED_IMAGES_REQUIRED');
for(const port of [3001,3002]){const open=await new Promise(resolve=>{const s=createConnection({host:'127.0.0.1',port});s.setTimeout(1000);s.on('connect',()=>{s.destroy();resolve(true);});s.on('error',()=>resolve(false));s.on('timeout',()=>{s.destroy();resolve(false);});});if(open)throw Error('HOST_WRITER_REQUIRES_EXPLICIT_DRAIN');}
const names=['crm_app','crm_auth','marketing_authority_local','outbound_chat','outbound_identity','outbound_worker'];
const accounts=mainWriterInventory().accounts.filter(a=>!['root',env.MYSQL_MIGRATION_USER].includes(a.user));
if(accounts.length!==names.length||accounts.some(a=>a.host!=='%'||!names.includes(a.user)))throw Error('UNREVIEWED_MAIN_WRITER');
const containers=['agentic-crm-human-outbound-worker-1','agentic-crm-human-outbound-chat-1','agentic-crm-human-outbound-connector-1','agentic-crm-human-outbound-identity-1'];
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,connectionLimit:1});
try{
 await mkdir('.local/chat-cutover/fence',{recursive:true});
 const backup={accounts:[],containers,at:new Date().toISOString()};
 for(const a of accounts)backup.accounts.push({...a,grants:(await pool.query('SHOW GRANTS FOR ?@?',[a.user,a.host]))[0]});
 try{await writeFile('.local/chat-cutover/fence/original.json',JSON.stringify(backup),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 const stop=spawnSync('docker',['stop','--time','45',...containers],{windowsHide:true,encoding:'utf8',timeout:240000});if(stop.status!==0)throw Error('OLD_PROCESS_STOP_FAILED');
 for(const a of accounts)await pool.query('ALTER USER ?@? ACCOUNT LOCK',[a.user,a.host]);
 const [sessions]=await pool.query('SELECT ID,USER FROM information_schema.PROCESSLIST');
 for(const s of sessions.filter(s=>names.includes(s.USER))){if(!/^\d+$/.test(String(s.ID)))throw Error('SESSION_ID');await pool.query('KILL CONNECTION '+s.ID);}
 const fence=assertMainFence(env.MYSQL_MIGRATION_USER);
 const report={status:'FENCED',containersStopped:containers,accounts:fence.fence.accounts,activeSourceWriters:0,fenceDigest:fence.fenceDigest};
 await writeFile((await mainEvidenceDirectory())+'/main-fence.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await pool.end();}
