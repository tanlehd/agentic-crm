import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMainFence} from '../lib/chat-main-fence.mjs';
const accounts=[{user:'root',host:'localhost',locked:false},{user:'crm_migrate',host:'%',locked:false},{user:'crm_app',host:'%',locked:true}];
test('final export refuses an unlocked legacy account or its surviving connection',()=>{
 assert.throws(()=>validateMainFence(accounts.map(a=>({...a,locked:false})),[],'crm_migrate'),/NOT_LOCKED/);
 assert.throws(()=>validateMainFence(accounts,[{user:'crm_app'}],'crm_migrate'),/CONNECTIONS/);
 const result=validateMainFence(accounts,[{user:'crm_migrate'}],'crm_migrate');assert.equal(result.fence.accounts.length,1);assert.equal(result.fence.activeSourceWriters,0);
 assert.throws(()=>validateMainFence([],[],'crm_migrate'),/NOT_LOCKED/);
 assert.throws(()=>validateMainFence(accounts,[],'root'),/OPERATOR_REQUIRED/);
});
