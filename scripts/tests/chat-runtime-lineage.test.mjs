import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeLineage,validateRuntimeJournal} from '../../services/chat/dist/runtime-lineage.js';
import {readyCapabilities,capabilityRequirements} from '../../services/chat/dist/capabilities.js';
const system='01900000-0000-7000-8000-000000000001';
test('Chat packaged lineage rejects foreign partial extra and tampered journals',async()=>{
 const steps=await runtimeLineage(),rows=steps.map(step=>({...step,tenant_id:system,state:'applied',applied_at:'2026-10-22 00:00:00',error_code:null}));
 assert.equal(steps.length,4);validateRuntimeJournal(rows,steps);
 for(const change of [{tenant_id:'01900000-0000-7000-8000-000000004101'},{version:43},{name:'baseline043'},{checksum:'0'.repeat(64)},{state:'failed'},{state:'started'},{applied_at:null},{error_code:'OPERATOR_REVIEW'}]){const bad=structuredClone(rows);Object.assign(bad[2],change);assert.throws(()=>validateRuntimeJournal(bad,steps),/LINEAGE_MISMATCH/);}
 assert.throws(()=>validateRuntimeJournal(rows.slice(0,-1),steps),/LINEAGE_MISMATCH/);assert.throws(()=>validateRuntimeJournal([...rows,rows[0]],steps),/LINEAGE_MISMATCH/);assert.throws(()=>validateRuntimeJournal([...rows].reverse(),steps),/LINEAGE_MISMATCH/);
});
test('Schema alone cannot advertise capability without every handler and completed backfill',()=>{
 const all=new Set(Object.values(capabilityRequirements).flat());
 assert.deepEqual(readyCapabilities(new Set(),true,true,true,true),[]);
 assert.deepEqual(readyCapabilities(all,true,true,true,true),Object.keys(capabilityRequirements));
 assert.deepEqual(readyCapabilities(all,false,true,true,true),['owner_v1']);
 assert(!readyCapabilities(all,true,false,true,true).includes('activity_v1'));
 assert(!readyCapabilities(all,true,true,false,true).includes('activity_v1'));
 assert(!readyCapabilities(all,true,true,true,false).includes('activity_v1'));
 for(const [capability,required] of Object.entries(capabilityRequirements))for(const route of required){const missing=new Set(all);missing.delete(route);assert(!readyCapabilities(missing,true,true,true,true).includes(capability),route);}
});
