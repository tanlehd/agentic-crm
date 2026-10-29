import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'vite';
import {chromium,expect} from '@playwright/test';

const dir='artifacts/chat-extraction/workspace-source-20261024',webRequire=createRequire(resolve('apps/web/package.json'));
await mkdir(dir,{recursive:true});
const aliases=['react','react/jsx-runtime','react/jsx-dev-runtime','react-dom/client','@tanstack/react-query'].map(name=>({find:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),replacement:webRequire.resolve(name)}));
const bundle=await build({configFile:false,root:process.cwd(),logLevel:'error',resolve:{alias:aliases},oxc:{jsx:{runtime:'automatic'}},build:{write:false,minify:false,rollupOptions:{input:resolve('scripts/fixtures/chat-workspace-source.tsx'),output:{entryFileNames:'fixture.js'}}}});
const assets=new Map((Array.isArray(bundle)?bundle.flatMap(b=>b.output):bundle.output).map(output=>['/'+output.fileName,output]));
const server=createServer((req,res)=>{
 if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<html><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');return;}
 const asset=assets.get(req.url);if(!asset){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',asset.type==='chunk'?'text/javascript':asset.fileName.endsWith('.css')?'text/css':'application/octet-stream');res.end(asset.type==='chunk'?asset.code:asset.source);
});
let browser;
const checks=[],id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,tenant=id(1),conversation=id(2),contact=id(3),s1=id(4),s2=id(5),s3=id(6),leadA=id(7),leadB=id(8);
const session=(sid,sequence,status='active')=>({id:sid,sequence:String(sequence),status,source_classification:'organic',opened_at:'2026-10-24T00:00:00.000Z'});
const record=(rid,kind='lead')=>({id:rid,object_key:kind,version:'1',archived:false,fields:{contact_id:contact,status:'new',title:'Synthetic '+rid.slice(-2),stage:'open',amount:'0',currency:'VND'}});
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;console.log('Fixture listening');
 browser=await chromium.launch({channel:'msedge',headless:true,timeout:15000,args:['--disable-gpu']});console.log('Browser launched');
 async function setup(){
  const page=await browser.newPage(),posts=[],errors=[],state={sessions:[session(s1,1)],failNext:false,denyNext:false};console.log('Page created');page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
  await page.route('**/auth/csrf',r=>r.fulfill({json:{data:{csrf_token:'synthetic-fixture-only'}}}));
  await page.route('**/api/v1/**',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(req.method()==='POST'){
    assert(['/api/v1/leads','/api/v1/deals'].includes(url.pathname),'Unexpected write '+url.pathname);
    posts.push({path:url.pathname,body:req.postDataJSON(),key:req.headers()['idempotency-key'],tenant:req.headers()['x-tenant-id']});
    if(state.failNext){state.failNext=false;return r.fulfill({status:503,json:{error:{code:'DEPENDENCY_UNAVAILABLE'}}});}
    if(state.denyNext){state.denyNext=false;return r.fulfill({status:403,json:{error:{code:'FORBIDDEN'}}});}
    return r.fulfill({json:{data:record(id(20),url.pathname.endsWith('deals')?'deal':'lead')}});
   }
   if(url.pathname.endsWith('/acquisition-sessions'))return r.fulfill({json:{data:state.sessions,next_before_sequence:null}});
   if(url.pathname==='/api/v1/leads'||url.pathname==='/api/v1/deals')return r.fulfill({json:{data:url.pathname.endsWith('leads')?[record(leadA),record(leadB)]:[],next_cursor:null}});
   if(/^\/api\/v1\/(leads|deals)\/[^/]+$/.test(url.pathname))return r.fulfill({json:{data:record(url.pathname.split('/').at(-1),url.pathname.includes('/deals/')?'deal':'lead')}});
   if(url.pathname==='/api/v1/objects/contact/records')return r.fulfill({json:{data:[{id:contact,fields:{display_name:'Synthetic contact'}}]}});
   if(url.pathname.endsWith('/session-context')||url.pathname.endsWith('/merges'))return r.fulfill({json:{data:[]}});
   // Unrelated progress/classification panels fail visibly; no fake domain effects.
   return r.fulfill({status:503,json:{error:{code:'SYNTHETIC_UNRELATED_PANEL'}}});
  });
  await page.goto(origin+'/fixture',{waitUntil:'domcontentloaded',timeout:15000});console.log('Fixture DOM loaded');await expect(page.getByRole('button',{name:'Tạo Lead cho nhu cầu mới',exact:true})).toBeVisible();
  const setSessions=async rows=>{state.sessions=rows;await page.evaluate(({tenant,conversation,rows})=>window.workspaceSourceFixture.sessions(tenant,conversation,rows),{tenant,conversation,rows});};
  const finish=async name=>{assert.deepEqual(errors,[]);checks.push(name);console.log('PASS '+name);await page.close();};
  return {page,posts,state,setSessions,finish};
 }
 {
  const {page,posts,state,setSessions,finish}=await setup();
  await page.getByRole('button',{name:'Tạo Lead cho nhu cầu mới',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Nhu cầu mới'});
  await dialog.getByLabel('Nguồn khai báo').selectOption('referral');
  await setSessions([session(s2,2),session(s1,1,'closed')]);
  await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Nguồn khai báo')).toHaveValue('referral');
  state.failNext=true;await dialog.getByRole('button',{name:'Tạo Lead',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();
  await setSessions([session(s3,3),session(s2,2,'closed'),session(s1,1,'closed')]);
  await dialog.getByRole('button',{name:'Tạo Lead',exact:true}).click();await expect(dialog).toHaveCount(0);
  assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);assert(posts[0].key);
  assert.deepEqual(posts[0].body,{contact_id:contact,conversation_id:conversation,conversation_session_id:s1,declared_source:'referral'});
  await finish('Lead pins source/draft and same retry key through two session rollovers and 503');
 }
 {
  const {page,posts,setSessions,finish}=await setup();await page.getByRole('button',{name:'Tạo Deal trực tiếp',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Cơ hội mới'});
  await dialog.getByLabel('Tên Deal').fill('Synthetic direct deal');await setSessions([session(s1,1,'closed')]);
  await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Tạo Deal',exact:true}).click();await expect(dialog).toHaveCount(0);
  assert.equal(posts[0].body.conversation_session_id,s1);assert.equal(posts[0].body.contact_id,contact);assert.equal(posts[0].body.conversation_id,conversation);assert.equal(posts[0].body.lead_id,undefined);
  await finish('Direct Deal retains explicit source when its session closes');
 }
 {
  const {page,posts,finish}=await setup();await page.locator(`[data-record-id="${leadA}"]`).click();await page.getByRole('button',{name:'Tạo Deal từ Lead đang chọn'}).click();const dialog=page.getByRole('dialog',{name:'Cơ hội mới'});
  await dialog.getByLabel('Tên Deal').fill('Synthetic inherited deal');
  // Simulate a background selection update while the modal owns the original intent.
  await page.locator(`[data-record-id="${leadB}"]`).evaluate(el=>el.click());await expect(page.getByRole('region',{name:'Hồ sơ đang chọn'})).toContainText(leadB);
  await dialog.getByRole('button',{name:'Tạo Deal',exact:true}).click();await expect(dialog).toHaveCount(0);
  assert.equal(posts[0].body.lead_id,leadA);assert.equal(posts[0].body.conversation_session_id,s1);assert.equal(posts[0].body.source_conversation_session_id,undefined);
  await finish('Deal-from-Lead pins selected Lead and sends context without overriding inherited origin');
 }
 {
  const {page,posts,finish}=await setup();await page.getByRole('button',{name:'Tạo Lead cho nhu cầu mới'}).click();
  await page.evaluate(next=>window.workspaceSourceFixture.configure(next),{tenant:id(30),conversation:id(31),contactId:id(32)});
  await expect(page.getByRole('dialog')).toHaveCount(0);assert.equal(posts.length,0);
  await finish('Tenant/conversation/Contact scope change discards old draft without submitting it');
 }
 for(const kind of ['lead','deal']){
  const {page,posts,finish}=await setup();await page.evaluate(mode=>window.workspaceSourceFixture.configure({mode}),'manual-'+kind);
  await page.getByLabel(kind==='lead'?'Liên hệ':'Liên hệ Deal',{exact:true}).selectOption(contact);
  if(kind==='deal')await page.getByLabel('Tên Deal').fill('Synthetic manual deal');
  await page.getByRole('button',{name:kind==='lead'?'Tạo Lead':'Tạo Deal',exact:true}).click();await expect.poll(()=>posts.length).toBe(1);
  assert.equal(posts[0].body.conversation_id,undefined);assert.equal(posts[0].body.conversation_session_id,undefined);
  await finish('Manual '+kind+' create does not fabricate Chat source');
 }
 {
  const {page,posts,state,finish}=await setup();await page.getByRole('button',{name:'Tạo Lead cho nhu cầu mới'}).click();state.denyNext=true;
  const dialog=page.getByRole('dialog',{name:'Nhu cầu mới'});await dialog.getByRole('button',{name:'Tạo Lead',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('chưa có quyền');await expect(dialog).toBeVisible();assert.equal(posts.length,1);
  await finish('Owner denial remains visible; no successful create or local fallback');
 }
 await writeFile(dir+'/browser.json',JSON.stringify({status:'PASS',environment:'Actual React forms bundled by Vite and served on ephemeral HTTP/Edge; synthetic intercepted owner HTTP, no DB/native Sales acceptance',checks},null,2)+'\n');
}catch(error){console.error(error);throw error;}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
