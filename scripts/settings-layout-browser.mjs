// Read-only Settings layout smoke against the retained local synthetic accounts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:30000}),origin='http://localhost:18080',out='artifacts/ui-20261029-01';
const env=parseEnv(await readFile('.env','utf8'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[],failures=[];
async function check(name,work){await work();checks.push(name);console.log('PASS '+name);}
async function login(user){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=500)failures.push({path:new URL(response.url()).pathname,status:response.status()});});
 await page.goto(origin+'/auth/login');await page.getByLabel('Tên đăng nhập').fill(user);await page.getByLabel('Mật khẩu',{exact:true}).fill(env[`SEED_${user.toUpperCase()}_PASSWORD`]);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(origin+'/',{timeout:30000});
 await expect(page.getByLabel('Chọn tổ chức',{exact:true})).toBeVisible();
 if(!await page.getByLabel('Chọn tổ chức',{exact:true}).inputValue())await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption({index:1});
 await expect(page.locator('.app-header')).toBeVisible();
 return {context,page};
}
try{
 const {context,page}=await login('alpha_admin');
 await check('Single Settings entry and no scattered administration',async()=>{
  await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  await expect(page.locator('.app-nav')).not.toContainText('Cài đặt workspace');
  await expect(page.locator('.app-nav')).not.toContainText('Object & Properties');
  await expect(page.locator('.app-header a[aria-label="Developer API"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  for(const group of ['Account Management','Data Management','Tools'])await expect(page.locator('.settings-sidebar').getByRole('heading',{name:group,exact:true})).toBeVisible();
 });
 const nav=page.getByRole('navigation',{name:'Settings',exact:true});
 const open=async(label)=>{await nav.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.settings-heading h1')).toHaveText(label);};
 await check('All Settings destinations render',async()=>{
  for(const label of ['User & Team','Integration','Objects','Fields','Custom Objects','Data Model Builder','Channels','Inbox Center','Inbox Queue Customization','Conversation Sidebar Context','Conversation Routing']){
   await open(label);await expect(page.locator('.settings-surface')).toBeVisible();
   await page.waitForTimeout(500);
  }
 });
 await check('Existing object fields, custom filter and ERD',async()=>{
  await open('Fields');await expect(page.getByRole('tab',{name:'Thuộc tính',exact:true})).toHaveAttribute('aria-selected','true');
  await open('Custom Objects');await expect(page.locator('.op-sidebar')).toHaveCount(0);await expect(page.locator('#op-object-select optgroup[label="Đối tượng tiêu chuẩn"]')).toHaveCount(0);
  await open('Data Model Builder');await expect(page.locator('.settings-erd svg')).toBeVisible();
  await page.locator('.settings-erd svg [role="button"]').first().focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'← Quay lại sơ đồ dữ liệu'})).toBeVisible();await page.getByRole('button',{name:'← Quay lại sơ đồ dữ liệu'}).click();await expect(page.locator('.settings-erd svg')).toBeVisible();
 });
 await check('Inbox Center and team context preview',async()=>{
  await open('Inbox Center');await expect(page.locator('.settings-rule')).toContainText('1 conversation view');await page.screenshot({path:out+'/inbox-center-desktop.png'});
  await page.getByRole('button',{name:/Conversation Sidebar Context.*Thiết lập sidebar/}).click();
  await expect(page.getByLabel('Conversation sidebar preview')).toBeVisible();await page.screenshot({path:out+'/conversation-context-desktop.png'});
  await page.getByRole('button',{name:'Team views',exact:true}).click();await expect(page.locator('.settings-team-placeholder')).toContainText('1 conversation view');
  await expect(page.locator('.settings-team-placeholder')).toContainText('Chưa có cấu hình team được lưu');
  await open('Inbox Queue Customization');await expect(page.getByRole('heading',{name:'Default queues',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Custom queues',exact:true})).toBeVisible();await page.screenshot({path:out+'/queues-desktop.png'});
 });
 await check('Back, forward and reload',async()=>{
  await open('Inbox Center');await open('Conversation Sidebar Context');await page.goBack();await expect(page.locator('.settings-heading h1')).toHaveText('Inbox Center');await page.goForward();await expect(page.locator('.settings-heading h1')).toHaveText('Conversation Sidebar Context');await page.reload();await expect(page.locator('.settings-heading h1')).toHaveText('Conversation Sidebar Context');
 });
 await check('Legacy administration URLs',async()=>{
  for(const [query,title,id] of [['screen=admin','User & Team','users'],['screen=schema','Objects','objects'],['screen=routing','Conversation Routing','routing'],['facebook=cancelled','Channels','channels']]){
   await page.goto(origin+'/?'+query);await expect(page.locator('.settings-heading h1')).toHaveText(title);expect(new URL(page.url()).searchParams.get('setting')).toBe(id);
  }
 });
 await check('Unsaved changes protect section navigation',async()=>{
  await open('User & Team');await page.getByRole('button',{name:'Teams',exact:true}).click();await page.getByRole('button',{name:'Thêm mới',exact:true}).click();await page.getByLabel('Tên',{exact:true}).fill('Unsaved layout smoke');
  await nav.getByRole('button',{name:'User & Team',exact:true}).click();await expect(page.locator('.crm-workspace')).toHaveAttribute('data-unsaved','true');await expect(page.getByLabel('Tên',{exact:true})).toHaveValue('Unsaved layout smoke');
  page.once('dialog',dialog=>dialog.dismiss());await nav.getByRole('button',{name:'Channels',exact:true}).click();await expect(page.locator('.settings-heading h1')).toHaveText('User & Team');
  page.once('dialog',dialog=>dialog.accept());await nav.getByRole('button',{name:'Inbox Center',exact:true}).click();await expect(page.locator('.settings-heading h1')).toHaveText('Inbox Center');
 });
 await check('Mobile 390 and 320 navigation and overflow',async()=>{
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Danh mục Settings',exact:true}).click();await expect(nav).toBeVisible();await page.screenshot({path:out+`/settings-menu-${width}.png`});
   await nav.getByRole('button',{name:'Conversation Sidebar Context',exact:true}).click();await expect(page.getByLabel('Conversation sidebar preview')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:out+`/context-${width}.png`});
   for(const label of ['Fields','Integration','User & Team']){await page.getByRole('button',{name:'Danh mục Settings',exact:true}).click();await nav.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('.settings-heading h1')).toHaveText(label);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  }
 });
 await context.close();
 const viewer=await login('read_only');
 await check('Read-only account cannot open administration',async()=>{
  await expect(viewer.page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);await viewer.page.goto(origin+'/?screen=settings&setting=users');await viewer.page.getByLabel('Chọn tổ chức',{exact:true}).selectOption({index:1});await expect(viewer.page.getByRole('heading',{name:'Không có quyền truy cập mục Settings này'})).toBeVisible();await expect(viewer.page.locator('.crm-editor')).toHaveCount(0);
 });
 await viewer.context.close();
 expect(errors).toEqual([]);
 await writeFile(out+'/browser.json',JSON.stringify({status:'PASS',checks,pageErrors:errors,serverFailures:failures,businessMutations:0},null,2));
}catch(error){await writeFile(out+'/browser.json',JSON.stringify({status:'FAIL',checks,pageErrors:errors,serverFailures:failures,error:String(error)},null,2));throw error;}finally{await browser.close();}
