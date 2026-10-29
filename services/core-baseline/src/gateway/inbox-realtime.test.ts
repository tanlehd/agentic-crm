import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {attachInboxRealtime} from './inbox-realtime.js';
it('isolates tenants, rejects origin/session, rechecks revoke and sends only generic hints',async()=>{
 const server=createServer(),alpha='11111111-1111-4111-a111-111111111111',beta='22222222-2222-4222-a222-222222222222';
 let receive:(t:string)=>void=()=>{},revoked=false;
 const runtime=attachInboxRealtime(server,'http://localhost',async(req,tenant)=>{if(req.headers.cookie!=='test')throw Object.assign(Error(),{status:401});if(revoked||tenant!==alpha)throw Object.assign(Error(),{status:403});return 'session';},{onHint:f=>{receive=f;return()=>{};},close:()=>{}},10000);
 server.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address() as {port:number}).port;
 const open=(tenant=alpha,cookie='test',origin='http://localhost')=>new WebSocket(`ws://127.0.0.1:${port}/api/v1/inbox-realtime?tenant_id=${tenant}`,'crm.inbox.v1',{headers:{cookie,origin}});
 const clients:WebSocket[]=[];
 try{
  const ws=open();clients.push(ws);const frames:string[]=[];ws.on('message',raw=>frames.push(raw.toString()));await once(ws,'message');
  expect(JSON.parse(frames[0]!)).toEqual({version:1,type:'ready'});receive(beta);await new Promise(r=>setTimeout(r,300));expect(frames).toHaveLength(1);
  const changed=once(ws,'message');receive(alpha);await changed;expect(JSON.parse(frames[1]!)).toEqual({version:1,type:'invalidate'});
  const bad=open(beta);clients.push(bad);expect((await once(bad,'close'))[0]).toBe(4403);
  const anon=open(alpha,'');clients.push(anon);expect((await once(anon,'close'))[0]).toBe(4401);
  const foreign=open(alpha,'test','http://evil.example');clients.push(foreign);await expect(once(foreign,'open')).rejects.toThrow();
  const closed=once(ws,'close');revoked=true;receive(alpha);expect((await closed)[0]).toBe(4403);expect(frames).toHaveLength(2);
 }finally{for(const ws of clients)ws.terminate();runtime.close();await new Promise<void>(r=>server.close(()=>r()));}
});
