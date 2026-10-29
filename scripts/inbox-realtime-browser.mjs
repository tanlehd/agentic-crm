// Local retained synthetic Beta fixture. Creates one internal note and one mock outbound.
// Never logs cookie, CSRF, message/note text, request bodies or record identifiers.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000}),s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8'));
const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
await page.addInitScript(()=>{const Original=window.WebSocket;window.WebSocket=class extends Original{constructor(...args){super(...args);if(String(args[0]).includes('/api/v1/inbox-realtime'))window.__inboxTestSocket=this;}};});
const split=s.cookie.indexOf('=');await context.addCookies([{name:s.cookie.slice(0,split),value:s.cookie.slice(split+1),domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
let ready=0,invalidations=0;const requests=[],errors=[];
page.on('websocket',ws=>{ws.on('framereceived',frame=>{try{const v=JSON.parse(String(frame.payload));if(v.type==='ready')ready++;if(v.type==='invalidate')invalidations++;}catch{}});});
page.on('response',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/'))requests.push({path:p.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g,':id'),status:r.status()});});page.on('pageerror',e=>errors.push(e.name));
const report={};
try{
 await page.goto('http://localhost:18080/?screen=chat&record='+s.conversation);await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);
 await expect.poll(()=>ready).toBeGreaterThan(0);await expect(page.locator('.inbox-message').first()).toBeVisible();
 await page.waitForTimeout(7000);const before=requests.length;await page.waitForTimeout(20000);report.idleApiRequests=requests.length-before;expect(report.idleApiRequests).toBe(0);
 const draft=page.getByLabel('Nội dung phản hồi',{exact:true});await draft.fill('Synthetic unsent realtime draft');
 const base='http://localhost:18080',headers={'X-Tenant-Id':tenant,Origin:base};
 const detail=await context.request.get(base+'/api/v1/conversations/'+s.conversation,{headers});expect(detail.status()).toBe(200);const record=(await detail.json()).data;
 if(record.channel!=='mock_messenger')throw Error('SYNTHETIC_CHANNEL_REQUIRED');
 const csrf=await context.request.get(base+'/auth/csrf');expect(csrf.status()).toBe(200);headers['X-CSRF-Token']=(await csrf.json()).data.csrf_token;
 const statePath='.local/chat-main/realtime-browser.private.json';
 const state=await readFile(statePath,'utf8').then(JSON.parse).catch(()=>({tag:randomUUID()}));
 await writeFile(statePath,JSON.stringify(state));
 const tag=state.tag,note='Synthetic realtime note '+tag,message='Synthetic realtime mock message '+tag;
 const noteAlreadyVisible=await page.locator('.inbox-note').filter({hasText:note}).count()>0;
 let mark=performance.now(),count=invalidations;
 const noteResponse=await context.request.post(base+'/api/v1/conversations/'+s.conversation+'/notes',{headers:{...headers,'Idempotency-Key':'realtime-note-'+tag},data:{text:note}});report.noteStatus=noteResponse.status();expect(noteResponse.status()).toBe(201);
 if(!noteAlreadyVisible)await expect.poll(()=>invalidations).toBeGreaterThan(count);await expect(page.locator('.inbox-note').filter({hasText:note})).toBeVisible();report.noteVisibleMs=Math.round(performance.now()-mark);report.noteReceiptReplay=noteAlreadyVisible;
 mark=performance.now();count=invalidations;
 const messageAlreadyVisible=await page.locator('.inbox-message').filter({hasText:message}).count()>0;
 state.ownerRevision??=String(record.owner_revision);await writeFile(statePath,JSON.stringify(state));
 const sent=await context.request.post(base+'/api/v1/conversations/'+s.conversation+'/messages',{headers:{...headers,'Idempotency-Key':'realtime-message-'+tag},data:{text:message,owner_revision:state.ownerRevision}});report.messageStatus=sent.status();expect(sent.status()).toBe(202);
 if(!messageAlreadyVisible)await expect.poll(()=>invalidations).toBeGreaterThan(count);await expect(page.locator('.inbox-message').filter({hasText:message})).toHaveCount(1);report.messageVisibleMs=Math.round(performance.now()-mark);report.messageReceiptReplay=messageAlreadyVisible;
 await expect(draft).toHaveValue('Synthetic unsent realtime draft');
 await expect(page.locator('.inbox-message').filter({hasText:message})).toContainText('Đã gửi',{timeout:45000});report.sentStatusVisible=true;
 const local=parseEnv(await readFile('.env','utf8'));if(local.APP_ENV!=='development'||local.MYSQL_DATABASE!=='agentic_crm')throw Error('LOCAL_ONLY');
 const channelHash=createHash('sha256').update('agentic-crm:identity-fixture:v1:beta:mock_connection').digest('hex'),connection=`${channelHash.slice(0,8)}-${channelHash.slice(8,12)}-5${channelHash.slice(13,16)}-a${channelHash.slice(17,20)}-${channelHash.slice(20,32)}`;
 const incoming='Synthetic realtime incoming '+tag;
 state.ingress??={...s.ingress,provider_event_id:'realtime-event-'+tag,provider_message_id:'realtime-incoming-'+tag,occurred_at:new Date().toISOString(),message:{type:'text',text:incoming}};await writeFile(statePath,JSON.stringify(state));
 const inboundAlreadyVisible=await page.locator('.inbox-message').filter({hasText:incoming}).count()>0;
 count=invalidations;mark=performance.now();
 // Credential-only intake intentionally forbids browser cookies/Origin; use an isolated caller.
 const ingress=await fetch(base+'/api/v1/integrations/mock-messenger/deliveries',{method:'POST',headers:{'Content-Type':'application/json','X-Connection-Id':connection,Authorization:'Bearer '+local.MOCK_BETA_TOKEN},body:JSON.stringify(state.ingress),signal:AbortSignal.timeout(20000)});report.ingressStatus=ingress.status;expect(ingress.status).toBe(202);
 if(!inboundAlreadyVisible)await expect.poll(()=>invalidations,{timeout:45000}).toBeGreaterThan(count);
 await expect(page.locator('.inbox-message').filter({hasText:incoming})).toHaveCount(1,{timeout:45000});report.inboundVisibleMs=Math.round(performance.now()-mark);
 await expect(draft).toHaveValue('Synthetic unsent realtime draft');
 const priorReady=ready;await page.evaluate(()=>window.__inboxTestSocket.close());await expect.poll(()=>ready).toBeGreaterThan(priorReady);await expect(draft).toHaveValue('Synthetic unsent realtime draft');report.reconnect=true;
 report.ready=ready;report.invalidations=invalidations;report.errors=errors;report.failures=requests.filter(r=>r.status>=500);report.requests=requests;
 await page.screenshot({path:'artifacts/inbox-realtime/inbox.png'});await writeFile('artifacts/inbox-realtime/browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,requests:requests.length}));expect(errors).toEqual([]);expect(report.failures).toEqual([]);
}catch(error){await writeFile('artifacts/inbox-realtime/browser-failure.json',JSON.stringify({...report,ready,invalidations,errors,requests},null,2));console.error(error.name+': '+error.message.slice(0,400));process.exitCode=1;}finally{await browser.close();}
