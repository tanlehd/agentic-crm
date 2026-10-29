// Explicit writer state transitions; recovery always stays on crm_chat.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
import {loadMainFinalSnapshot} from './lib/chat-main-preflight.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
const mode=process.argv[2];if(process.argv.length!==3||!['activate','freeze','recover'].includes(mode))throw Error('EXPLICIT_WRITER_MODE_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const out=await mainEvidenceDirectory(),snapshot=await loadMainFinalSnapshot();
if(mode==='activate'){
 if(JSON.parse(await readFile(out+'/main-runtime-provision.json','utf8')).status!=='READY_FOR_ACTIVATION'||JSON.parse(await readFile(out+'/main-peers.json','utf8')).status!=='PASS')throw Error('ACTIVATION_PREREQUISITES');
}
const pool=createPool({host:'127.0.0.1',port:13306,user:'root',password:env.MYSQL_ROOT_PASSWORD,database:'crm_chat',connectionLimit:1});
const c=await pool.getConnection();
try{
 for(const a of snapshot.manifest.fence.accounts){const [[row]]=await c.query('SELECT account_locked FROM mysql.user WHERE User=? AND Host=?',[a.user,a.host]);if(row?.account_locked!=='Y')throw Error('OLD_WRITER_UNLOCKED');}
 await c.beginTransaction();
 const [gates]=await c.query('SELECT tenant_id,mode,epoch FROM chat_writer_gate ORDER BY tenant_id FOR UPDATE');
 const expected={activate:'shadow',freeze:'active',recover:'frozen'}[mode];
 if(gates.length!==snapshot.manifest.tenants.length||gates.some(g=>!snapshot.manifest.tenants.includes(g.tenant_id)||g.mode!==expected)||new Set(gates.map(g=>String(g.epoch))).size!==1)throw Error('WRITER_GATE_STATE');
 const epoch=(BigInt(gates[0].epoch)+(mode==='recover'?1n:0n)).toString(),target=mode==='freeze'?'frozen':'active';
 if(mode==='activate'&&epoch!=='1')throw Error('INITIAL_EPOCH');
 await c.execute('UPDATE chat_writer_gate SET mode=?,epoch=?,updated_at=UTC_TIMESTAMP(6) WHERE mode=?',[target,epoch,expected]);await c.commit();
 if(mode==='recover'){
  const path='.local/chat-main/chat.env',text=await readFile(path,'utf8');if(!/^CHAT_WRITER_EPOCH=.*$/m.test(text))throw Error('CHAT_EPOCH_CONFIG_MISSING');
  await writeFile(path,text.replace(/^CHAT_WRITER_EPOCH=.*$/m,'CHAT_WRITER_EPOCH='+JSON.stringify(epoch)),{mode:0o600});
 }
 const result={status:'PASS',operation:mode,mode:target,epoch,tenants:gates.length,database:'crm_chat'};
 await writeFile(out+'/main-'+mode+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await c.rollback();throw e;}finally{c.release();await pool.end();}
