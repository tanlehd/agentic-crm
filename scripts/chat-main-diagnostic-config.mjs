import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const path='.local/chat-main/compose.baseline.json',c=JSON.parse(await readFile(path,'utf8')),enabled=process.argv[2]==='enable';
if(!['enable','disable'].includes(process.argv[2]))throw Error('MODE_REQUIRED');
for(const role of ['identity','crm','connector','routing','worker','api']){
 const s=c.services[role];s.volumes=s.volumes.filter(x=>!x.includes('chat-main-sql-diagnostic.mjs'));s.command=s.command.filter(x=>!['--import','/run/sql-diagnostic.mjs'].includes(x));
 if(enabled){s.volumes.push(resolve('scripts/chat-main-sql-diagnostic.mjs').replaceAll('\\','/')+':/run/sql-diagnostic.mjs:ro');s.command.splice(1,0,'--import','/run/sql-diagnostic.mjs');}
}
await writeFile(path,JSON.stringify(c,null,2));console.log('Local SQL diagnostic '+(enabled?'enabled':'disabled'));
