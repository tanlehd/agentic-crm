import type {IncomingMessage,Server} from 'node:http';
import type {Duplex} from 'node:stream';
import {WebSocketServer,WebSocket} from 'ws';
import {Redis} from 'ioredis';
const tenantId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type InboxAuthorizer=(request:IncomingMessage,tenant:string)=>Promise<string>;
export interface InboxHintSource {onHint:(receive:(tenant:string)=>void)=>()=>void;close:()=>void}
export function redisInboxHints(env:NodeJS.ProcessEnv=process.env):InboxHintSource{
 const redis=new Redis({host:env.REDIS_HOST??'127.0.0.1',port:Number(env.REDIS_PORT??6379),password:env.REDIS_PASSWORD||undefined,db:Number(env.REDIS_DB??0),connectTimeout:2000,commandTimeout:1000,maxRetriesPerRequest:0,enableOfflineQueue:false});
 const listeners=new Set<(tenant:string)=>void>();
 redis.on('error',()=>{});redis.on('ready',()=>{void redis.subscribe('crm.inbox.changed.v1').catch(()=>{});});
 redis.on('message',(channel,raw)=>{if(channel!=='crm.inbox.changed.v1'||raw.length>128)return;try{const v=JSON.parse(raw);if(v.version===1&&tenantId.test(v.tenant_id)&&Object.keys(v).length===2)for(const listener of listeners)listener(v.tenant_id);}catch{/* Invalid hints never reach clients. */}});
 return{onHint:receive=>{listeners.add(receive);return()=>{listeners.delete(receive);};},close:()=>{listeners.clear();redis.disconnect();}};
}
export function attachInboxRealtime(server:Server,origin:string,authorize:InboxAuthorizer,source:InboxHintSource,heartbeatMs=30000){
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false,handleProtocols:protocols=>protocols.has('crm.inbox.v1')?'crm.inbox.v1':false});
 type Client={ws:WebSocket;request:IncomingMessage;tenant:string;session:string;alive:boolean;checking:boolean;dirty:boolean};
 const clients=new Set<Client>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
 let pending=0,closed=false;
 const send=(c:Client,type:'ready'|'invalidate')=>{if(c.ws.readyState!==WebSocket.OPEN)return;if(c.ws.bufferedAmount>16384){c.ws.terminate();return;}c.ws.send(JSON.stringify({version:1,type}));};
 async function check(c:Client){
  if(c.checking)return;c.checking=true;
  try{if(await authorize(c.request,c.tenant)!==c.session)throw Object.assign(new Error(),{status:403});if(c.dirty){c.dirty=false;send(c,'invalidate');}}
  catch(error){const status=(error as {status?:number}).status;c.ws.close(status===401?4401:status===403?4403:1013);}
  finally{c.checking=false;}
 }
 const unsubscribe=source.onHint(tenant=>{if(timers.has(tenant)||![...clients].some(c=>c.tenant===tenant))return;timers.set(tenant,setTimeout(()=>{timers.delete(tenant);for(const c of clients)if(c.tenant===tenant){c.dirty=true;void check(c);}},250));});
 const upgrade=(request:IncomingMessage,socket:Duplex,head:Buffer)=>{
  let url:URL;try{url=new URL(request.url??'/',origin);}catch{socket.destroy();return;}
  if(url.pathname!=='/api/v1/inbox-realtime'){socket.destroy();return;}
  const tenant=url.searchParams.get('tenant_id')??'';
  if(closed||clients.size+pending>=256||request.headers.origin!==origin||!tenantId.test(tenant)||url.searchParams.size!==1||request.headers['sec-websocket-protocol']!=='crm.inbox.v1'){
   socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;
  }
  wss.handleUpgrade(request,socket,head,ws=>{
   pending++;
   // No application frame until current native session and tenant grant pass.
   const timeout=setTimeout(()=>ws.close(1013),5000);
   ws.on('error',()=>ws.terminate());ws.on('message',()=>ws.close(1008));
   void authorize(request,tenant).then(session=>{
    if(ws.readyState!==WebSocket.OPEN)return;
    if([...clients].filter(c=>c.session===session).length>=3){ws.close(1013);return;}
    const client:Client={ws,request,tenant,session,alive:true,checking:false,dirty:false};clients.add(client);
    ws.on('close',()=>clients.delete(client));ws.on('pong',()=>{client.alive=true;});send(client,'ready');
   }).catch(error=>ws.close(error?.status===401?4401:error?.status===403?4403:1013)).finally(()=>{pending--;clearTimeout(timeout);});
  });
 };
 server.on('upgrade',upgrade);
 const heartbeat=setInterval(()=>{for(const client of clients){if(!client.alive){client.ws.terminate();continue;}client.alive=false;client.ws.ping();void check(client);}},heartbeatMs);heartbeat.unref();
 return{close(){closed=true;server.off('upgrade',upgrade);clearInterval(heartbeat);unsubscribe();source.close();for(const timer of timers.values())clearTimeout(timer);for(const client of clients)client.ws.terminate();wss.close();}};
}
