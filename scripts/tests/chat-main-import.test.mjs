import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mainImportScope} from '../lib/chat-main-import.mjs';
import {canonical,sha} from '../lib/chat-exact.mjs';
const base=()=>({manifest:{source:{db:'agentic_crm'},sourceJournal:Array(43).fill({}),tenants:['01900000-0000-7000-8000-000000000002'],purpose:'diagnostic-only-not-importable',writersFenced:false}});
test('diagnostic data can only enter the explicit isolated rehearsal target',()=>{
 assert.equal(mainImportScope(base(),'test_t09_chat_import'),'isolated-rehearsal');
 for(const target of ['crm_chat','agentic_crm','test_crm_chat_owner','test_crm_chat_final'])assert.throws(()=>mainImportScope(base(),target),/NO_GO_/);
});
test('main import requires a bound source fence and no active source writer',()=>{
 const snapshot=base(),m=snapshot.manifest;m.purpose='fenced-main-cutover';m.writersFenced=true;m.fence={accounts:[{user:'old_local_writer',locked:true}],activeSourceWriters:0};m.fenceDigest=sha(canonical(m.fence));
 assert.equal(mainImportScope(snapshot,'crm_chat'),'main-local');
 for(const mutate of [x=>x.writersFenced=false,x=>x.fence.accounts[0].locked=false,x=>x.fence.activeSourceWriters=1,x=>x.fence.accounts=[],x=>x.fenceDigest='0'.repeat(64)]){const bad=structuredClone(snapshot);mutate(bad.manifest);assert.throws(()=>mainImportScope(bad,'crm_chat'),/NO_GO_/);}
});
test('main source identity, journal version and tenant inventory are pinned',()=>{
 for(const mutate of [x=>x.source.db='production',x=>x.sourceJournal.pop(),x=>x.tenants.push(x.tenants[0]),x=>x.tenants=[]]){const bad=base();mutate(bad.manifest);assert.throws(()=>mainImportScope(bad,'test_t09_chat_import'),/MAIN_SOURCE43_REQUIRED/);}
});
