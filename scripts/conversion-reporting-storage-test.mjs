import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {connect} from './lib/reporting-database.mjs';
const env=parseEnv(await readFile('.local/reporting.env','utf8')),c=await connect(env),checks=[];
try{
 const [[w]]=await c.query('SELECT * FROM dashboard_widget WHERE connected_catalog_hash IS NOT NULL LIMIT 1');assert(w);assert.equal(w.generation_id,null);checks.push('connected widget persists catalog pin with NULL mock generation');
 const [[catalog]]=await c.query('SELECT * FROM report_connected_catalog WHERE adapter_id=? LIMIT 1',['native_conversion_v1']);assert(catalog);await c.beginTransaction();await assert.rejects(c.execute('UPDATE report_connected_catalog SET adapter_id=? WHERE tenant_id=? AND binding_id=? AND catalog_hash=?',['unsupported',catalog.tenant_id,catalog.binding_id,catalog.catalog_hash]),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');await c.rollback();checks.push('conversion adapter persisted; unknown adapter rejected');
 const args=[w.tenant_id,w.dashboard_id,w.dashboard_version,w.id];await c.beginTransaction();
 await assert.rejects(c.execute('UPDATE dashboard_widget SET connected_catalog_hash=NULL WHERE tenant_id=? AND dashboard_id=? AND dashboard_version=? AND id=?',args),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');checks.push('no pin rejected by database CHECK');
 await assert.rejects(c.execute('UPDATE dashboard_widget SET connected_catalog_hash=? WHERE tenant_id=? AND dashboard_id=? AND dashboard_version=? AND id=?',['f'.repeat(64),...args]),e=>e.code==='ER_NO_REFERENCED_ROW_2');checks.push('unknown catalog rejected by same-tenant binding FK');
 await c.rollback();const [plan]=await c.execute('EXPLAIN SELECT catalog_hash FROM report_connected_catalog WHERE tenant_id=? AND binding_id=? AND catalog_hash=?',[w.tenant_id,w.binding_id,w.connected_catalog_hash]);assert(plan.some(p=>p.key==='PRIMARY'));checks.push('catalog exact lookup uses primary key');
 const runtime=await connect(env,'RUNTIME');try{await assert.rejects(runtime.execute('UPDATE report_connected_catalog SET adapter_id=adapter_id WHERE tenant_id=?',[w.tenant_id]),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await assert.rejects(runtime.execute('DELETE FROM report_connected_catalog WHERE tenant_id=?',[w.tenant_id]),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');checks.push('runtime metadata is append-only: update and delete denied');}finally{await runtime.end();}
 await writeFile('artifacts/conversion-reporting/storage.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify({status:'PASS',checks}));
}finally{await c.rollback();await c.end();}
