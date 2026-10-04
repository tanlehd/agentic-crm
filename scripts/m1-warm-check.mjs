import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN;
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const {facts}=JSON.parse(await readFile('artifacts/SRC-013/browser-facts.json','utf8')),browser=await chromium.launch({channel:process.env.E2E_BROWSER_CHANNEL??'chrome',headless:true});
try{for(const user of ['alpha_admin','beta_admin']){const context=await browser.newContext();const page=await context.newPage();await page.goto(origin);await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();await page.locator('#username').fill(user);await page.locator('#password').fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.locator('#kc-login').click();await page.waitForURL(origin+'/');await page.getByLabel('Chọn tổ chức',{exact:true}).waitFor();const tenant=(await (await context.request.get(origin+'/api/v1/me/memberships')).json()).data[0].tenant_id;
  for(const fact of facts.filter(f=>f.tenant===tenant)){const response=await context.request.get(`${origin}/api/v1/objects/${fact.object}/records/${fact.id}`,{headers:{'X-Tenant-Id':tenant}});assert.equal(response.status(),200);const r=(await response.json()).data;if(fact.status)assert.equal(r.fields.status,fact.status);if(fact.name)assert.equal(r.fields.display_name??r.custom_values.title,fact.name);}
  await context.close();}console.log('PASS: warm restart preserved Alpha/Beta Contact, custom Appointment and qualified Lead; real OIDC login still works.');
}catch{console.error('FAIL: warm record/auth preservation check; sensitive details suppressed.');process.exitCode=1;}finally{await browser.close();}
