import {reopenReport} from './reporting-browser-library.mjs';
import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

export async function addReportMetric(page,id){
 await page.getByLabel('Loại chỉ số',{exact:true}).selectOption('preset');
 await page.getByLabel('Chỉ số có sẵn',{exact:true}).selectOption(id+'@1');
 await page.getByRole('button',{name:'+ Thêm chỉ số',exact:true}).click();
}
export async function testMeasureBuilder(page){
 const dir='artifacts/reporting-measures';await mkdir(dir,{recursive:true});await page.setViewportSize({width:1800,height:1350});
 await page.getByLabel('Tên báo cáo',{exact:true}).fill('Giá trị Deal won theo quảng cáo · SUM và AVG · '+Date.now());
 await page.getByRole('checkbox',{name:/session → ad/}).check();await page.getByRole('button',{name:'Bỏ chiều session.opened_at',exact:true}).click();await page.getByRole('button',{name:'Thêm chiều ad.name',exact:true}).click();await page.getByRole('button',{name:'Bỏ chỉ số sessions_opened',exact:true}).click();
 await page.getByLabel('Loại chỉ số',{exact:true}).selectOption('field');await page.getByLabel('Field cần đo',{exact:true}).selectOption({label:'deal.amount'});await page.getByLabel('Phép tổng hợp',{exact:true}).selectOption('sum');await page.getByRole('button',{name:'+ Thêm chỉ số',exact:true}).click();
 const preview=async()=>{const pending=page.waitForResponse(r=>r.url().endsWith('/api/v1/reporting/query')&&r.request().method()==='POST');await page.getByRole('button',{name:'Chạy preview',exact:true}).click();const response=await pending;assert.equal(response.status(),200,await response.text());const body=await response.json();await expect(page.getByRole('status')).toContainText('Preview hoàn tất');return body.data;};
 assert.equal((await preview()).totals.won_value,'400.000000');
 await page.getByLabel('Cách tính won_value',{exact:true}).selectOption('summary_won_value_avg@1');await expect(page.getByRole('table')).toHaveCount(0);assert.equal((await preview()).totals.summary_won_value_avg,'133.333333');
 await page.getByLabel('Phép tổng hợp',{exact:true}).selectOption('sum');await page.getByRole('button',{name:'+ Thêm chỉ số',exact:true}).click();await page.getByLabel('Phép tổng hợp',{exact:true}).selectOption('count');await page.getByRole('button',{name:'+ Thêm chỉ số',exact:true}).click();await page.getByRole('button',{name:'Đưa chỉ số lên won_value',exact:true}).click();
 await page.getByLabel('Loại chỉ số',{exact:true}).selectOption('formula');await page.getByLabel('Công thức KPI',{exact:true}).selectOption('session_to_lead_rate@1');await page.locator('.rpt-calculation summary').click();await expect(page.locator('.rpt-calculation')).toContainText('sessions with lead');await expect(page.locator('.rpt-calculation')).toContainText('sessions opened');await page.getByRole('button',{name:'+ Thêm chỉ số',exact:true}).click();
 const table=await preview();assert.deepEqual(table.totals,{won_value:'400.000000',summary_won_value_avg:'133.333333',summary_won_value_count:'3',session_to_lead_rate:'60.000000'});assert.deepEqual(table.metrics,['won_value','summary_won_value_avg','summary_won_value_count','session_to_lead_rate']);
 const name=await page.getByLabel('Tên báo cáo',{exact:true}).inputValue();const save=page.waitForResponse(r=>r.url().endsWith('/api/v1/reporting/definitions')&&r.request().method()==='POST');await page.getByRole('button',{name:'Lưu draft',exact:true}).click();const saved=await save;assert.equal(saved.status(),200);const draft=(await saved.json()).data;await expect(page.getByRole('status')).toContainText('Đã lưu draft');
 await page.getByRole('button',{name:'+ Báo cáo mới',exact:true}).click();await reopenReport(page,name);await expect(page.getByLabel('Cách tính summary_won_value_avg',{exact:true})).toHaveValue('summary_won_value_avg@1');assert.deepEqual((await preview()).totals,table.totals);await page.locator('.rpt-library summary').click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV',exact:true}).click();await(await download).saveAs(dir+'/summaries.csv');
 await page.getByLabel('Loại chỉ số',{exact:true}).selectOption('field');await page.getByLabel('Field cần đo',{exact:true}).selectOption({label:'deal.amount'});await page.getByLabel('Phép tổng hợp',{exact:true}).selectOption('avg');await page.locator('.rpt-calculation summary').click();await page.getByRole('heading',{name:'Từ dữ liệu đến báo cáo'}).scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/configuration.png',fullPage:true});await page.locator('.rpt-calculation summary').click();await page.locator('.rpt-selected-measures').screenshot({path:dir+'/selected-measures.png'});await page.locator('.rpt-preview').screenshot({path:dir+'/result.png'});
 await page.getByLabel('Kiểu hiển thị',{exact:true}).selectOption('pivot');const pivot=await preview();assert.equal(pivot.pivot.grandTotal.summary_won_value_avg,'133.333333');
 await page.setViewportSize({width:320,height:780});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'320px page overflow');await page.screenshot({path:dir+'/mobile.png',fullPage:true});
 await writeFile(dir+'/browser.json',JSON.stringify({mode:'isolated native fixture via browser-only transport proxy',reportId:draft.id,definition:draft.definition,totals:table.totals,checks:['field SUM400','change to AVG133.333333 invalidates preview','COUNT3 with equal-value deals','metric order','formula dependencies','save/reopen exact refs','CSV','weighted pivot total','320px reflow']},null,2));
 // Return the harness to its initial report for the existing regression flow.
 await page.setViewportSize({width:1600,height:1000});await page.getByRole('button',{name:'+ Báo cáo mới',exact:true}).click();await page.getByLabel('Datasource',{exact:true}).selectOption(draft.definition.bindingId);
 console.log('PASS measure builder:9 groups; SUM400 / AVG133.333333 / COUNT3, formulas, draft, CSV, pivot and mobile.');
}
