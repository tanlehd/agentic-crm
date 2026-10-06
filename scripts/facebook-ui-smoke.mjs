// Synthetic browser contract checks; never logs in to Facebook or reads live tokens.
import { chromium,expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const base=process.env.FACEBOOK_UI_TEST_ORIGIN??'http://127.0.0.1:3101';
if(!['http://127.0.0.1:3101','http://localhost:3101'].includes(base))throw new Error('LOCAL_UI_TEST_ONLY');
const browser=await chromium.launch({channel:'chrome',headless:true});
const tenant='11111111-1111-4111-8111-111111111111',team='22222222-2222-4222-8222-222222222222',channel='33333333-3333-4333-8333-333333333333',principal='44444444-4444-4444-8444-444444444444';
const requests=[];let configured=true;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/auth/**',async route=>route.fulfill({json:{data:route.request().url().includes('/csrf')?{csrf_token:'synthetic'}:{account_id:principal,display_name:'Synthetic Admin'}}}));
 await page.route('**/api/**',async route=>{const u=new URL(route.request().url());requests.push(u.pathname+u.search);let data={data:[],next_cursor:null};
  if(u.pathname==='/api/v1/me/memberships')data={data:[{id:'membership',tenant_id:tenant,tenant_name:'Synthetic Tenant',seat_code:'admin'}],next_cursor:null};
  else if(u.pathname==='/api/v1/admin/teams')data={data:[{id:team,name:'Demo Support',active:true,purpose:'chat'}],next_cursor:null};
  else if(u.pathname==='/api/v1/crm/context')data={data:{principal_id:principal,capabilities:['read','configure','chat'],grants:[{resource:'integration',action:'read',scope:'all'},{resource:'integration',action:'configure',scope:'all'},{resource:'team',action:'read',scope:'all'},{resource:'conversation',action:'read',scope:'all'}],objects:[]}};
  else if(u.pathname==='/api/v1/admin/channels/facebook/pages')data={data:[{id:channel,channel_id:channel,channel:'messenger',page_id:'100001',app_id:'123',name:'Demo Facebook Page',team_id:team,credential_status:'stored',version:'1',connected_at:'2026-10-06T00:00:00Z'}],next_cursor:null,oauth_configured:configured};
  else if(u.pathname==='/api/v1/admin/channels/facebook/connect'){expect(route.request().postDataJSON()).toEqual({team_id:team});expect(route.request().headers()['x-csrf-token']).toBe('synthetic');data={data:{authorization_url:'https://www.facebook.com/v26.0/dialog/oauth?state=synthetic'}};}
  else if(u.pathname==='/api/v1/conversation-channels')data={data:[{id:channel,channel:'messenger',channel_id:channel,page_id:'100001',channel_name:'Demo Facebook Page'}],next_cursor:null};
  else if(u.pathname==='/api/v1/conversations')data={data:[{id:'55555555-5555-4555-8555-555555555555',contact:{display_name:'Synthetic Customer'},channel:'messenger',channel_id:channel,page_id:'100001',channel_name:'Demo Facebook Page',status:'open',opened_at:'2026-10-06T00:00:00Z',owner_principal_id:null}],next_cursor:null};
  await route.fulfill({json:data});
 });
 await page.route('https://www.facebook.com/**',route=>route.fulfill({contentType:'text/html',body:'<p>Local synthetic OAuth navigation boundary</p>'}));
 await page.goto(base);await page.getByLabel('Chọn tổ chức',{exact:true}).selectOption(tenant);await page.getByRole('button',{name:'Quản trị',exact:true}).click();await page.getByRole('button',{name:'Channels',exact:true}).click();await expect(page.getByText('Demo Facebook Page',{exact:true})).toBeVisible();await page.getByLabel('Nhóm tiếp nhận Page mới').selectOption(team);
 mkdirSync('artifacts/SRC-031',{recursive:true});await page.getByRole('region',{name:'Facebook channels'}).screenshot({path:'artifacts/SRC-031/facebook-admin.png'});
 await page.getByRole('button',{name:'Connect Facebook',exact:true}).click();await page.waitForURL('https://www.facebook.com/**');
 await page.goto(base+'/?facebook=connected');await expect(page.getByText('Đã kết nối Facebook và lưu danh sách Page.',{exact:true})).toBeVisible();
 configured=false;await page.getByRole('button',{name:'Tải lại Page',exact:true}).click();await expect(page.getByRole('button',{name:'Connect Facebook',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Chat',exact:true}).click();await page.getByLabel('Kênh',{exact:true}).selectOption('messenger');await page.getByLabel('Page',{exact:true}).selectOption(channel);await page.getByLabel('Page ID',{exact:true}).fill('100001');await page.getByRole('button',{name:'Lọc theo Page ID',exact:true}).click();
 await expect.poll(()=>requests.some(u=>u.includes('/conversations?')&&u.includes('channel=messenger')&&u.includes('channel_id='+channel)&&u.includes('page_id=100001'))).toBe(true);
 await page.getByLabel('Chat inbox').screenshot({path:'artifacts/SRC-031/channel-inbox.png'});
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Chat inbox').screenshot({path:'artifacts/SRC-031/channel-mobile.png'});expect(errors).toEqual([]);
 console.log('PASS: real Next UI with synthetic API, Page catalog/connect redirect/callback/config missing and server-filter requests; screenshots saved. No live Facebook requests.');
}finally{await browser.close();}
