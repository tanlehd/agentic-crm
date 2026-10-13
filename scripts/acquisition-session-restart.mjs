import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { fixtureId } from '../apps/backend/dist/modules/identity/seed.js';
const env=parseEnv(await readFile('.env','utf8')),origin=env.APP_ORIGIN,monitor='http://127.0.0.1:3020';
assert.equal(env.APP_ENV,'development');assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();await page.goto(origin+'/auth/login');
 await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/');
 const path=origin+'/api/v1/sales/reports/organic-pages?from=2026-10-01T00%3A00%3A00Z&to=2026-11-01T00%3A00%3A00Z';
 async function report(){const response=await page.request.get(path,{headers:{'X-Tenant-Id':fixtureId('clinic_alpha')}});assert.equal(response.status(),200);return (await response.json()).data;}
 const before=await report();assert(before.length>0);
 const {conversation}=JSON.parse(await readFile('artifacts/acquisition-sessions/browser.json','utf8'));
 async function sessions(){const response=await page.request.get(origin+'/api/v1/conversations/'+conversation+'/acquisition-sessions',{headers:{'X-Tenant-Id':fixtureId('clinic_alpha')}});assert.equal(response.status(),200);return (await response.json()).data;}
 const beforeSessions=await sessions();assert.equal(beforeSessions.length,3);
 const html=await(await fetch(monitor)).text(),token=html.match(/const token='([^']+)'/)?.[1];assert(token);
 for(const action of ['stop','start'])for(const service of ['api','worker']){
  const response=await fetch(`${monitor}/service/${service}/${action}`,{method:'POST',headers:{Origin:monitor,'X-Local-Token':token}});assert(response.ok,`${service} ${action}`);
 }
 let after;for(let attempt=0;attempt<60;attempt++){try{after=await report();break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
 assert.deepEqual(after,before);assert.deepEqual(await sessions(),beforeSessions);
 await writeFile('artifacts/acquisition-sessions/restart.json',JSON.stringify({status:'PASS',groups:before.length,sessionsUnchanged:true,sessionCount:beforeSessions.length,reportUnchanged:true,nativeSessionPreserved:true,restarted:['api','worker']},null,2));
 console.log('PASS API/worker restart, acquisition sessions, native login and organic report unchanged');
}finally{await browser.close();}
