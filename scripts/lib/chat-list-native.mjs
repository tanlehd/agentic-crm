import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {once} from 'node:events';
import {ChatHistoryBff,createChatHistoryBff} from '../../services/core-baseline/dist/gateway/chat-history-bff.js';
import {HumanDispatchEnrollment} from '../../services/core-baseline/dist/modules/identity/dispatch-enrollment.js';

export async function chatListNative(ctx){
 const {check,operator,chatOperator,tenant,f,ref,fixture,call,peers,request,key,field,setRole,grants}=ctx,id=fixture.rows.map(r=>r.id);
 const signed=(payload,position={time:'2026-10-20 09:59:59.000000',id:'00000000-0000-0000-0000-000000000001'})=>{
  const binding={account:f.account,tenant,id:null,state:payload.state??null,owner:payload.owner??null,team:payload.team??null,...Object.fromEntries(['channel','channel_id','page_id'].filter(k=>payload[k]!==undefined).map(k=>[k,payload[k]]))};
  const raw=Buffer.from(JSON.stringify({binding,position})).toString('base64url');return raw+'.'+createHmac('sha256',key).update(raw).digest('base64url');
 };
 const list=(payload={})=>{const req=request({},'conversation-get-conversations');req.payload={channel_id:ref.connection,limit:5,...payload};req.payload.cursor=payload.cursor??signed(req.payload);return req;};
 const channels=payload=>request(payload??{},'conversation-channels'),bad=(p,code)=>assert.rejects(p,e=>e.code===code);
 await check('Chat list retains opened order closed rows and legacy account cursor across pages',async()=>{
  const all=await call(list());assert.deepEqual(all.data.map(r=>r.id),id);assert.equal(all.data[4].status,'closed');assert.equal(all.data[0].contact.id,ref.contact);assert(all.next_cursor);
  const first=await call(list({limit:2})),second=await call(list({limit:2,cursor:first.next_cursor}));assert.deepEqual(first.data.map(r=>r.id),id.slice(0,2));assert.deepEqual(second.data.map(r=>r.id),id.slice(2,4));
  const decoded=JSON.parse(Buffer.from(first.next_cursor.split('.')[0],'base64url'));assert.equal(decoded.binding.account,f.account);assert.equal(decoded.position.time,'2026-10-20 10:00:01.000000');assert(!('expires' in decoded));
  await bad(call(list({cursor:first.next_cursor+'x'})),'INVALID_CURSOR');await bad(call(list({state:'closed',cursor:first.next_cursor})),'INVALID_CURSOR');
 });
 await check('Chat list exact owner team unassigned Page filters and fresh own rights',async()=>{
  assert.deepEqual((await call(list({owner:'unassigned',limit:2}))).data.map(r=>r.id),id.slice(3,5));assert.equal((await call(list({team:ref.team,limit:1}))).data[0].id,id[2]);
  assert.deepEqual((await call(list({owner:f.principal,limit:2}))).data.map(r=>r.id),id.slice(0,2));assert.deepEqual((await call(list({team:'unassigned',limit:2}))).data.map(r=>r.id),id.slice(0,2));
  const [[connection]]=await operator.execute('SELECT external_account_id FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,ref.connection]);assert.deepEqual((await call(list({page_id:connection.external_account_id}))).data.map(r=>r.id),id);
  await setRole(grants.map(g=>g.resource==='conversation'?{...g,scope:'own'}:g));try{const r=await call(list({limit:2}));assert.deepEqual(r.data.map(r=>r.id),id.slice(0,2));assert(!r.data.some(r=>r.id===id[2]));}finally{await setRole(grants);}
  await field(f.object,'page_id',['filter'],()=>bad(call(list({page_id:connection.external_account_id})),'FIELD_FORBIDDEN'));
 });
 await check('Chat list viewer read preserves redaction while workspace requires chat entitlement',async()=>{
  const [[seat]]=await operator.execute('SELECT seat_code FROM membership WHERE tenant_id=? AND id=?',[tenant,f.member]);await operator.execute("UPDATE membership SET seat_code='viewer' WHERE tenant_id=? AND id=?",[tenant,f.member]);
  try{const r=await call(list());assert(r.data.every(v=>v.allowed_actions.length===0));await bad(call(request()),'FORBIDDEN');}finally{await operator.execute('UPDATE membership SET seat_code=? WHERE tenant_id=? AND id=?',[seat.seat_code,tenant,f.member]);}
  await field(f.object,'text',['read'],async()=>{const r=await call(list());assert(r.data.every(v=>!('text' in v.latest_message)));});
 });
 await check('Chat list Channel options intersect current team rights and disabled metadata',async()=>{
  const [[member]]=await operator.execute('SELECT principal_id FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]),[[connection]]=await operator.execute('SELECT status FROM channel_connection WHERE tenant_id=? AND id=?',[tenant,ref.connection]);
  if(!member)await operator.execute('INSERT INTO team_member(tenant_id,team_id,principal_id) VALUES (?,?,?)',[tenant,ref.team,f.principal]);
  await setRole(grants.map(g=>g.resource==='conversation'?{...g,scope:'team'}:g));await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?",[tenant,ref.connection]);
  try{const r=await call(channels());assert(r.data.some(v=>v.id===ref.connection));assert(r.data.every(v=>!('attribution' in v)));const page=await call(channels({limit:1}));assert.equal(page.data.length,1);await bad(call(channels({cursor:'invalid'})),'INVALID_REQUEST');for(const fieldName of ['channel','channel_id','page_id','channel_name'])await field(f.object,fieldName,['read'],()=>bad(call(channels()),'FIELD_FORBIDDEN'));}finally{await setRole(grants);await operator.execute('UPDATE channel_connection SET status=? WHERE tenant_id=? AND id=?',[connection.status,tenant,ref.connection]);if(!member)await operator.execute('DELETE FROM team_member WHERE tenant_id=? AND team_id=? AND principal_id=?',[tenant,ref.team,f.principal]);}
 });
 await check('Chat list owner outage and concurrent authority snapshot fail closed',async()=>{
  const port=ctx.crmServer.address().port;ctx.crmServer.closeAllConnections();await new Promise(resolve=>ctx.crmServer.close(resolve));try{await bad(call(list()),'DEPENDENCY_UNAVAILABLE');}finally{ctx.crmServer.listen(port,'127.0.0.1');await once(ctx.crmServer,'listening');}
  const contacts=peers.contacts;peers.contacts=async(...a)=>{const r=await contacts(...a);await chatOperator.execute('UPDATE crm_record SET version=version+1 WHERE tenant_id=? AND id=?',[tenant,id[0]]);return r;};try{await bad(call(list()),'STALE_VERSION');}finally{peers.contacts=contacts;}
 });
 await check('Chat list completed native logout fences delayed legacy hydration',async()=>{
  const session=await ctx.login(f.account),enrolled=await new HumanDispatchEnrollment(ctx.ds).enroll(tenant,createHash('sha256').update(session).digest('hex')),req=list();req.actor.delegation_id=enrolled.delegationId;
  const contacts=peers.contacts;peers.contacts=async(...a)=>{const result=await contacts(...a);await ctx.drainingAuth.logout(session,'http://localhost:18080',await ctx.auth.csrf(session));return result;};try{await assert.rejects(call(req),e=>['FORBIDDEN','REVOKED','INVALID_TRANSITION'].includes(e.code));}finally{peers.contacts=contacts;}
 });
 await check('Chat list public collection routes native session no-store strict filters',async()=>{
  const server=createChatHistoryBff(new ChatHistoryBff(ctx.auth,new HumanDispatchEnrollment(ctx.ds),call));ctx.servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,query=new URLSearchParams(Object.entries(list().payload).map(([k,v])=>[k,String(v)])),url=base+'/api/v1/conversations?'+query,headers={'x-tenant-id':tenant,cookie:'crm_session='+ctx.actorSession};
  assert.equal((await fetch(url)).status,400);const response=await fetch(url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual((await response.json()).data.map(r=>r.id),id);
  for(const extra of ['&limit=1','&scope=mine','&fields=text'])assert.equal((await fetch(url+extra,{headers})).status,400);
  assert.equal((await fetch(base+'/api/v1/conversation-channels?cursor=invalid',{headers})).status,400);
 });
}
