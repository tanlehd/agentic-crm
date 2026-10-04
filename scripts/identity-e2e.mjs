import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN;
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const source=await readFile('scripts/identity-runtime-fixture.mjs','utf8');
function runtime(input){const child=spawnSync('docker',['compose','run','--rm','--no-deps','-T','-e','APP_ENV=development','migrate','node','--input-type=module','-e',source],{input:JSON.stringify(input),encoding:'utf8',timeout:20000});assert.equal(child.status,0,'synthetic runtime fixture');return JSON.parse(child.stdout);}
const artifactDir=process.env.E2E_ARTIFACT_DIR??'artifacts/SRC-007';
await mkdir(artifactDir,{recursive:true});
const browser=await chromium.launch({channel:process.env.E2E_BROWSER_CHANNEL??'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1360,height:1100}}),page=await context.newPage();
let fixtures=[];
try{
  await page.goto(origin);await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();
  await page.locator('#password').waitFor();if(await page.locator('#username').isVisible())await page.locator('#username').fill('auth_demo');
  await page.locator('#password').fill(env.AUTH_DEMO_PASSWORD);await page.locator('#kc-login').click();await page.waitForURL(origin+'/');
  await page.getByText('Đã đăng nhập: Auth Demo',{exact:true}).waitFor();
  const account=(await (await context.request.get(origin+'/auth/session')).json()).data.account_id;
  fixtures=runtime({action:'create',account});await page.reload();
  const select=page.getByLabel('Chọn tổ chức',{exact:true});await select.waitFor();
  for(const [index,label] of ['Alpha','Beta'].entries()){
    const responsePromise=page.waitForResponse(response=>response.url().includes('/api/v1/admin/teams?limit=1'));
    await select.selectOption(fixtures[index].tenant);const response=await responsePromise;
    assert.equal(response.status(),200);assert.equal(response.request().headers()['x-tenant-id'],fixtures[index].tenant);
    const data=(await response.json()).data;assert(data.every(team=>team.tenant_id===fixtures[index].tenant));assert.equal(data[0].name,label);
    await page.getByText('Đã kết nối tổ chức. Bạn có quyền xem danh sách nhóm quản trị.',{exact:true}).waitFor();
  }
  console.log('PASS: real OIDC session switches Alpha/Beta through UI and tenant-scoped API');
  const csrf=(await (await context.request.get(origin+'/auth/csrf')).json()).data.csrf_token;
  const headers={Origin:origin,'X-CSRF-Token':csrf,'X-Tenant-Id':fixtures[0].tenant,'Idempotency-Key':randomUUID()};
  const path=origin+'/api/v1/admin/teams';
  const first=await context.request.post(path,{headers,data:{name:'Synthetic new team',purpose:'general'}});assert.equal(first.status(),201);
  const replay=await context.request.post(path,{headers,data:{purpose:'general',name:'Synthetic new team'}});assert.equal(replay.status(),201);assert.deepEqual(await replay.json(),await first.json());
  assert.equal((await context.request.post(path,{headers:{...headers,Origin:'http://evil.invalid'},data:{name:'Rejected',purpose:'general'}})).status(),403);
  assert.equal((await context.request.patch(`${path}/${fixtures[1].team}`,{headers:{...headers,'If-Match':'"1"'},data:{active:false}})).status(),404);
  const last=await context.request.patch(`${origin}/api/v1/admin/memberships/${fixtures[0].member}`,{headers:{...headers,'If-Match':'"1"'},data:{status:'suspended'}});assert.equal(last.status(),409);assert.equal((await last.json()).error.code,'LAST_ADMIN_REQUIRED');
  const revision=await context.request.patch(`${origin}/api/v1/admin/memberships/${fixtures[0].member}`,{headers:{...headers,'Idempotency-Key':randomUUID(),'If-Match':'"1"'},data:{seat_code:'admin'}});assert.equal(revision.status(),200);
  let delivered=false;
  for(let attempt=0;attempt<15;attempt++){
    const rows=runtime({action:'delivery-status',tenant:fixtures[0].tenant});
    if(rows.length>0&&rows.every(row=>row.status==='dispatched'&&Number(row.consumed)===1)){delivered=true;break;}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert(delivered,'real worker dispatches Identity outbox and commits inbox');
  console.log('PASS: real worker relay/inbox after authorized Identity mutation');
  runtime({action:'suspend',fixtures:[fixtures[0]]});
  assert.equal((await context.request.get(path,{headers:{'X-Tenant-Id':fixtures[0].tenant}})).status(),403);
  assert.equal((await context.request.get(path,{headers:{'X-Tenant-Id':fixtures[1].tenant}})).status(),200);
  const mine=await (await context.request.get(origin+'/api/v1/me/memberships')).json();assert(!mine.data.some(m=>m.tenant_id===fixtures[0].tenant));
  console.log('PASS: CSRF, cross-tenant reference denial, idempotency replay, last-admin and live membership revoke');
  await page.screenshot({path:`${artifactDir}/tenant-switch.png`,fullPage:true});
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByRole('link',{name:'Đăng nhập',exact:true}).waitFor();
  assert.equal((await context.request.get(origin+'/api/v1/me/memberships')).status(),401);
  console.log(`PASS: SRC-007 browser E2E; Chrome ${browser.version()}; driver ${process.version}`);
}catch{
  console.error('FAIL: SRC-007 browser E2E; sensitive assertion details suppressed.');process.exitCode=1;
}finally{
  if(fixtures.length){try{runtime({action:'cleanup',fixtures});console.log('PASS: synthetic tenant fixture cleanup');}catch{console.error('FAIL: synthetic fixture cleanup');process.exitCode=1;}}
  await context.close();await browser.close();
}
