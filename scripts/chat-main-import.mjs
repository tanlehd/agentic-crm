// Explicit main-local copy, while all source writers remain fenced. Activation
// and forward3/4 are separate operator steps after this reconciliation.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createPool} from './lib/chat-native.mjs';
import {loadMainFinalSnapshot} from './lib/chat-main-preflight.mjs';
import {selectMainSnapshot} from './lib/chat-main-selection.mjs';
import {importMainSelection} from './lib/chat-main-import.mjs';
import {assertMainFence} from './lib/chat-main-fence.mjs';
import {canonical} from './lib/chat-exact.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';

if(process.argv.length!==3||process.argv[2]!=='--fenced-local-main')throw Error('EXPLICIT_FENCED_LOCAL_MAIN_REQUIRED');
const env=parseEnv(await readFile('.env','utf8'));
if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_MAIN_REQUIRED');
const snapshot=await loadMainFinalSnapshot();
const current=assertMainFence(env.MYSQL_MIGRATION_USER);
if(canonical(current.fence)!==canonical(snapshot.manifest.fence)||current.fenceDigest!==snapshot.manifest.fenceDigest)throw Error('MAIN_FENCE_CHANGED');
const credentials=JSON.parse(await readFile('.local/chat-cutover/main-import-operator.json','utf8'));
if(credentials.host!=='127.0.0.1'||credentials.port!==13306||credentials.database!=='crm_chat'||credentials.user!=='chat_main_import_operator'||!/^[a-f0-9]{64}$/.test(credentials.password))throw Error('MAIN_IMPORT_OPERATOR_CONFIG');
const pool=createPool({...credentials,timezone:'Z',dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,jsonStrings:true,connectionLimit:5,multipleStatements:false});
try{
 const result=await importMainSelection(pool,snapshot,await selectMainSnapshot(snapshot),{destination:'crm_chat'});
 if(canonical(assertMainFence(env.MYSQL_MIGRATION_USER))!==canonical(current))throw Error('MAIN_FENCE_CHANGED');
 await writeFile((await mainEvidenceDirectory())+'/main-import.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await pool.end();}
