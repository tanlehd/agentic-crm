import { chromium } from '@playwright/test';
import { mkdtemp,readFile,writeFile,mkdir,open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=await mkdtemp(join(tmpdir(),'agentic-crm-m1-cold-')),artifacts=resolve(root,'artifacts/SRC-013');
await mkdir(artifacts,{recursive:true});const log=await open(join(artifacts,'cold-compose.log'),'w');
let stage='configuration',browser,env;
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{cwd:directory,env,stdio:['ignore',log.fd,log.fd],timeout:360000,...options});if(r.status!==0)throw new Error('COLD_COMMAND_FAILED');};
try{
  run(process.execPath,[resolve(root,'scripts/env-init.mjs')]);
  const path=join(directory,'.env'),contents=(await readFile(path,'utf8')).replace('APP_ORIGIN=http://localhost:8080','APP_ORIGIN=http://localhost:18080');await writeFile(path,contents,{mode:0o600});
  env={...process.env,...parseEnv(contents),COMPOSE_PROJECT_NAME:`agentic-crm-m1-cold-${process.pid}`,COMPOSE_FILE:[resolve(root,'compose.yaml'),resolve(root,'compose.m1-smoke.yaml')].join(':')};
  stage='cold compose up';run('docker',['compose','up','--no-build','--detach','--wait','--wait-timeout','240']);
  stage='local provisioning and all three seeds';for(const script of ['auth-provision.mjs','seed-dev.mjs','seed-registry.mjs','seed-m1.mjs'])run(process.execPath,[resolve(root,'scripts',script)]);
  stage='cold OIDC and CRUD';browser=await chromium.launch({channel:process.env.E2E_BROWSER_CHANNEL??'chrome',headless:true});
  for(const user of ['alpha_admin','beta_admin']){
    const context=await browser.newContext();context.setDefaultTimeout(20000);const page=await context.newPage();await page.goto(env.APP_ORIGIN);await page.getByRole('link',{name:'Đăng nhập',exact:true}).click();await page.locator('#username').fill(user);await page.locator('#password').fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.locator('#kc-login').click();await page.waitForURL(env.APP_ORIGIN+'/');await page.getByLabel('Chọn tổ chức',{exact:true}).waitFor();
    const members=(await (await context.request.get(env.APP_ORIGIN+'/api/v1/me/memberships')).json()).data;assert.equal(members.length,1);const tenant=members[0].tenant_id;await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);await page.getByRole('heading',{name:'Dữ liệu & cộng tác'}).waitFor();
    const token=(await (await context.request.get(env.APP_ORIGIN+'/auth/csrf')).json()).data.csrf_token;
    const created=await context.request.post(env.APP_ORIGIN+'/api/v1/objects/contact/records',{headers:{Origin:env.APP_ORIGIN,'X-Tenant-Id':tenant,'X-CSRF-Token':token,'Idempotency-Key':randomUUID()},data:{fields:{display_name:'Synthetic cold Contact'}}});assert.equal(created.status(),201);
    const custom=await context.request.post(env.APP_ORIGIN+'/api/v1/objects/appointment/records',{headers:{Origin:env.APP_ORIGIN,'X-Tenant-Id':tenant,'X-CSRF-Token':token,'Idempotency-Key':randomUUID()},data:{custom_values:{title:'Synthetic cold Appointment',stage:'planned'}}});assert.equal(custom.status(),201);
    await context.close();
  }
  console.log('PASS: isolated tmpfs cold start, v1–v8 migration, OIDC provision, seed v1/v2/v3, Alpha/Beta browser login and standard/custom CRUD.');
}catch(error){let message=String(error?.message??'unknown');for(const [key,value] of Object.entries(env??{}))if(/PASSWORD|SECRET|KEY/.test(key)&&value)message=message.replaceAll(value,'[redacted]');console.error(`FAIL: M1 cold gate at ${stage}: ${message.slice(0,1500)}`);process.exitCode=1;}
finally{if(browser)await browser.close();if(env){const result=spawnSync('docker',['compose','down'],{cwd:directory,env,stdio:['ignore',log.fd,log.fd],timeout:60000});if(result.status!==0){console.error('Cold project cleanup requires inspection.');process.exitCode=1;}}await log.close();}
