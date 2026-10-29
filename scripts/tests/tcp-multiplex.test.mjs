import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,connect} from 'node:net';
import {PassThrough} from 'node:stream';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {tcpMultiplex} from '../lib/tcp-multiplex.mjs';

test('one tunnel preserves concurrent TCP streams, large bodies, half-close and disconnect isolation',async()=>{
 const upstream=createServer(socket=>socket.pipe(socket));upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const forward=new PassThrough({highWaterMark:1024}),backward=new PassThrough({highWaterMark:1024});
 const remote=tcpMultiplex(forward,backward,{target:{host:'127.0.0.1',port:upstream.address().port}}),local=tcpMultiplex(backward,forward);
 const entry=createServer(socket=>local.accept(socket));entry.listen(0,'127.0.0.1');await once(entry,'listening');
 const exchange=async(size)=>{const body=randomBytes(size),socket=connect(entry.address().port,'127.0.0.1'),parts=[];socket.on('data',chunk=>parts.push(chunk));socket.setTimeout(15000,()=>socket.destroy(new Error('TUNNEL_TIMEOUT')));try{socket.end(body);await once(socket,'end');assert.deepEqual(Buffer.concat(parts),body);}finally{socket.destroy();}};
 try{await Promise.all(Array.from({length:24},()=>exchange(128*1024)));await exchange(8*1024*1024);
  const abandoned=connect(entry.address().port,'127.0.0.1');await once(abandoned,'connect');abandoned.destroy();await exchange(1024);
 }finally{local.close();remote.close();forward.destroy();backward.destroy();await Promise.all([new Promise(r=>entry.close(r)),new Promise(r=>upstream.close(r))]);}
});
