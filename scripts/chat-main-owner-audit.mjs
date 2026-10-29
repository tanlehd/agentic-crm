// Offline diagnostic only: no SQL writes and no activation authority.
import {writeFile} from 'node:fs/promises';
import {loadMainPreflight} from './lib/chat-main-preflight.mjs';
import {selectMainSnapshot} from './lib/chat-main-selection.mjs';
import {mainEvidenceDirectory} from './lib/chat-main-evidence.mjs';
import {canonical,sha} from './lib/chat-exact.mjs';
import {mainOwnerPlan} from './lib/chat-main-owner-plan.mjs';
const snapshot=await loadMainPreflight(),plan=await selectMainSnapshot(snapshot),{rows}=snapshot;
const by=(table,t,id,col='id')=>(rows[table]??[]).find(r=>r.tenant_id===t&&r[col]===id);
const issues=[];
for(const w of rows.routing_work_item){
 const s=by('conversation_acquisition_session',w.tenant_id,w.session_id),r=s&&by('crm_record',w.tenant_id,s.conversation_id);
 const allocations=rows.routing_human_allocation.filter(a=>a.tenant_id===w.tenant_id&&a.work_id===w.id&&a.released_at===null);
 const ref=sha(canonical({tenant:w.tenant_id,work:w.id}));
 if(!s||!r||w.conversation_id!==s.conversation_id)issues.push({code:'ROUTING_WORK_BINDING',ref});
 else if(s.status==='closed'&&w.state!=='completed'||s.status!=='closed'&&w.state==='completed')issues.push({code:'ROUTING_WORK_STATE',ref});
 else if(allocations.length>1||allocations.some(a=>s.status==='closed'||a.principal_id!==r.owner_principal_id))issues.push({code:'ROUTING_ALLOCATION_OWNER',ref});
}
const ownerPlan=mainOwnerPlan(snapshot,plan);
const report={purpose:'diagnostic-only-not-importable',snapshotDigest:sha(canonical(snapshot.manifest)),ownerPlanDigest:ownerPlan.digest,ownerRows:Object.fromEntries(Object.entries(ownerPlan.tables).map(([t,r])=>[t,r.length])),
 sourceVersion:43,tenants:snapshot.manifest.tenants.length,chatTables:plan.dictionary.tables.length,
 noteChildren:plan.mappings.filter(m=>m.child_command_id).length,
 counts:Object.fromEntries(['account','conversation_acquisition_session','routing_work_item','routing_human_allocation','routing_human_profile','routing_queue','service_actor','identity_dispatch_delegation'].map(t=>[t,rows[t].length])),
 activeAllocations:rows.routing_human_allocation.filter(a=>a.released_at===null).length,
 activeSessions:rows.conversation_acquisition_session.filter(s=>s.status==='active').length,
 routingActors:snapshot.manifest.tenants.map(t=>({tenantDigest:sha(t),count:rows.service_actor.filter(a=>a.tenant_id===t&&a.key==='human_routing_dispatch').length})),
 objectTypes:snapshot.manifest.tenants.map(t=>({tenantDigest:sha(t),keys:rows.object_type.filter(o=>o.tenant_id===t&&o.kind==='standard'&&!o.archived_at).map(o=>o.key).sort()})),
 issues,status:issues.length?'NO_GO':'SOURCE_CONSISTENT'};
await writeFile((await mainEvidenceDirectory())+'/main-owner-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
