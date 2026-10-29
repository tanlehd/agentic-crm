// Explicit retained-test operator CLI; main-local activation is deliberately absent.
import {provision,provisionRuntime,config,pool} from './lib/chat-native.mjs';
import {migrate,artifacts} from '../services/chat/dist/schema.js';
import {readFile,writeFile} from 'node:fs/promises';
import {privateRoot} from './lib/chat-native.mjs';
import {fenceSource,exportSnapshot,loadSnapshot} from './lib/chat-export.mjs';
import {selectSnapshot} from './lib/chat-selection.mjs';
import {importSnapshot,reconcile,adoptPlan} from './lib/chat-import.mjs';
import {recoveryEvidence} from './lib/chat-recovery.mjs';
const action=process.argv[2];
if(action==='provision'){await provision();console.log('PASS retained Chat schemas/accounts provisioned; existing credentials and data retained');}
else if(action==='grants'){await provisionRuntime();console.log('PASS own-table runtime grants provisioned');}
else if(['snapshot','copy','reconcile','adopt-plan','recovery-check'].includes(action)){
 const cfg=await config(),pointer=`${privateRoot}/latest.json`;let latest;
 try{latest=JSON.parse(await readFile(pointer,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!latest){
  if(action!=='snapshot')throw new Error('COMPLETE_SNAPSHOT_REQUIRED');
  const fixture=JSON.parse(await readFile(`${privateRoot}/fixture.json`,'utf8'));
  await fenceSource(cfg);latest=await exportSnapshot(cfg,{expectedTenants:fixture.tenants});
  await writeFile(pointer,JSON.stringify(latest),{flag:'wx',mode:0o600});
 }
 const snapshot=await loadSnapshot(latest.file,cfg);
 if(action==='snapshot')console.log('PASS complete immutable retained export available; source journal42');
 else {const plan=await selectSnapshot(snapshot),destination=process.argv.includes('--restore')?cfg.restore:cfg.destination;const result=action==='copy'?await importSnapshot(cfg,snapshot,plan,{destination}):action==='adopt-plan'?await adoptPlan(cfg,snapshot,plan,{destination}):action==='recovery-check'?await recoveryEvidence(cfg,snapshot,plan,{destination}):await reconcile(cfg,snapshot,plan,{destination});console.log(JSON.stringify({scope:'T03-storage-migration',...result}));}
}
else if(['migrate','status'].includes(action)){
 const cfg=await config(),p=pool(cfg,'migrator',cfg.destination);
 try{
  if(action==='migrate')console.log('PASS Chat storage migrations applied:',await migrate(p,1));
  else {const [rows]=await p.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');const {steps}=await artifacts();console.log(JSON.stringify({lineage:'chat-owner-v1',rows,expected:steps.map(({version,checksum})=>({version,checksum}))},null,2));}
 }catch(e){console.error(e.message?.startsWith('SCHEMA_')?e.message:(e.code??'CHAT_STORAGE_FAILED'));process.exitCode=1;}finally{await p.end();}
}else throw new Error('Use provision | migrate | grants | snapshot | adopt-plan | copy | reconcile | recovery-check | status (retained-test only)');
