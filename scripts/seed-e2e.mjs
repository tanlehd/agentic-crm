import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN;
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('artifacts/SRC-009',{recursive:true});
const browser=await chromium.launch({channel:process.env.E2E_BROWSER_CHANNEL??'chrome',headless:true});
const contexts=[];let stage='browser startup';
async function login(user){
  stage=`OIDC login ${user}`;console.log(`CHECK: ${stage}`);
  const context=await browser.newContext({viewport:{width:1360,height:900}});contexts.push(context);context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(20000);
  const page=await context.newPage();await page.goto(origin);await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();
  await page.locator('#password').waitFor();await page.locator('#username').fill(user);await page.locator('#password').fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.locator('#kc-login').click();stage=`OIDC callback ${user}`;await page.waitForURL(origin+'/');
  await page.getByLabel('Chọn tổ chức',{exact:true}).waitFor();
  stage=`membership list ${user}`;
  const response=await context.request.get(origin+'/api/v1/me/memberships');assert.equal(response.status(),200);
  console.log(`PASS: login ${user}`);
  return {context,page,memberships:(await response.json()).data};
}
try{
  const alpha=await login('alpha_admin'), beta=await login('beta_admin');
  stage='admin membership isolation';
  assert.equal(alpha.memberships.length,1);assert.equal(beta.memberships.length,1);
  const a=alpha.memberships[0].tenant_id,b=beta.memberships[0].tenant_id;assert.notEqual(a,b);
  for(const [session,own,other] of [[alpha,a,b],[beta,b,a]]){
    stage=`tenant UI ${own===a?'Alpha':'Beta'}`;
    const [ready]=await Promise.all([session.page.waitForResponse(r=>r.url().includes('/api/v1/admin/teams?limit=1')),session.page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(own)]);
    assert.equal(ready.status(),200);
    const ownTeams=await session.context.request.get(origin+'/api/v1/admin/teams',{headers:{'X-Tenant-Id':own}});assert.equal(ownTeams.status(),200);
    assert.deepEqual((await ownTeams.json()).data.map(t=>t.name).sort(),['Intake','Sales']);
    assert.equal((await session.context.request.get(origin+'/api/v1/admin/teams',{headers:{'X-Tenant-Id':other}})).status(),403);
    await session.page.screenshot({path:`artifacts/SRC-009/${own===a?'alpha':'beta'}-login.png`,fullPage:true});
  }
  stage='cross-tenant mutation';
  const betaTeams=(await (await beta.context.request.get(origin+'/api/v1/admin/teams',{headers:{'X-Tenant-Id':b}})).json()).data;
  const csrf=(await (await alpha.context.request.get(origin+'/auth/csrf')).json()).data.csrf_token;
  const rejected=await alpha.context.request.patch(`${origin}/api/v1/admin/teams/${betaTeams[0].id}`,{headers:{Origin:origin,'X-CSRF-Token':csrf,'X-Tenant-Id':a,'If-Match':`"${betaTeams[0].version}"`,'Idempotency-Key':randomUUID()},data:{active:false}});assert.equal(rejected.status(),404);
  const unchanged=(await (await beta.context.request.get(origin+'/api/v1/admin/teams',{headers:{'X-Tenant-Id':b}})).json()).data;assert.deepEqual(unchanged,betaTeams);
  const viewer=await login('read_only');stage='viewer membership count';assert.equal(viewer.memberships.length,2);
  for(const tenant of [a,b]){
    stage=`viewer tenant UI ${tenant===a?'Alpha':'Beta'}`;
    const [response]=await Promise.all([viewer.page.waitForResponse(r=>r.url().includes('/api/v1/admin/teams?limit=1')),viewer.page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant)]);
    assert.equal(response.status(),403);
    await viewer.page.getByText('Tổ chức đã chọn. Bạn chưa có quyền xem danh sách nhóm quản trị.',{exact:true}).waitFor();
  }
  for(const user of ['chat_anna','sales_binh','sales_chi']){const session=await login(user);assert.equal(session.memberships.length,1);assert.equal(session.memberships[0].tenant_id,a);}
  console.log(`PASS: all six seeded users real OIDC login; Alpha/Beta admin UI, shared viewer, foreign tenant 403, foreign team mutation 404 and Beta unchanged. Chrome ${browser.version()}; driver ${process.version}`);
}catch(error){
  console.error(JSON.stringify({errorCode:error.code,actual:typeof error.actual==='number'?error.actual:undefined,expected:typeof error.expected==='number'?error.expected:undefined}));
  console.error(`FAIL: SRC-009 seed browser checks at ${stage}; sensitive details suppressed.`);
  for(const context of contexts)for(const page of context.pages())console.error(JSON.stringify({path:new URL(page.url()).pathname,idpError:await page.locator('#input-error').count(),inputIds:await page.locator('input').evaluateAll(inputs=>inputs.map(i=>i.id)),selectCount:await page.locator('select').count()}));
  process.exitCode=1;
}
finally{for(const context of contexts)await context.close();await browser.close();}
