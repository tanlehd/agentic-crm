// Synchronize the local Docker VM from the Windows host after a ready handshake.
import {spawn,execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
if(process.platform!=='win32')throw Error('WINDOWS_LOCAL_ONLY');
// GNU date preserves fractional seconds; Docker Desktop BusyBox truncates them.
// Both distributions share this local WSL kernel clock.
const child=spawn('wsl.exe',['-d','Ubuntu-24.04','-u','root','--','sh','-c','echo READY; read stamp; date -u -s "$stamp" >/dev/null'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
let output='',sent=false;
child.stdout.on('data',chunk=>{output+=chunk.toString();if(!sent&&output.includes('READY')){sent=true;child.stdin.end('@'+(Date.now()/1000).toFixed(3)+'\n');}});
child.stderr.resume();
const code=await new Promise(resolve=>child.on('close',resolve));
const observed=Number(execFileSync('docker',['exec','agentic-crm-reporting-reporting-1','node','-e','console.log(Date.now())'],{encoding:'utf8',windowsHide:true})),differenceMs=Date.now()-observed;
const result={status:code===0&&Number.isFinite(observed)&&Math.abs(differenceMs)<200?'PASS':'FAIL',operation:'local-docker-vm-clock-sync',differenceMs};
await writeFile((await mainEvidenceDirectory())+'/clock-sync.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
