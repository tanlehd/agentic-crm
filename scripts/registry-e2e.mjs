import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN;
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('artifacts/SRC-010',{recursive:true});
const browser=await chromium.launch({channel:process.env.E2E_BROWSER_CHANNEL??'chrome',headless:true});
const contexts=[];let stage='startup';
try{
  for(const user of ['alpha_admin','beta_admin','read_only']){
    stage=`login ${user}`;
    const context=await browser.newContext();contexts.push(context);context.setDefaultTimeout(15000);
    assert.equal((await context.request.get(origin+'/api/v1/object-types')).status(),401);
    const page=await context.newPage();await page.goto(origin);await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();
    await page.locator('#password').waitFor();await page.locator('#username').fill(user);await page.locator('#password').fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.locator('#kc-login').click();await page.waitForURL(origin+'/');
    await page.getByLabel('Chọn tổ chức',{exact:true}).waitFor();
    const response=await context.request.get(origin+'/api/v1/me/memberships');assert.equal(response.status(),200);
    const memberships=(await response.json()).data;assert.equal(memberships.length,user==='read_only'?2:1);
    for(const member of memberships){
      stage=`registry ACL ${user}`;
      // Fixture v2 intentionally preserves Identity roles. No schema.read grant
      // means metadata remains forbidden even to a Human with an admin seat.
      for(const route of ['object-types','association-types'])assert.equal((await context.request.get(`${origin}/api/v1/${route}`,{headers:{'X-Tenant-Id':member.tenant_id}})).status(),403);
    }
    assert.equal((await context.request.get(origin+'/api/v1/object-types',{headers:{'X-Tenant-Id':'01900000-0000-7000-8000-000000000001'}})).status(),403);
    console.log(`PASS: ${user} real OIDC, tenant membership and registry denied without schema grants.`);
  }
  console.log(`PASS: SRC-010 preview route/session/ACL smoke; Chrome ${browser.version()}, driver ${process.version}. Positive registry CRUD uses isolated MySQL HTTP suite.`);
}catch{console.error(`FAIL: registry browser smoke at ${stage}; sensitive details suppressed.`);process.exitCode=1;}
finally{for(const context of contexts)await context.close();await browser.close();}
