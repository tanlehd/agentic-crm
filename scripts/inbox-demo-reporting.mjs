import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {fixtureId} from '../apps/backend/dist/modules/identity/seed.js';
import {ReportingStore} from '../services/reporting/dist/storage.js';
import {ProjectionStore,ingestSnapshot} from '../services/reporting/dist/projections.js';
import {inboxDemoAdapter,inboxDemoDashboards} from '../services/reporting/dist/inbox-demo.js';
import {executeQuery} from '../services/reporting/dist/query.js';
import {saveInboxDashboards} from './lib/inbox-demo-reports.mjs';
import {testInboxDashboards} from './lib/inbox-demo-browser.mjs';
assert(process.argv.includes('--prepare')||process.argv.includes('--activate'),'Choose --prepare or --activate. Permission grants require separate explicit --grant-approved after human approval.');
const file='.local/inbox50-v1.json',manifest=JSON.parse(await readFile(file,'utf8')),env=parseEnv(await readFile('.env','utf8')),reportingEnv=parseEnv(await readFile('.local/reporting.env','utf8'));
assert.equal(env.APP_ENV,'development');assert.equal(env.APP_ORIGIN,'http://localhost:18080');assert.equal(reportingEnv.REPORTING_DB_NAME,'crm_reporting');assert.equal(reportingEnv.REPORTING_DB_HOST,'127.0.0.1');assert.equal(reportingEnv.REPORTING_DB_PORT,'13306');assert.equal(manifest.tenant,fixtureId('clinic_alpha'));assert.equal(manifest.items.length,50);
const native=JSON.parse(await readFile('artifacts/inbox-demo/native.json','utf8'));assert.equal(native.checks.length,50);for(const [i,row]of native.checks.entries()){assert.equal(row.session,manifest.items[i].session);assert.equal(row.owner,manifest.items[i].agent??null);}
const context={tenantId:manifest.tenant,bindingId:manifest.binding,environment:'mock',adapterId:'synthetic_g1_v1'},store=new ReportingStore(reportingEnv);let snapshot;
try{const projections=new ProjectionStore(store.pool);await ingestSnapshot(projections,inboxDemoAdapter(context,manifest.items),context);snapshot=await projections.read(context);}finally{await store.close();}
const access={tenantId:manifest.tenant,principalId:randomUUID(),authRevision:'1',scopeFingerprint:'offline-demo-validation',permissions:['report.run'],objects:snapshot.manifest.catalog.objects.map(o=>o.id),fields:snapshot.binding.availableFields,bindings:[manifest.binding],rows:Object.fromEntries(snapshot.manifest.catalog.objects.map(o=>[o.id,'all'])),expiresAt:Date.now()+60000};
await mkdir('artifacts/inbox-demo/alpha',{recursive:true});const preview=inboxDemoDashboards(manifest.binding,snapshot.binding.revision).map(d=>({...d,results:d.definition.widgets.map(w=>({id:w.id,result:executeQuery(snapshot,w.definition,access)}))}));await writeFile('artifacts/inbox-demo/alpha/prepared.json',JSON.stringify({at:new Date().toISOString(),mode:'synthetic snapshot linked to native fixture IDs; no Alpha role changes',binding:manifest.binding,generation:snapshot.binding.revision,dashboards:preview},null,2));console.log('Prepared Alpha snapshot: 50 native session IDs, 11 computed widgets.');
if(process.argv.includes('--activate')){
 const origin=env.APP_ORIGIN,browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}});page.setDefaultTimeout(30000);page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/');
  const csrf=(await(await page.request.get(origin+'/auth/csrf')).json()).data.csrf_token,headers={'X-Tenant-Id':manifest.tenant,Origin:origin,'X-CSRF-Token':csrf};
  const api=async(path,method='GET',body,extra={})=>{const r=await page.request.fetch(origin+'/api/v1/'+path,{method,headers:{...headers,...extra},...(body?{data:body}:{})});const b=await r.json();assert([200,201].includes(r.status()),JSON.stringify(b));return b;};
  if(process.argv.includes('--grant-approved')){
   // Only run this branch after explicit human approval recorded in task evidence.
   const all=async(resource)=>{let out=[],cursor;do{const r=await api('admin/'+resource+'?limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''));out.push(...r.data);cursor=r.next_cursor;}while(cursor);return out;};
   const permissions=[...['read','design'].map(action=>({resource:'report_definition',action,scope:'own'})),...['run','export'].map(action=>({resource:'report_definition',action,scope:'all'})),{resource:'report_mock_source',action:'read',scope:'all'}];
   let role=(await all('roles')).find(r=>r.key==='reporting_mock_designer');manifest.activation??={roleKey:randomUUID()};await writeFile(file,JSON.stringify(manifest,null,2));
   if(!role)role=(await api('admin/roles','POST',{key:'reporting_mock_designer',name:'Reporting mock designer',permissions},{'Idempotency-Key':manifest.activation.roleKey})).data;
   const canonical=x=>JSON.stringify([...x].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));assert.equal(canonical(role.permissions),canonical(permissions),'Existing role differs; do not overwrite');
   const member=(await all('memberships')).find(m=>m.id===fixtureId('alpha:member:alpha_admin'));assert(member);const before=[...member.role_ids];
   if(!member.role_ids.includes(role.id))await api('admin/memberships/'+member.id,'PATCH',{role_ids:[...member.role_ids,role.id]},{'Idempotency-Key':randomUUID(),'If-Match':`"${member.version}"`});
   const current=(await all('memberships')).find(m=>m.id===member.id);assert(before.every(id=>current.role_ids.includes(id)));assert(current.role_ids.includes(role.id));
   await writeFile('artifacts/inbox-demo/alpha/activation.json',JSON.stringify({at:new Date().toISOString(),authorization:'explicit human approval required by runbook; invoked with --grant-approved',tenant:manifest.tenant,member:member.id,role:role.id,permissions,preservedRoleIds:before,roleIds:current.role_ids},null,2));
  }
  const rights=(await api('crm/context')).data;assert(rights.grants.some(g=>g.resource==='report_mock_source'&&g.action==='read'&&g.scope==='all'),'Alpha Reporting permission pending; do not grant implicitly');
  const cookie=(await page.context().cookies(origin)).filter(c=>c.name==='crm_session').map(c=>c.name+'='+c.value).join(';');
  const reports=await saveInboxDashboards({url:origin,headers:{...headers,cookie},binding:manifest.binding,generation:snapshot.binding.revision,ids:manifest.reportIds??{},persist:async ids=>{manifest.reportIds=ids;await writeFile(file,JSON.stringify(manifest,null,2));}});
  await writeFile('artifacts/inbox-demo/alpha/reports.json',JSON.stringify(reports,null,2));
  const csvWidget=reports[0].definition.widgets[0];const csv=await page.request.post(origin+'/api/v1/reporting/query',{headers,data:{definition:csvWidget.definition,generation:csvWidget.generation,format:'csv'}});assert.equal(csv.status(),200);assert((await csv.text()).includes('50'));await writeFile('artifacts/inbox-demo/alpha/access.json',JSON.stringify({at:new Date().toISOString(),authorization:'native tenant_admin super-admin effective grants; no added role',tenant:manifest.tenant,principal:rights.principal_id,reportingGrants:rights.grants.filter(g=>g.resource.startsWith('report')),csvStatus:csv.status()},null,2));
  await page.reload();await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(manifest.tenant);await page.getByRole('navigation',{name:'Menu ứng dụng'}).getByRole('button',{name:'Report Builder',exact:true}).click();
  await testInboxDashboards(page,{reports,mode:'actual Alpha login and native endpoints; no transport proxy; fault injection only in final two negative checks',dir:'artifacts/inbox-demo/alpha'});assert.deepEqual(errors,[]);
 }catch(error){await page.screenshot({path:'artifacts/inbox-demo/alpha/failure.png',fullPage:true});await writeFile('artifacts/inbox-demo/alpha/failure.txt',await page.locator('body').innerText());throw error;}finally{await browser.close();}
}
