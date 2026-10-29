// Bounded raw TCP streams over one private duplex pipe; no HTTP/auth inspection or retries.
import {connect} from 'node:net';
const OPEN=1,DATA=2,END=3,CLOSE=4,PAUSE=5,RESUME=6,MAX=65536;
export function tcpMultiplex(input,output,{target,maxConnections=64}={}){
 const streams=new Map();let next=0,buffer=Buffer.alloc(0),blocked=false,closed=false;
 const resume=entry=>{if(!blocked&&!entry.paused)entry.socket.resume();};
 function shutdown(){if(closed)return;closed=true;for(const {socket}of streams.values())socket.destroy();streams.clear();}
 function send(type,id,payload=Buffer.alloc(0)){
  if(closed)return;const header=Buffer.allocUnsafe(9);header[0]=type;header.writeUInt32BE(id,1);header.writeUInt32BE(payload.length,5);
  if(!output.write(Buffer.concat([header,payload]))){blocked=true;for(const {socket}of streams.values())socket.pause();}
 }
 function attach(id,socket){
  const entry={socket,paused:false};streams.set(id,entry);socket.allowHalfOpen=true;socket.setNoDelay(true);socket.setTimeout(60000,()=>socket.destroy());
  socket.on('data',chunk=>{for(let offset=0;offset<chunk.length;offset+=MAX)send(DATA,id,chunk.subarray(offset,offset+MAX));});
  socket.on('end',()=>send(END,id));socket.on('drain',()=>send(RESUME,id));socket.on('error',()=>socket.destroy());
  socket.on('close',()=>{if(streams.delete(id))send(CLOSE,id);});
  if(blocked)socket.pause();return entry;
 }
 function receive(type,id,payload){
  if(type===OPEN){if(!target||streams.has(id)||streams.size>=maxConnections){send(CLOSE,id);return;}attach(id,connect(target));return;}
  const entry=streams.get(id);if(!entry)return;
  if(type===DATA){if(!entry.socket.write(payload))send(PAUSE,id);}
  else if(type===END){entry.ended=true;entry.socket.end();}
  else if(type===CLOSE){if(!entry.ended){streams.delete(id);entry.socket.destroy();}}
  else if(type===PAUSE){entry.paused=true;entry.socket.pause();}
  else if(type===RESUME){entry.paused=false;resume(entry);}
 }
 input.on('data',chunk=>{
  if(closed)return;buffer=Buffer.concat([buffer,chunk]);
  while(buffer.length>=9){const type=buffer[0],id=buffer.readUInt32BE(1),length=buffer.readUInt32BE(5);
   if(!id||type<OPEN||type>RESUME||length>MAX||type!==DATA&&length){shutdown();input.destroy();output.destroy();return;}
   if(buffer.length<9+length)break;const payload=buffer.subarray(9,9+length);buffer=buffer.subarray(9+length);receive(type,id,payload);
  }
 });
 output.on('drain',()=>{blocked=false;for(const entry of streams.values())resume(entry);});
 input.on('end',shutdown);input.on('error',shutdown);output.on('error',shutdown);output.on('close',shutdown);
 return {accept(socket){if(closed||streams.size>=maxConnections||next===0xffffffff){socket.destroy();return;}const id=++next;send(OPEN,id);attach(id,socket);},close:shutdown};
}
