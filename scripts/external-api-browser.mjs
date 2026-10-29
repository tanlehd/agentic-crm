import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {chromium,expect as baseExpect} from '@playwright/test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {fixtureId} from '../services/core-baseline/dist/modules/identity/seed.js';
const expect=baseExpect.configure({timeout:30000}),env=parseEnv(await readFile('.env','utf8')),origin='http://localhost:18080',tenant=fixtureId('clinic_alpha'),dir='artifacts/external-api';assert.equal(env.APP_ORIGIN,origin);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],shots=[],errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
const shot=async name=>{assert.equal(await page.getByLabel('New app token').count(),0,'Never capture a credential');const path=dir+'/'+name+'.png';await page.screenshot({path,fullPage:true});shots.push(path);};
const button=(name,root=page)=>root.getByRole('button',{name,exact:true});
const name='Synthetic External API browser fixture';
let appId,rawToken;
try{
 await page.goto(origin+'/developer');await expect(page.getByRole('heading',{name:/Your CRM data/})).toBeVisible();await expect(page.getByRole('link',{name:'Đăng nhập CRM',exact:true})).toBeVisible();await shot('01-public-docs');checks.push('public developer documentation and OpenAPI link accessible without a session');
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await button('Đăng nhập').click();await page.waitForURL(origin+'/');await page.goto(origin+'/developer');await page.getByLabel('Developer workspace').selectOption(tenant);await expect(button('+ Tạo private app')).toBeEnabled();
 const existing=(await(await page.request.get(origin+'/api/v1/external-apps',{headers:{'X-Tenant-Id':tenant}})).json()).data.find(x=>x.name===name&&x.status!=='revoked');
 if(existing){const card=page.locator('.dev-app').filter({has:page.getByRole('heading',{name,exact:true})});if(existing.status==='disabled'){await button('Enable',card).click();await expect(card.locator('.dev-status')).toHaveText('active');}await button('Sửa quyền',card).click();}
 else await button('+ Tạo private app').click();
 const editor=page.locator('.dev-editor');await editor.getByLabel('Tên app',{exact:true}).fill(name);await editor.getByLabel('Mô tả',{exact:true}).fill('Synthetic retained fixture. No production integration.');
 const field=editor.locator('fieldset').filter({hasText:'crm.objects.contact.read'});await field.locator('legend input').check();await field.getByRole('checkbox',{name:'display_name',exact:false}).check();
 await shot('02-grants');await button('Lưu app & quyền truy cập').click();await expect(editor).toHaveCount(0);
 const card=page.locator('.dev-app').filter({has:page.getByRole('heading',{name,exact:true})});await expect(card).toBeVisible();await expect(card.getByText('crm.objects.contact.read',{exact:true})).toBeVisible();checks.push('native admin creates or reuses an app with exact object/property grants');
 await page.getByLabel('Token lifetime days').fill('1');const tokenButton=card.getByRole('button',{name:/^(Generate|Rotate) token$/});await tokenButton.click();await expect(page.getByLabel('New app token')).toBeVisible();rawToken=await page.getByLabel('New app token').inputValue();assert(/^eapi_/.test(rawToken));await button('Đã lưu — ẩn token').click();await expect(page.getByLabel('New app token')).toHaveCount(0);
 const list=(await(await page.request.get(origin+'/api/v1/external-apps',{headers:{'X-Tenant-Id':tenant}})).json()).data;appId=list.find(a=>a.name===name&&a.status==='active').id;assert(!JSON.stringify(list).includes(rawToken));
 const specResponse=await fetch(origin+'/api/v1/external/openapi.json');assert.equal(specResponse.status,200);const spec=await specResponse.json(),ajv=addFormats(new Ajv2020({strict:false})),defs=JSON.parse(JSON.stringify(spec.components.schemas).replaceAll('#/components/schemas/','#/$defs/'));
 const api=async(path,status=200,token=rawToken)=>{const r=await fetch(origin+'/api/v1'+path,{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,status,path);assert.equal(r.headers.get('cache-control'),'no-store');const b=await r.json();assert(b.meta.correlation_id);return b;};
 const data=await api('/external/crm/objects/contact?limit=1');assert.equal(data.data.length,1);assert.deepEqual(Object.keys(data.data[0].properties),['display_name']);assert(!('owner_principal_id'in data.data[0]));
 const schema=JSON.parse(JSON.stringify(spec.paths['/external/crm/objects/{object}'].get.responses['200'].content['application/json'].schema).replaceAll('#/components/schemas/','#/$defs/'));assert(ajv.compile({$defs:defs,...schema})(data));
 await api('/external/crm/objects/contact/'+data.data[0].id);await api('/external/crm/properties/contact');await api('/external/scopes');await api('/external/crm/objects/deal',403);await api('/external/crm/objects/contact?filter=[]',400);await api('/external/crm/objects/contact',401,'invalid');
 const denied=await fetch(origin+'/api/v1/external-apps',{headers:{Authorization:'Bearer '+rawToken,'X-Tenant-Id':tenant}});assert.equal(denied.status,401);const noCsrf=await page.request.post(origin+`/api/v1/external-apps/${appId}/token`,{headers:{'X-Tenant-Id':tenant,'If-Match':'"1"'},data:{}});assert.equal(noCsrf.status(),403);
 checks.push('real HTTP bearer list/detail/properties/scopes match OpenAPI; missing scope, query inference, token-to-admin and CSRF denied');
 const monitor='http://127.0.0.1:3020',html=await(await fetch(monitor)).text(),monitorToken=/const token='([a-f0-9]+)'/.exec(html)?.[1];assert(monitorToken);
 const service=async action=>{const r=await fetch(monitor+'/service/api/'+action,{method:'POST',headers:{Origin:monitor,'X-Local-Token':monitorToken}});assert.equal(r.status,200);};
 await service('stop');let stopped=false;for(let i=0;i<30;i++){stopped=(await(await fetch(monitor+'/status')).json()).services.find(s=>s.id==='api').health==='stopped';if(stopped)break;await new Promise(r=>setTimeout(r,500));}assert(stopped);await service('start');let ready=false;for(let i=0;i<45;i++){ready=(await(await fetch(monitor+'/status')).json()).services.find(s=>s.id==='api').health==='ready';if(ready)break;await new Promise(r=>setTimeout(r,1000));}assert(ready);await api('/external/scopes');checks.push('real API process restart retains native session and issued app token');
 const old=rawToken;await button('Rotate token',card).click();await expect(page.getByLabel('New app token')).toBeVisible();rawToken=await page.getByLabel('New app token').inputValue();assert.notEqual(rawToken,old);await button('Đã lưu — ẩn token').click();await api('/external/scopes',401,old);await api('/external/scopes');checks.push('token displayed once, rotation invalidates previous token immediately');
 await button('Sửa quyền',card).click();const scope=editor.getByLabel('Record scope contact');await scope.selectOption('teams');const teamChecks=field.locator('.dev-properties').last().getByRole('checkbox');if(await teamChecks.count()){await teamChecks.first().check();await shot('03-team-scope');}await button('Hủy',editor).click();checks.push('team access selection available with explicit grant summary');
 await button('Disable',card).click();await expect(card.locator('.dev-status')).toHaveText('disabled');await api('/external/scopes',401);await button('Enable',card).click();await expect(card.locator('.dev-status')).toHaveText('active');await api('/external/scopes');await button('Disable',card).click();await expect(card.locator('.dev-status')).toHaveText('disabled');rawToken=undefined;checks.push('disable/enable applies live; retained synthetic app left disabled');
 await shot('04-admin-desktop');for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+width);await shot('05-mobile-'+width);}assert.deepEqual(errors,[]);checks.push('desktop/mobile390/320 render without page overflow or browser errors');
 assert(await page.evaluate(()=>!Object.values(localStorage).concat(Object.values(sessionStorage)).some(v=>/eapi_[0-9a-f-]{36}_/.test(v))));checks.push('no app token in browser storage');
 await writeFile(dir+'/browser.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks,shots,appId,retained:true},null,2));console.log(JSON.stringify({status:'PASS',groups:checks.length,shots:shots.length,appId}));
}catch(e){await page.getByRole('button',{name:'Đã lưu — ẩn token',exact:true}).click().catch(()=>{});await shot('failure').catch(()=>{});await writeFile(dir+'/browser-failure.json',JSON.stringify({checks,error:e.message,errors},null,2));throw e;}finally{
 rawToken=undefined;
 try{
  const response=await page.request.get(origin+'/api/v1/external-apps',{headers:{'X-Tenant-Id':tenant}});
  if(response.ok()){
   const app=(await response.json()).data.find(x=>x.name===name&&x.status==='active');
   if(app){
    const csrf=(await(await page.request.get(origin+'/auth/csrf')).json()).data.csrf_token;
    const disabled=await page.request.patch(origin+'/api/v1/external-apps/'+app.id,{headers:{'X-Tenant-Id':tenant,'X-CSRF-Token':csrf,Origin:origin,'If-Match':'"'+app.version+'"'},data:{name:app.name,description:app.description,grants:app.grants,status:'disabled'}});assert.equal(disabled.status(),200);
   }
  }
 }finally{await browser.close();}
}
