import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {chromium,expect as baseExpect} from '@playwright/test';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
const expect=baseExpect.configure({timeout:30000}),env=parseEnv(await readFile('.env','utf8')),origin='http://localhost:18080',tenant=fixtureId('clinic_alpha'),dir='artifacts/external-conversations',name='Synthetic External Conversations browser';
assert.equal(env.APP_ORIGIN,origin);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
const button=(name,root=page)=>root.getByRole('button',{name,exact:true});
let token;
try{
 await page.goto(origin+'/developer');await expect(page.getByRole('heading',{name:'Conversation & messages',exact:true})).toBeVisible();checks.push('public docs explain Conversation/message scopes and limits');
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await button('Đăng nhập').click();await page.waitForURL(origin+'/');await page.goto(origin+'/developer');await page.getByLabel('Developer workspace').selectOption(tenant);await expect(button('+ Tạo private app')).toBeEnabled();
 const listed=await page.request.get(origin+'/api/v1/external-apps',{headers:{'X-Tenant-Id':tenant}});assert.equal(listed.status(),200);const existing=(await listed.json()).data.find(x=>x.name===name&&x.status!=='revoked');
 const card=page.locator('.dev-app').filter({has:page.getByRole('heading',{name,exact:true})});
 if(existing){if(existing.status==='disabled'){await button('Enable',card).click();await expect(card.locator('.dev-status')).toHaveText('active');}await button('Sửa quyền',card).click();}else await button('+ Tạo private app').click();
 const editor=page.locator('.dev-editor');await editor.getByLabel('Tên app',{exact:true}).fill(name);await editor.getByLabel('Mô tả',{exact:true}).fill('Synthetic retained fixture; disabled after verification.');
 const parent=editor.locator('fieldset').filter({has:page.locator('code').getByText('conversations.read',{exact:true})}),message=editor.locator('fieldset').filter({has:page.locator('code').getByText('conversations.messages.read',{exact:true})});
 await parent.locator('legend input').uncheck();await message.locator('legend input').check();await message.getByRole('checkbox',{name:/text · string/}).check();await expect(button('Lưu app & quyền truy cập')).toBeDisabled();checks.push('UI blocks standalone message grant');
 await parent.locator('legend input').check();await parent.getByRole('checkbox',{name:/status · string/}).check();await expect(button('Lưu app & quyền truy cập')).toBeEnabled();
 assert.equal(await page.getByLabel('New app token').count(),0);await page.screenshot({path:dir+'/grant-editor.png',fullPage:true});await button('Lưu app & quyền truy cập').click();await expect(editor).toHaveCount(0);await expect(card.getByText('conversations.messages.read',{exact:true})).toBeVisible();checks.push('native admin saves distinct Conversation and sensitive text grants');
 await page.getByLabel('Token lifetime days').fill('1');await card.getByRole('button',{name:/^(Generate|Rotate) token$/}).click();await expect(page.getByLabel('New app token')).toBeVisible();token=await page.getByLabel('New app token').inputValue();await button('Đã lưu — ẩn token').click();await expect(page.getByLabel('New app token')).toHaveCount(0);
 const api=async(path,status=200,credential=token)=>{const r=await fetch(origin+'/api/v1/external'+path,{headers:{Authorization:'Bearer '+credential}});assert.equal(r.status,status,path);return r.json();};
 const list=await api('/conversations?limit=10');assert(list.data.length);for(const c of list.data)assert.deepEqual(Object.keys(c.properties),['status']);
 const conversation=list.data[0];await api('/conversations/'+conversation.id);const messages=await api('/conversations/'+conversation.id+'/messages');assert(messages.data.length);for(const m of messages.data)assert.deepEqual(Object.keys(m.properties),['text']);await api('/conversations/'+conversation.id+'/messages/'+messages.data[0].id);
 const spec=await(await fetch(origin+'/api/v1/external/openapi.json')).json();assert.equal(spec.info.version,'1.1.0');assert(spec.paths['/external/conversations/{id}/messages/{messageId}']);checks.push('managed local API serves four Conversation/message routes and OpenAPI1.1');
 await button('Sửa quyền',card).click();await message.getByRole('checkbox',{name:/text · string/}).uncheck();await message.getByRole('checkbox',{name:/status · string/}).check();await button('Lưu app & quyền truy cập').click();await expect(editor).toHaveCount(0);const restricted=await api('/conversations/'+conversation.id+'/messages');assert(restricted.data.every(x=>Object.keys(x.properties).join(',')==='status'));checks.push('removing text selection takes effect on existing token immediately');
 await button('Disable',card).click();await expect(card.locator('.dev-status')).toHaveText('disabled');await api('/conversations',401);token=undefined;
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.getByLabel('New app token').count(),0);if(width===390)await page.screenshot({path:dir+'/mobile.png',fullPage:true});}
 assert.deepEqual(errors,[]);assert(await page.evaluate(()=>!Object.values(localStorage).concat(Object.values(sessionStorage)).some(v=>/eapi_[0-9a-f-]{36}_/.test(v))));checks.push('desktop/mobile layout, no browser errors or token storage; app retained disabled');
 await writeFile(dir+'/browser.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks,screenshots:['grant-editor.png','mobile.png']},null,2));console.log('PASS '+checks.length+' browser/live HTTP groups');
}finally{
 token=undefined;
 try{const r=await page.request.get(origin+'/api/v1/external-apps',{headers:{'X-Tenant-Id':tenant}});if(r.ok()){const app=(await r.json()).data.find(x=>x.name===name&&x.status==='active');if(app){const csrf=(await(await page.request.get(origin+'/auth/csrf')).json()).data.csrf_token;const result=await page.request.patch(origin+'/api/v1/external-apps/'+app.id,{headers:{'X-Tenant-Id':tenant,'X-CSRF-Token':csrf,Origin:origin,'If-Match':'"'+app.version+'"'},data:{name:app.name,description:app.description,grants:app.grants,status:'disabled'}});assert.equal(result.status(),200);}}}finally{await browser.close();}
}
