import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
export async function testInboxDashboards(page,{reports,mode,dir='artifacts/inbox-demo/isolated'}){
 await mkdir(dir,{recursive:true});const checks=[];
 async function open(report){
  const details=page.locator('.rpt-library details');await details.evaluate(el=>el.open=true);await page.getByRole('button',{name:'Làm mới thư viện',exact:true}).click();
  const target=page.locator('.rpt-drafts button').filter({hasText:report.name}).first();
  const more=page.getByRole('button',{name:'Tải thêm draft',exact:true});
  await expect.poll(async()=>!!await target.count()||await more.isVisible()).toBe(true);
  for(let i=0;i<100&&!await target.count();i++){const loaded=page.waitForResponse(r=>r.url().includes('/api/v1/reporting/definitions?')&&r.request().method()==='GET');await more.click();assert.equal((await loaded).status(),200);await expect.poll(async()=>!!await target.count()||await more.isVisible()).toBe(true);}
  await target.click();await expect(page.getByRole('region',{name:'Dashboard đã lưu',exact:true})).toBeVisible();await details.evaluate(el=>el.open=false);
 }
 async function refresh(count){await page.getByRole('button',{name:'Làm mới dashboard',exact:true}).click();await expect(page.getByRole('region',{name:'Dashboard đã lưu'}).getByRole('status')).toHaveText(`Đã tính ${count} widget từ snapshot mô phỏng đã ghim.`);await expect(page.locator('.rpt-dashboard-widget table')).toHaveCount(count);}
 for(const [i,report]of reports.entries()){
  await open(report);await refresh(report.definition.widgets.length);
  if(i===0){await expect(page.locator('.rpt-dashboard-widget').first().locator('.rpt-kpis strong')).toHaveText(['50','30','20','60']);await expect(page.getByRole('img',{name:/Donut|khuyên/})).toBeVisible();}
  else{await expect(page.locator('.rpt-dashboard-widget').first().locator('.rpt-kpis strong')).toHaveText(['50','30','20','10','20','33.333333','66.666667']);await expect(page.locator('.rpt-dashboard-widget').last().locator('tfoot')).toContainText('170000');}
  await page.setViewportSize({width:1600,height:1100});await page.getByRole('heading',{name:'Từ dữ liệu đến báo cáo'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${i===0?'operations':'marketing'}-desktop.png`,fullPage:true});
  for(const id of i===0?['state','speed','flow','capacity']:['coverage','outcomes','cost']){const index=report.definition.widgets.findIndex(w=>w.id===id);await page.locator('.rpt-dashboard-widget').nth(index).screenshot({path:`${dir}/${id}-desktop.png`});}
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile page overflow');assert(await page.locator('.rpt-dashboard-widget').first().locator('.rpt-kpis>div').evaluateAll(cards=>cards.every(c=>c.getBoundingClientRect().width>=190)),'mobile KPI cards too narrow');await page.locator('.rpt-dashboard-widget').first().locator('.rpt-kpis>div').first().scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${i===0?'operations':'marketing'}-mobile.png`});checks.push(report.name+': reopened, pinned refresh, exact totals, desktop/mobile');
 }
 await page.setViewportSize({width:1600,height:1100});await open(reports[0]);await page.getByRole('button',{name:'Chỉnh bố cục',exact:true}).click();await page.getByLabel('Mô tả dashboard',{exact:true}).fill(reports[0].definition.description+' ');await page.getByRole('button',{name:'Lưu draft',exact:true}).click();await expect(page.locator('.rpt-status')).toContainText('Đã lưu draft');
 await page.getByLabel('Mô tả dashboard',{exact:true}).fill(reports[0].definition.description);await page.getByRole('button',{name:'Lưu draft',exact:true}).click();await expect(page.locator('.rpt-status')).toContainText('Đã lưu draft');await page.getByRole('button',{name:'Xong chỉnh bố cục',exact:true}).click();checks.push('native saved dashboard edit/CAS round trip preserves all widgets');
 // Deliberate UI faults supplement native permissions tests; screenshots above use real results.
 let fault='partial';await page.route('**/api/v1/reporting/query',async(route)=>{const body=route.request().postDataJSON();if(body.definition.model.id==='inbox_operations'&&body.definition.metrics[0].id==='ops_received'){await route.fulfill({status:fault==='auth'?403:503,json:{error:{code:fault==='auth'?'FORBIDDEN':'DEMO_TEST_UNAVAILABLE'}}});}else await route.fallback();});
 await page.getByRole('button',{name:'Làm mới dashboard',exact:true}).click();await expect(page.locator('.rpt-dashboard').getByRole('status')).toContainText('widget chưa tính được');await expect(page.locator('.rpt-dashboard table')).toHaveCount(4);checks.push('partial widget failure explicit; successful widgets retained');
 fault='auth';await page.getByRole('button',{name:'Làm mới dashboard',exact:true}).click();await expect(page.locator('.rpt-dashboard').getByRole('status')).toContainText('Đã xóa toàn bộ kết quả');await expect(page.locator('.rpt-dashboard table')).toHaveCount(0);checks.push('403 clears every widget including concurrent responses');await page.unroute('**/api/v1/reporting/query');
 if(mode.includes('isolated')){
  await page.getByRole('button',{name:'+ Dashboard mới',exact:true}).click();await page.getByLabel('Tên báo cáo',{exact:true}).fill('DEMO kiểm thử soạn dashboard '+Date.now());await page.getByRole('button',{name:'Chỉnh bố cục',exact:true}).click();
  for(const model of ['inbox_operations@1','agent_workload@1']){await page.getByRole('button',{name:'+ Thêm widget',exact:true}).click();await page.getByLabel('Datasource',{exact:true}).selectOption(reports[0].definition.widgets[0].definition.bindingId);await page.getByLabel('Data model',{exact:true}).selectOption(model);await page.getByRole('button',{name:'Thêm báo cáo vào dashboard',exact:true}).click();await page.getByRole('button',{name:'Chỉnh bố cục',exact:true}).click();}
  await page.getByLabel('Tiêu đề widget 1',{exact:true}).fill('Lượt vào');await page.getByLabel('Tiêu đề widget 2',{exact:true}).fill('Agent nhận');await page.getByRole('button',{name:'Đưa widget lên Agent nhận',exact:true}).click();await expect(page.getByLabel('Tiêu đề widget 1',{exact:true})).toHaveValue('Agent nhận');await page.getByRole('button',{name:'Lưu draft',exact:true}).click();await expect(page.locator('.rpt-status')).toContainText('Đã lưu draft');if(await page.getByRole('button',{name:'Xong chỉnh bố cục',exact:true}).count())await page.getByRole('button',{name:'Xong chỉnh bố cục',exact:true}).click();await refresh(2);checks.push('compose two widgets from configured reports, reorder, private save and execute');
 }
 await writeFile(dir+'/browser.json',JSON.stringify({at:new Date().toISOString(),mode,checks,reports:reports.map(({id,name})=>({id,name}))},null,2));console.log('PASS inbox dashboards: '+checks.length+' browser groups');return checks;
}
