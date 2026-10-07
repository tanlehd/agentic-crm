import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fixtureId } from '../apps/backend/dist/modules/identity/seed.js';
import { randomUUID } from 'node:crypto';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN;
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('artifacts/SRC-038',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
 for(const user of ['alpha_admin','read_only']){
  const context=await browser.newContext({viewport:{width:1360,height:900}}),page=await context.newPage();
  const legacy=[];page.on('request',r=>{if(r.url().includes('/identity/')||r.url().includes('/auth/callback'))legacy.push(true);});
  await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').waitFor();
  if(user==='alpha_admin'){await page.screenshot({path:'artifacts/SRC-038/login-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/SRC-038/login-mobile.png'});await page.setViewportSize({width:1360,height:900});}
  await page.getByLabel('Tên đăng nhập').fill(user);await page.getByLabel('Mật khẩu',{exact:true}).fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.waitForURL(origin+'/',{timeout:30000});
  const response=await context.request.get(origin+'/auth/session');assert.equal(response.status(),200);
  if(user==='alpha_admin'&&process.argv.includes('--restart')){
   const monitor='http://127.0.0.1:3020',token=/const token='([a-f0-9]+)'/.exec(await(await fetch(monitor)).text())[1];
   for(const action of ['stop','start'])assert.equal((await fetch(`${monitor}/service/api/${action}`,{method:'POST',headers:{Origin:monitor,'X-Local-Token':token}})).status,200);
   let recovered=false;for(let attempt=0;attempt<60;attempt++){try{if((await context.request.get(origin+'/auth/session')).status()===200){recovered=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert(recovered,'MySQL session must survive API restart');
  }
  const members=await context.request.get(origin+'/api/v1/me/memberships');assert.equal(members.status(),200);
  const selector=page.getByLabel('Chọn tổ chức');await selector.waitFor();
  const options=await selector.locator('option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>({value:n.value,text:n.textContent})));
  assert.equal(options.length,user==='read_only'?2:1);
  for(const option of options){await selector.selectOption(option.value);assert.equal(await selector.inputValue(),option.value);assert.equal((await context.request.get(origin+'/api/v1/admin/teams?limit=1',{headers:{'X-Tenant-Id':option.value}})).status(),user==='read_only'?403:200);}
  if(user==='alpha_admin')assert.equal((await context.request.get(origin+'/api/v1/admin/teams?limit=1',{headers:{'X-Tenant-Id':fixtureId('clinic_beta')}})).status(),403);
  assert.equal((await context.request.post(origin+'/auth/password/reset-request',{headers:{Origin:origin},data:{login_key:'unknown_test_user'}})).status(),503);
  assert.equal((await context.request.post(origin+'/auth/password/reset-request',{headers:{Origin:origin},data:{login_key:'!'}})).status(),400);
  assert.equal(legacy.length,0);assert.equal((await context.request.get(origin+'/auth/callback')).status(),410);
  assert.equal((await context.request.get(origin+'/auth/login?return_to=https://foreign.invalid/',{maxRedirects:0})).status(),400);
  assert.equal((await context.request.post(origin+'/auth/logout',{headers:{Origin:origin}})).status(),403);
  const csrf=await(await context.request.get(origin+'/auth/csrf')).json();
  const write={headers:{Origin:origin,'X-CSRF-Token':csrf.data.csrf_token,'X-Tenant-Id':options[0].value,'Idempotency-Key':randomUUID()},data:{name:'Native QA '+randomUUID(),purpose:'general'}};
  const mutation=await context.request.post(origin+'/api/v1/admin/teams',write);assert.equal(mutation.status(),user==='alpha_admin'?201:403);
  if(user==='alpha_admin'){const replay=await context.request.post(origin+'/api/v1/admin/teams',write);assert.equal(replay.status(),201);assert.deepEqual(await replay.json(),await mutation.json());}
  assert.equal((await context.request.post(origin+'/auth/logout',{headers:{Origin:origin,'X-CSRF-Token':csrf.data.csrf_token}})).status(),204);
  assert.equal((await context.request.get(origin+'/auth/session')).status(),401);
  results.push({user,result:'PASS',memberships:options.length,legacyRequests:0});await context.close();
 }
 await writeFile('artifacts/SRC-038/browser.json',JSON.stringify({results,apiRestartChecked:process.argv.includes('--restart'),domainWriteAndReplay:true,viewerWriteDenied:true},null,2));console.log('PASS native browser login, tenant permissions/write/replay, CSRF, logout and no provider requests');
}finally{await browser.close();}
