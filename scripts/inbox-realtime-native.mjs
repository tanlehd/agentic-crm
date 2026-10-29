// Read-only native socket authorization probes against retained synthetic session.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{WebSocket}=require('ws');
const s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8')),h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
async function probe({cookie=s.cookie,scope=tenant,origin='http://localhost:18080',send=false}={}){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket('ws://127.0.0.1:13001/api/v1/inbox-realtime?tenant_id='+scope,'crm.inbox.v1',{headers:{Cookie:cookie,Origin:origin}}),timer=setTimeout(()=>{ws.terminate();reject(Error('SOCKET_PROBE_TIMEOUT'));},10000);
  let ready=false;ws.on('error',()=>{});ws.on('unexpected-response',(_req,res)=>{clearTimeout(timer);res.resume();ws.terminate();resolve({http:res.statusCode});});
  ws.on('message',raw=>{assert.deepEqual(JSON.parse(raw.toString()),{version:1,type:'ready'});ready=true;if(send)ws.send('{}');else ws.close();});
  ws.on('close',code=>{clearTimeout(timer);resolve({code,ready});});
 });
}
const results={authorized:await probe(),anonymous:await probe({cookie:''}),wrongTenant:await probe({scope:'11111111-1111-4111-a111-111111111111'}),foreignOrigin:await probe({origin:'http://invalid.example'}),clientData:await probe({send:true})};
assert.equal(results.authorized.ready,true);assert.equal(results.anonymous.code,4401);assert.equal(results.wrongTenant.code,4403);assert.equal(results.foreignOrigin.http,403);assert.equal(results.clientData.code,1008);
await writeFile('artifacts/inbox-realtime/native-socket.json',JSON.stringify({status:'PASS',results},null,2));console.log(JSON.stringify({status:'PASS',checks:5}));
