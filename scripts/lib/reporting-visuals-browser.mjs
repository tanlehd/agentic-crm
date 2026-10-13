import {reopenReport} from './reporting-browser-library.mjs';
import {expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

export async function testVisualBuilder(page){
 const dir='artifacts/reporting-visuals';await mkdir(dir,{recursive:true});const binding=await page.getByLabel('Datasource',{exact:true}).inputValue(),checks=[],results={};
 await page.setViewportSize({width:1800,height:1150});
 await page.getByLabel('Data model',{exact:true}).selectOption('marketing_base@1');
 await page.getByRole('checkbox',{name:/insights_base → ad/}).check();
 await page.getByRole('button',{name:'Thêm chiều ad.name',exact:true}).click();
 await page.locator('.rpt-presets summary').click();
 const labels={bar:'Biểu đồ cột',horizontal_bar:'Bar ngang',stacked_bar:'Cột chồng',line:'Biểu đồ đường · Trend',area:'Biểu đồ miền · Area',pie:'Biểu đồ tròn · Pie',donut:'Vòng khuyên · Donut',kpi:'KPI card',pivot:'Pivot table',table:'Bảng dữ liệu'};
 const preview=async()=>{const pending=page.waitForResponse(r=>r.url().endsWith('/api/v1/reporting/query')&&r.request().method()==='POST');await page.getByRole('button',{name:'Chạy preview',exact:true}).click();const response=await pending;assert.equal(response.status(),200,await response.text());await expect(page.getByRole('status').first()).toContainText('Preview hoàn tất');return(await response.json()).data;};
 for(const [type,label] of Object.entries(labels)){
  await page.locator('.rpt-presets').getByRole('button',{name:label,exact:true}).click();await expect(page.getByRole('table')).toHaveCount(0);await expect(page.getByLabel('Kiểu hiển thị',{exact:true})).toHaveValue(type);
  if(type==='stacked_bar')await page.getByLabel('Series',{exact:true}).selectOption('ad.name');
  results[type]=await preview();await expect(page.getByRole('table')).toBeVisible();
  if(!['table','pivot','kpi'].includes(type))await expect(page.locator('.rpt-chart svg')).toBeVisible();
  if(type==='kpi')await expect(page.locator('.rpt-kpis strong')).toBeVisible();
  await page.locator('.rpt-preview').screenshot({path:dir+'/'+type+'.png'});checks.push(type+' preset, native preview and exact table');
 }
 await page.locator('.rpt-presets').getByRole('button',{name:labels.donut,exact:true}).click();await preview();
 const name='Mẫu Donut lượt hiển thị theo nhóm · '+Date.now();await page.getByLabel('Tên báo cáo',{exact:true}).fill(name);
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/v1/reporting/definitions')&&r.request().method()==='POST');await page.getByRole('button',{name:'Lưu draft',exact:true}).click();const response=await pending;assert.equal(response.status(),200);const saved=(await response.json()).data;assert.equal(saved.definition.visualization.type,'donut');await expect(page.getByRole('status').first()).toContainText('Đã lưu draft');
 await page.getByRole('button',{name:'+ Báo cáo mới',exact:true}).click();await reopenReport(page,name);await expect(page.getByLabel('Kiểu hiển thị',{exact:true})).toHaveValue('donut');const reopened=await preview();assert.deepEqual(reopened.totals,results.donut.totals);checks.push('donut save/reopen native definition and totals');await page.locator('.rpt-library summary').click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV',exact:true}).click();await(await download).saveAs(dir+'/donut.csv');checks.push('CSV from same definition');
 await page.setViewportSize({width:320,height:780});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'320px overflow');await page.screenshot({path:dir+'/mobile-full.png',fullPage:true});await page.locator('.rpt-chart').scrollIntoViewIfNeeded();assert(await page.locator('.rpt-chart').evaluate(el=>{const r=el.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.rpt-preview');}),'chart obscured by another panel');await page.screenshot({path:dir+'/mobile.png'});checks.push('320px reflow and unobscured preview');
 await page.setViewportSize({width:1800,height:1150});await page.getByLabel('Data model',{exact:true}).selectOption('acquisition@1');if(!await page.locator('.rpt-presets').evaluate(el=>el.open))await page.locator('.rpt-presets summary').click();await page.locator('.rpt-presets').getByRole('button',{name:labels.area,exact:true}).click();results.acquisitionTrend=await preview();assert.equal(results.acquisitionTrend.rows.length,5);await expect(page.locator('.rpt-chart circle')).toHaveCount(5);await expect(page.locator('.rpt-chart polygon')).toHaveCount(1);await page.locator('.rpt-preview').screenshot({path:dir+'/area-trend.png'});checks.push('area trend across five consecutive native acquisition buckets');
 await writeFile(dir+'/browser.json',JSON.stringify({mode:'isolated native fixture via browser-only transport proxy',checks,saved,results},null,2));
 await page.setViewportSize({width:1600,height:1000});await page.getByRole('button',{name:'+ Báo cáo mới',exact:true}).click();await page.getByLabel('Datasource',{exact:true}).selectOption(binding);
 console.log('PASS visualization builder: '+checks.length+' groups');
}
