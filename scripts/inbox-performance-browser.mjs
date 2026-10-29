// Existing synthetic session; read-only UI navigation and filter checks, no sends or seed/reset.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000}),s=JSON.parse(await readFile('.local/chat-main/smoke-beta-stable.private.json','utf8'));
const h=createHash('sha256').update('agentic-crm:identity-fixture:v1:clinic_beta').digest('hex'),tenant=`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),requests=[],starts=new Map();
const split=s.cookie.indexOf('=');await context.addCookies([{name:s.cookie.slice(0,split),value:s.cookie.slice(split+1),domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
page.on('request',r=>starts.set(r,performance.now()));page.on('response',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))requests.push({path:url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g,':id'),status:r.status(),ms:Math.round(performance.now()-(starts.get(r.request())??performance.now()))});});
const errors=[];page.on('pageerror',e=>errors.push(e.name));
try{
 await page.goto('http://localhost:18080/?screen=chat');await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);
 await page.getByRole('navigation',{name:'Menu ứng dụng'}).getByRole('button',{name:'Inbox',exact:true}).click();
 await expect(page.locator('.inbox-conversation').first()).toBeVisible();
 const initialChannels=requests.filter(r=>r.path==='/api/v1/conversation-channels').length;
 await page.locator('.inbox-conversation').first().click();await expect(page.locator('.inbox-message').first()).toBeVisible();
 await page.waitForTimeout(16000);await expect(page.locator('.inbox-message').first()).toBeVisible();
 await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();await expect.poll(()=>requests.filter(r=>r.path==='/api/v1/conversation-channels'&&r.status===200).length).toBeGreaterThan(initialChannels);
 await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
 await page.screenshot({path:'artifacts/inbox-performance/inbox.png'});
 const report={initialChannels,errors,requests};await writeFile('artifacts/inbox-performance/browser.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({errors,requests:requests.length,failures:requests.filter(r=>r.status>=500),initialChannels}));
 if(errors.length||requests.some(r=>r.status>=500)||initialChannels!==0)process.exitCode=1;
}finally{await browser.close();}
