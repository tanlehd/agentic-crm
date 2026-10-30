// Live local authentication/catalog; isolated HTTP contract fixtures for config writes.
// Never publishes test configuration to the running tenant backend.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {upgradeConversationPipeline} from '../packages/contracts/dist/index.js';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000}),origin='http://localhost:18080',out='artifacts/ui-20261030-01/stage-types';
const env=parseEnv(await readFile('.env','utf8'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1536,height:1100}}),page=await context.newPage(),errors=[],checks=[],serverFailures=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=500)serverFailures.push({path:new URL(r.url()).pathname,status:r.status()});});
const check=async(name,work)=>{await work();checks.push(name);console.log('PASS '+name);};
try{
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill('alpha_admin');await page.getByLabel('Mật khẩu',{exact:true}).fill(env.SEED_ALPHA_ADMIN_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/',{timeout:30000});
 const tenant=page.getByLabel('Chọn tổ chức',{exact:true});await tenant.waitFor();if(!await tenant.inputValue())await tenant.selectOption({index:1});
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('navigation',{name:'Settings',exact:true}).getByRole('button',{name:'Objects',exact:true}).click();
 await page.locator('#op-object-select').selectOption('conversation_session');
 await check('Conversation tab reads actual configured pipeline',async()=>{
  await page.getByRole('tab',{name:'Pipeline',exact:true}).click();
  for(let attempt=0;attempt<3;attempt++){await expect(page.locator('.pipeline,.op-panel .crm-error')).toBeVisible();if(await page.locator('.pipeline').count())break;await page.locator('.op-panel .crm-error').getByRole('button',{name:'Tải lại',exact:true}).click();}
  await expect(page.getByRole('heading',{name:'Quy trình hội thoại',exact:true})).toBeVisible();await expect(page.getByLabel('Tên giai đoạn 1',{exact:true})).toBeVisible();
 });
 const tenantId=await tenant.inputValue();const initial=await context.request.get(origin+'/api/v1/session-process',{headers:{'X-Tenant-Id':tenantId}});assert.equal(initial.status(),200);let process=(await initial.json()).data,writes=[],conflict=false;
 process.definition=upgradeConversationPipeline(process.definition);
 await page.route('**/api/v1/session-process',async route=>{
  if(route.request().method()==='POST'){if(conflict){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'VERSION_CONFLICT'}})});return;}const body=route.request().postDataJSON();writes.push({body,match:route.request().headers()['if-match']});process={version:String(BigInt(process.current_version)+1n),current_version:String(BigInt(process.current_version)+1n),definition:body};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:process,meta:{correlation_id:'synthetic-browser-contract'}})});
 });
 await check('Conditional logic column, modal cancel/save and preview',async()=>{
  await expect(page.getByRole('columnheader',{name:'Conditional logic rules',exact:true})).toBeVisible();
  await page.getByLabel('Tên giai đoạn 2',{exact:true}).fill('Tư vấn & xác nhận');await page.getByLabel('Mô tả giai đoạn 2',{exact:true}).fill('Thu thập nhu cầu và xác minh bước tiếp theo.');
  await page.locator('.pipeline-rule-link').nth(1).click();const modal=page.getByRole('dialog',{name:'Edit conditional logic',exact:true}),need=modal.getByLabel('Đã ghi nhận ít nhất một nhu cầu',{exact:true});await expect(modal).toBeVisible();
  const before=await need.isChecked();await need.setChecked(!before);page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(modal).toBeVisible();page.once('dialog',d=>d.accept());await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
  await page.locator('.pipeline-rule-link').nth(1).click();await expect(need).toBeChecked({checked:before});await need.check();await modal.getByLabel(process.definition.milestones[0].label,{exact:true}).check();
  const add=modal.getByRole('button',{name:'+ Add property',exact:true});if(await add.isEnabled()){await add.click();await expect(modal.getByRole('button',{name:'Save rule',exact:true})).toBeDisabled();await modal.getByLabel('Thuộc tính rule 1',{exact:true}).selectOption({index:1});}
  await modal.getByLabel('Preview Lifecycle Stage',{exact:true}).selectOption(process.definition.stages[0].key);await expect(modal.getByText('Không có thuộc tính phụ thuộc cho lựa chọn này.',{exact:true})).toBeVisible();await modal.getByLabel('Preview Lifecycle Stage',{exact:true}).selectOption(process.definition.stages[1].key);await expect(modal.getByRole('heading',{name:'Thông tin cần có',exact:true})).toBeVisible();
  await page.screenshot({path:out+'/rules-desktop.png',fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:900});assert(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:out+'/rules-'+width+'.png',fullPage:true});}
  await page.setViewportSize({width:1536,height:1100});await modal.getByRole('button',{name:'Save rule',exact:true}).click();await expect(modal).toHaveCount(0);await expect(page.locator('.pipeline-rule-link').nth(1)).toHaveText('Edit rule');
  page.once('dialog',d=>d.dismiss());await page.getByRole('tab',{name:'Thuộc tính',exact:true}).click();await expect(page.getByRole('tab',{name:'Pipeline',exact:true})).toHaveAttribute('aria-selected','true');await page.screenshot({path:out+'/pipeline-desktop.png',fullPage:true});
 });
 await check('System stages, Type choices and independent automation switches',async()=>{
  await expect(page.getByLabel('Tên giai đoạn 1',{exact:true})).toHaveValue('Mới');
  await expect(page.getByRole('button',{name:'Chuyển giai đoạn 2 lên',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Chuyển giai đoạn 1 xuống',exact:true})).toBeDisabled();
  for(const key of ['new','received','converted','unqualified']){const index=process.definition.stages.findIndex(s=>s.key===key);await expect(page.getByRole('button',{name:`Xóa giai đoạn ${index+1}`,exact:true})).toBeDisabled();await expect(page.getByLabel(`Type giai đoạn ${index+1}`,{exact:true})).toBeDisabled();}
  await page.getByRole('button',{name:'+ Thêm giai đoạn',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();const type=page.locator('.pipeline-stage-type').last();await expect(type).toBeEnabled();await type.selectOption('converted');await expect(type).toHaveValue('converted');await type.selectOption('unqualified');await expect(type).toHaveValue('unqualified');await type.selectOption('open');
  await page.getByRole('button',{name:'Tự động hóa',exact:false}).click();const switches=page.getByRole('switch');await expect(switches).toHaveCount(2);await expect(switches.nth(0)).toHaveAttribute('aria-checked','true');await expect(switches.nth(1)).toHaveAttribute('aria-checked','true');await switches.nth(0).click();await expect(switches.nth(0)).toHaveAttribute('aria-checked','false');await expect(switches.nth(1)).toHaveAttribute('aria-checked','true');await switches.nth(1).click();await switches.nth(0).click();
  await page.locator('.pipeline-automations').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/automations-desktop.png',fullPage:true});for(const width of [390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.pipeline-automations').scrollIntoViewIfNeeded();await page.screenshot({path:out+`/automations-${width}.png`,fullPage:true});}await page.setViewportSize({width:1536,height:1100});await page.getByRole('button',{name:'Giai đoạn',exact:false}).filter({hasText:/^Giai đoạn/}).click();
 });
 await check('First-stage protection, isolated publish payload and persisted reload',async()=>{
  await page.locator('.pipeline-rule-link').first().click();await expect(page.getByLabel('Đã ghi nhận ít nhất một nhu cầu',{exact:true})).toBeDisabled();await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:'Công bố phiên bản mới',exact:true}).click();await expect(page.getByText('Đã công bố pipeline.',{exact:true})).toBeVisible();assert.equal(writes.length,1);assert.equal(writes[0].body.stages[1].requirements.need,true);assert(writes[0].body.stages[1].requirements.milestones.length);assert.deepEqual(writes[0].body.automations,{set_convert_time:true,clear_convert_time:false});assert.equal(writes[0].body.stages[0].key,'new');assert.match(writes[0].match,/^"[1-9][0-9]*"$/);
  await page.getByRole('button',{name:'Bỏ thay đổi / tải lại',exact:true}).click();await page.getByRole('button',{name:'Tự động hóa',exact:false}).click();await expect(page.getByRole('switch').nth(1)).toHaveAttribute('aria-checked','false');await page.getByRole('button',{name:'Giai đoạn',exact:false}).filter({hasText:/^Giai đoạn/}).click();
 });
 await check('Publish conflict retains draft until explicit reload',async()=>{
  conflict=true;await page.getByLabel('Tên giai đoạn 2',{exact:true}).fill('Bản nhập cần giữ');await page.getByRole('button',{name:'Công bố phiên bản mới',exact:true}).click();await expect(page.locator('.pipeline .crm-error')).toContainText('Record đã thay đổi');await expect(page.getByLabel('Tên giai đoạn 2',{exact:true})).toHaveValue('Bản nhập cần giữ');assert.equal(writes.length,1);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Bỏ thay đổi / tải lại',exact:true}).click();await expect(page.getByLabel('Tên giai đoạn 2',{exact:true})).toHaveValue('Tư vấn & xác nhận');conflict=false;
 });
 await check('Responsive layout at 390 and 320, view and object scope',async()=>{
  for(const width of [390,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:out+`/pipeline-${width}.png`,fullPage:true});}
  await page.setViewportSize({width:1536,height:1100});await page.locator('#op-object-select').selectOption('conversation');await expect(page.getByRole('tab',{name:'Pipeline',exact:true})).toHaveCount(0);await expect(page.getByRole('tab',{name:'Thiết lập',exact:true})).toHaveAttribute('aria-selected','true');
 });
 await check('Read-only config allows inspecting rules and exposes no publish action',async()=>{
  const response=await context.request.get(origin+'/api/v1/crm/context',{headers:{'X-Tenant-Id':tenantId}});assert.equal(response.status(),200);const body=await response.json();body.data.grants=body.data.grants.filter(g=>!(g.resource==='schema'&&g.action==='update'));
  await page.route('**/api/v1/crm/context',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}));await page.reload();await page.locator('#op-object-select').selectOption('conversation_session');await page.getByRole('tab',{name:'Pipeline',exact:true}).click();await expect(page.getByRole('button',{name:'Công bố phiên bản mới',exact:true})).toHaveCount(0);await expect(page.getByLabel('Tên giai đoạn 1',{exact:true})).toBeDisabled();await page.locator('.pipeline-rule-link').nth(1).click();await expect(page.getByRole('button',{name:'Save rule',exact:true})).toHaveCount(0);await expect(page.getByLabel('Đã ghi nhận ít nhất một nhu cầu',{exact:true})).toBeChecked();await expect(page.getByLabel('Đã ghi nhận ít nhất một nhu cầu',{exact:true})).toBeDisabled();await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Tự động hóa',exact:false}).click();await expect(page.getByRole('switch').nth(0)).toBeDisabled();await expect(page.getByRole('switch').nth(1)).toBeDisabled();
 });
 assert.deepEqual(errors,[]);await writeFile(out+'/browser.json',JSON.stringify({checks,errors,serverFailures,environment:'live local auth/catalog and process read; browser-isolated write fixture',realConfigurationWrites:0},null,2));
}finally{await browser.close();}
