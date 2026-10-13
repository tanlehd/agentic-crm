import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { chromium,expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { fixtureId } from '../apps/backend/dist/modules/identity/seed.js';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN,tenant=fixtureId('clinic_alpha');
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('artifacts/acquisition-sessions',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1500,height:950}}),page=await context.newPage(),results=[];
page.setDefaultTimeout(20000);page.on('dialog',d=>d.accept());
try{
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/');await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);

 const headers={'Content-Type':'application/json','X-Connection-Id':fixtureId('alpha:mock_connection'),Authorization:'Bearer '+env.MOCK_ALPHA_TOKEN},subject='session-browser-'+randomUUID(),label='Session '+subject.slice(-8);
 async function incoming(ad){const event=randomUUID(),ack=await fetch(origin+'/api/v1/integrations/mock-messenger/deliveries',{method:'POST',headers,body:JSON.stringify({provider_event_id:event,provider_message_id:event,external_subject_id:subject,display_label:label,occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic session browser'},...(ad?{referral:{source:'ctm',ad_id:ad}}:{})})});assert.equal(ack.status,202);const delivery=(await ack.json()).data.delivery_id;for(let i=0;i<60;i++){const b=await(await fetch(origin+'/api/v1/integrations/deliveries/'+delivery,{headers})).json();if(b.data.status==='processed')return b.data.conversation_id;await new Promise(r=>setTimeout(r,300));}throw Error('DELIVERY_TIMEOUT');}
 const conversation=await incoming('browser-ad-a');assert.equal(await incoming('browser-ad-b'),conversation);
 await page.getByLabel('Tìm tên liên hệ',{exact:true}).fill(label);await page.locator('.inbox-conversation').filter({hasText:label}).click();await page.getByRole('button',{name:'Tạo Lead từ hội thoại',exact:true}).click();const dialog=page.getByRole('dialog');
 const options=await dialog.getByLabel('Phiên tạo nhu cầu',{exact:true}).locator('option').allTextContents();assert(options.some(x=>x.includes('browser-ad-a'))&&options.some(x=>x.includes('browser-ad-b')));
 await dialog.getByLabel('Phiên tạo nhu cầu',{exact:true}).selectOption({index:2});await expect(dialog).toContainText('Ad: browser-ad-a');await dialog.getByRole('button',{name:'Tạo Lead',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Ad: browser-ad-a');await page.screenshot({path:'artifacts/acquisition-sessions/selected-source.png'});await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Đóng phiên hiện tại',exact:true}).click();await expect(page.getByRole('button',{name:'Đóng phiên hiện tại',exact:true})).toHaveCount(0);assert.equal(await incoming(),conversation);
 const response=await page.request.get(origin+'/api/v1/conversations/'+conversation+'/acquisition-sessions',{headers:{'X-Tenant-Id':tenant}});assert.equal(response.status(),200);const body=await response.json(),schema=JSON.parse(await readFile('packages/contracts/schemas/conversation.json','utf8')),ajv=new Ajv({strict:true});addFormats(ajv);const validate=ajv.compile(schema.definitions['conversation-acquisition-sessions']);assert(validate(body),JSON.stringify(validate.errors));const sessions=body.data;assert.equal(sessions.length,3);assert.equal(sessions[0].source_classification,'organic');assert.equal(sessions[1].close_reason,'agent_closed');
 if(await page.getByRole('dialog').count())await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Tạo Lead từ hội thoại',exact:true}).click();await page.getByRole('dialog').getByLabel('Phiên tạo nhu cầu',{exact:true}).selectOption(sessions[0].id);await expect(page.getByRole('dialog')).toContainText('Ad: —');await expect(page.getByRole('dialog').locator('p').filter({hasText:'Page:'})).toContainText('Ad: —');await page.screenshot({path:'artifacts/acquisition-sessions/session-organic-reviewed.png',animations:'disabled'});await writeFile('artifacts/acquisition-sessions/browser.json',JSON.stringify({status:'PASS',conversation,groups:['same-thread A/B picker','closed A source explicit Lead','agent close then organic reopen same thread']},null,2));console.log('PASS session picker, selected closed-source Lead, close and organic reopen');
}catch(e){await page.screenshot({path:'artifacts/acquisition-sessions/failure.png'}).catch(()=>{});throw e;}finally{await browser.close();}
