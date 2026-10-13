import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

// Persistent synthetic drafts are retained; a newly saved UUID need not be on page one.
export async function reopenReport(page,name){
 const details=page.locator('.rpt-library details');if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
 const load=async(label)=>{
  const pending=page.waitForResponse(r=>r.request().method()==='GET'&&r.url().includes('/api/v1/reporting/definitions?'));
  await page.getByRole('button',{name:label,exact:true}).click();const response=await pending;assert.equal(response.status(),200);const items=(await response.json()).data.items;
  if(items.length){const last=items.at(-1);await expect(page.locator('.rpt-drafts').getByRole('button',{name:last.name+' v'+last.revision+(last.archived?' · Đã lưu trữ':''),exact:true}).first()).toBeVisible();}
 };
 await load('Làm mới thư viện');
 const target=page.locator('.rpt-drafts').getByRole('button',{name:name+' v1',exact:true}).first();
 for(let i=0;i<100&&!await target.count();i++){
  assert(await page.getByRole('button',{name:'Tải thêm draft',exact:true}).count(),'Saved draft absent from complete library');await load('Tải thêm draft');
 }
 await target.click();
}
