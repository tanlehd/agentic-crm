// Local Windows entry while Docker/WSL mirrored localhost publishing is unavailable.
// Raw TCP only: no authentication material, request parsing, retry or business logic.
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {tcpMultiplex} from './lib/tcp-multiplex.mjs';
if(process.platform!=='win32')throw Error('WINDOWS_LOCAL_ONLY');
const code=(await readFile(new URL('./lib/tcp-multiplex.mjs',import.meta.url),'utf8'))+`\nif(process.env.APP_ENV!=='development'||process.env.PORT!=='13101')throw Error('LOCAL_API_REQUIRED');tcpMultiplex(process.stdin,process.stdout,{target:{host:'127.0.0.1',port:13101}});`;
let stopping=false;
const child=spawn('docker',['exec','-i','agentic-crm-chat-main-api-1','node','--input-type=module','-e',code],{windowsHide:true,stdio:['pipe','pipe','pipe']});
// Docker errors may include environment details; report no stderr/body to logs.
child.stderr.resume();
const mux=tcpMultiplex(child.stdout,child.stdin);
const server=createServer(client=>{if(stopping)client.destroy();else mux.accept(client);});
server.on('error',error=>{console.error(JSON.stringify({status:'unavailable',code:error.code}));process.exitCode=1;stop();});
server.listen(13001,'127.0.0.1',()=>console.log(JSON.stringify({status:'ready',host:'127.0.0.1',port:13001,pid:process.pid})));
const stop=()=>{if(stopping)return;stopping=true;server.close();mux.close();child.kill();};
child.on('error',()=>{console.error('LOCAL_TUNNEL_UNAVAILABLE');process.exitCode=1;stop();});
child.on('close',()=>{if(!stopping){console.error('LOCAL_TUNNEL_CLOSED');process.exitCode=1;stop();}});
process.once('SIGTERM',stop);process.once('SIGINT',stop);
