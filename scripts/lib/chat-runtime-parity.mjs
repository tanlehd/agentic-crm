import {request as httpRequest} from 'node:http';
import {nativeChatProcess,availableChatPort} from './chat-process-fixture.mjs';
import {ownerCommandClient,remoteRegistryAuthority} from '../../packages/workload-transport/dist/index.js';

export function forwardChatProofs(server,url){
 const original=server.listeners('request');let count=0;
 server.removeAllListeners('request');server.on('request',(req,res)=>{
  count++;const upstream=httpRequest(new URL(req.url,url),{method:req.method,headers:req.headers,timeout:15000},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end('{}');});req.pipe(upstream);
 });
 return {count:()=>count,restore(){server.removeAllListeners('request');for(const listener of original)server.on('request',listener);}};
}

// Native owner fixtures remain real implementations; all their Chat proof callbacks
// are forwarded to the independent API while the scoped parity case is running.
export async function nativeChatParity(ctx,owners,cursorKey=ctx.f.key){
 const diagnostics=[];
 if(process.env.CHAT_RUNTIME_DIAGNOSTICS==='1')for(const server of ctx.servers){const listener=(req,res)=>{const start=Date.now();res.on('finish',()=>console.log('PARITY_PEER',req.url,res.statusCode,Date.now()-start));};server.on('request',listener);diagnostics.push([server,listener]);}
 const identity=new URL('/',ctx.registryConfig.url);
 const base={tenant:ctx.tenant,material:ctx.chatMaterial,registry:ctx.registryConfig,cursorKey,owners:{identity,crm:identity,connector:identity,routing:identity,...owners},dispatch:{identity,connector:owners.connector??identity}};
 const runtime=await nativeChatProcess({...base,name:'parity',port:await availableChatPort()});
 const proofs=forwardChatProofs(ctx.chatServer,runtime.url);
 const call=ownerCommandClient(ctx.bffMaterial,remoteRegistryAuthority(ctx.bffMaterial,ctx.registryConfig),'chat',runtime.url);
 return {...runtime,call,async crashRestart(){await runtime.crash();await runtime.start();},startWorker:async jobs=>nativeChatProcess({...base,name:'worker',port:await availableChatPort(),mode:'worker',workerJobs:jobs}),proofCount:proofs.count,async stop(){proofs.restore();for(const [peer,listener]of diagnostics)peer.removeListener('request',listener);await runtime.stop();}};
}
