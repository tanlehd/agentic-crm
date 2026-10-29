// Local Docker port entry only; no authentication, payload parsing or business state.
import {readFile} from 'node:fs/promises';
import {createServer,connect} from 'node:net';
const route=(await readFile('/proc/net/route','utf8')).split('\n').map(x=>x.trim().split(/\s+/)).find(x=>x[1]==='00000000'&&x[2]!=='00000000');
if(!route||!/^\w{8}$/.test(route[2]))throw Error('LOCAL_DOCKER_GATEWAY_REQUIRED');
const host=route[2].match(/../g).reverse().map(x=>parseInt(x,16)).join('.');
const server=createServer(client=>{const upstream=connect({host,port:13101});client.pipe(upstream).pipe(client);client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());});
server.listen(3001,'0.0.0.0');process.once('SIGTERM',()=>{server.close();setTimeout(()=>process.exit(0),1000).unref();});
