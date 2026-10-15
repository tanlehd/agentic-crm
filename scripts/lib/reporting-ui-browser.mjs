import {testInboxDashboards} from './inbox-demo-browser.mjs';
import {reopenReport} from './reporting-browser-library.mjs';
import {testMeasureBuilder} from './reporting-measures-browser.mjs';
import {testVisualBuilder} from './reporting-visuals-browser.mjs';
import {captureReportingUsecase} from './reporting-usecase.mjs';
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
// Browser UI uses a test-only transport proxy to the retained isolated native fixture.
// No Alpha permissions or real app endpoint responses are changed outside this browser context.
export async function testReportingBrowser({url,sid,csrf,tenant,principal,grants,revoke,usecase=false,bindingId,inboxDemo}){
 const env=parseEnv(await readFile('.env','utf8'));assert.equal(env.APP_ENV,'development');const origin=env.APP_ORIGIN;assert.equal(origin,'http://localhost:18080');
 await mkdir('artifacts/reporting-ui',{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
 let denied=false,delayNext=false,releaseDelayed,forceConflict=false;
 try{
  await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/');
  await page.route('**/api/v1/crm/context',async route=>{const response=await route.fetch(),body=await response.json();body.data.principal_id=principal;body.data.capabilities=[...new Set([...body.data.capabilities,'read','configure'])];body.data.grants=[...body.data.grants.filter(g=>!['report_definition','report_mock_source'].includes(g.resource)),...(denied?[]:grants)];await route.fulfill({response,json:body});});
  await page.route('**/auth/csrf',route=>route.fulfill({json:{data:{csrf_token:csrf}}}));
  await page.route('**/api/v1/reporting/**',async route=>{
   const original=new URL(route.request().url());
   if(forceConflict&&route.request().method()==='PATCH'){forceConflict=false;await route.fulfill({status:409,json:{error:{code:'VERSION_CONFLICT'}}});return;}
   const response=await route.fetch({url:url+original.pathname+original.search,headers:{...route.request().headers(),cookie:'crm_session='+sid,'x-tenant-id':tenant,'x-csrf-token':csrf,origin}});
   if(delayNext&&original.pathname.endsWith('/query')){delayNext=false;await new Promise(resolve=>{releaseDelayed=resolve;});}
   await route.fulfill({response}).catch(()=>{});
  });
  const tenantSelect=page.getByLabel('Chọn tổ chức',{exact:true});if(await tenantSelect.isVisible())await tenantSelect.selectOption({index:1});
  await page.getByRole('navigation',{name:'Menu ứng dụng'}).getByRole('button',{name:'Report Builder',exact:true}).click();await expect(page.getByRole('heading',{name:'Từ dữ liệu đến báo cáo'})).toBeVisible();
  if(inboxDemo)return await testInboxDashboards(page,inboxDemo);
  const source=page.getByLabel('Datasource',{exact:true});await expect(source.locator('option')).not.toHaveCount(1);await source.selectOption(bindingId??{index:1});if(usecase)return await captureReportingUsecase(page);
  await testVisualBuilder(page);checks.push('common visualizations:14 browser groups (see reporting-visuals/browser.json)');
  await testMeasureBuilder(page);checks.push("field summaries:9 browser groups (see reporting-measures/browser.json)");
  const run=page.getByRole('button',{name:'Chạy preview',exact:true}),region=page.getByRole('region',{name:'Report Builder'});
  await run.click();await expect(page.getByRole('table')).toBeVisible();await expect(page.getByRole('table').locator('tfoot')).toContainText('5');checks.push('native fixture discovery and server-computed session total5');
  await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('line');await run.click();await expect(page.getByRole('img',{name:/Biểu đồ đường/})).toBeVisible();checks.push('temporal line and accessible table');
  await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('table');
  await page.getByRole('checkbox',{name:/session → ad/}).check();await page.getByRole('button',{name:'Bỏ chiều session.opened_at',exact:true}).click();await page.getByRole('button',{name:'Thêm chiều ad.name',exact:true}).click();await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('bar');await run.click();await expect(page.getByRole('img',{name:/Biểu đồ cột/})).toBeVisible();await expect(page.getByRole('table')).toContainText('Ad A');
  await page.getByLabel('Tên báo cáo',{exact:true}).fill('UI mock by ad '+Date.now());await page.getByRole('button',{name:'Lưu draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu draft');const savedName=await page.getByLabel('Tên báo cáo',{exact:true}).inputValue();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV',exact:true}).click();const download=await downloadPromise;await download.saveAs('artifacts/reporting-ui/report.csv');assert((await readFile('artifacts/reporting-ui/report.csv','utf8')).includes('Ad A'));checks.push('bar, persistent draft and authorized CSV');
  await page.screenshot({path:'artifacts/reporting-ui/desktop.png',fullPage:true});
  await page.getByRole('button',{name:'+ Báo cáo mới',exact:true}).click();await reopenReport(page,savedName);await expect(page.getByLabel('Tên báo cáo',{exact:true})).toHaveValue(savedName);await expect(page.getByLabel('Kiểu hiển thị',{exact:true})).toHaveValue('bar');await run.click();await expect(page.getByRole('table')).toContainText('Ad A');checks.push('reopen persisted draft with complete definition');
  forceConflict=true;await page.getByLabel('Tên báo cáo',{exact:true}).fill(savedName+' edited');await page.getByRole('button',{name:'Lưu draft',exact:true}).click();await expect(page.getByText('Bản chỉnh sửa của bạn vẫn được giữ.',{exact:false})).toBeVisible();await expect(page.getByLabel('Tên báo cáo',{exact:true})).toHaveValue(savedName+' edited');await page.getByRole('button',{name:'Lưu thành bản sao',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu draft');checks.push('409 conflict retains edit and save-as-copy succeeds');
  await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('pivot');await page.getByRole('button',{name:'Thêm chiều session.source_kind',exact:true}).click();await page.getByLabel('Chiều cột pivot',{exact:true}).selectOption('session.source_kind');await run.click();await expect(page.getByRole('table')).toContainText('Tổng hàng');await expect(page.getByRole('table').locator('tfoot')).toContainText('5');checks.push('pivot cells and server-recomputed grand total');await page.screenshot({path:'artifacts/reporting-ui/pivot.png',fullPage:true});
  await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('bar');await page.getByLabel('Series',{exact:true}).selectOption('session.source_kind');await run.click();await expect(page.locator('.rpt-legend')).toContainText('paid');checks.push('series shares X categories and renders labeled legend');
  await page.getByText('Bộ lọc AND (0)',{exact:true}).click();await page.getByLabel('Field lọc',{exact:true}).selectOption('session.source_kind');await page.getByLabel('Giá trị',{exact:true}).selectOption('paid');await page.getByRole('button',{name:'Thêm bộ lọc',exact:true}).click();await run.click();await expect(page.getByRole('table').locator('tfoot')).toContainText('4');checks.push('typed AND filter changes backend cohort to four paid sessions');await page.getByRole('button',{name:'Bỏ bộ lọc 1',exact:true}).click();
  await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('table');delayNext=true;await run.click();await expect.poll(()=>!!releaseDelayed).toBe(true);await page.getByRole('button',{name:'Bỏ chiều ad.name',exact:true}).click();releaseDelayed();await expect(page.getByRole('table')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('Cấu hình đã thay đổi');checks.push('delayed old response discarded after edit');
  await page.getByRole('button',{name:'Bỏ chiều session.source_kind',exact:true}).click();await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('kpi');await run.click();await expect(page.locator('.rpt-kpis strong')).toHaveText('5');checks.push('KPI card no grouping');
  await page.getByLabel('Data model',{exact:true}).selectOption('marketing_base@1');await run.click();await expect(page.getByRole('table')).toBeVisible();await expect(page.getByRole('status')).toContainText('Preview hoàn tất');checks.push('separate marketing model executes');
  await page.locator('.rpt-library details').evaluate(el=>el.open=false);await page.setViewportSize({width:320,height:780});await page.getByLabel('Datasource',{exact:true}).scrollIntoViewIfNeeded();await expect(region).toBeVisible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'320px page overflow');await page.screenshot({path:'artifacts/reporting-ui/mobile.png',fullPage:true});
  await source.focus();await page.keyboard.press('Tab');assert(await page.evaluate(()=>['SELECT','BUTTON','INPUT'].includes(document.activeElement?.tagName??'')));checks.push('320px reflow and native keyboard controls');
  await page.setViewportSize({width:800,height:500});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'zoom-equivalent page overflow');checks.push('800px effective viewport reflow (zoom-equivalent, not browser zoom)');
  await revoke();denied=true;await expect(page.getByLabel('Datasource',{exact:true})).toHaveValue('');await expect(page.getByRole('table')).toHaveCount(0);await expect(region.getByRole('alert')).toContainText('quyền');checks.push('live test-principal revoke clears catalog, draft and result on context refresh');assert.equal(errors.length,0,errors.join('\n'));await writeFile('artifacts/reporting-ui/browser.json',JSON.stringify({mode:'isolated native fixture via browser-only transport proxy',checks},null,2));console.log('PASS UI '+checks.length+' browser groups');return checks;
 }catch(e){await page.screenshot({path:'artifacts/reporting-ui/failure.png',fullPage:true}).catch(()=>{});throw e;}finally{releaseDelayed?.();await browser.close();}
}
