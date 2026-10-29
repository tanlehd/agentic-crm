// Read-only local clock diagnostics; emits no environment, identifiers or credentials.
import {readFile} from 'node:fs/promises';
const samples=Number(process.argv[2]??600);
if(!Number.isInteger(samples)||samples<10||samples>1200)throw Error('BOUNDED_SAMPLE_REQUIRED');
const clocksource=await readFile('/sys/devices/system/clocksource/clocksource0/current_clocksource','utf8').then(s=>s.trim()).catch(()=>process.platform);
let wall=Date.now(),mono=performance.now();const jumps=[];
for(let i=0;i<samples;i++){
 await new Promise(resolve=>setTimeout(resolve,100));
 const nextWall=Date.now(),nextMono=performance.now(),wallDelta=nextWall-wall,monotonicDelta=nextMono-mono;
 if(Math.abs(wallDelta-monotonicDelta)>50)jumps.push({sample:i,wallDelta,monotonicDelta:Math.round(monotonicDelta)});
 wall=nextWall;mono=nextMono;
}
console.log(JSON.stringify({clocksource,samples,jumps}));
