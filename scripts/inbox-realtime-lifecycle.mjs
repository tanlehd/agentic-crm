// Read-only browser lifecycle check; no records or session state are mutated.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000}),s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8')),h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext(),page=await context.newPage();
const split=s.cookie.indexOf('=');await context.addCookies([{name:s.cookie.slice(0,split),value:s.cookie.slice(split+1),domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
let ready=0,closed=0,opened=0,requests=0;
page.on('websocket',ws=>{if(!ws.url().includes('/api/v1/inbox-realtime'))return;opened++;ws.on('close',()=>closed++);ws.on('framereceived',f=>{try{if(JSON.parse(String(f.payload)).type==='ready')ready++;}catch{}});});
page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests++;});
try{
 await page.goto('http://localhost:18080/?screen=chat');await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);await expect.poll(()=>ready).toBeGreaterThan(0);await expect(page.locator('.inbox-conversation').first()).toBeVisible();await page.waitForTimeout(5000);
 const beforeClose=closed;await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>closed).toBeGreaterThan(beforeClose);
 await page.waitForTimeout(1000);const hiddenStart=requests,openedStart=opened;await page.waitForTimeout(6500);expect(requests-hiddenStart).toBe(0);expect(opened).toBe(openedStart);
 const beforeReady=ready;await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>ready).toBeGreaterThan(beforeReady);
 const leaveClose=closed;await page.evaluate(()=>{history.pushState(null,'','/?screen=crm');window.dispatchEvent(new PopStateEvent('popstate'));});await expect.poll(()=>closed).toBeGreaterThan(leaveClose);
 const report={status:'PASS',hiddenApiRequests:0,hiddenReconnects:0,visibleReconnect:true,inactiveClosed:true,opened,closed};await writeFile('artifacts/inbox-realtime/lifecycle.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
