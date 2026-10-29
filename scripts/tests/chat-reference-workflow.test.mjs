import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateReferences} from '../lib/chat-references.mjs';
const tenant='01900000-0000-7000-8000-000000009401',conversation='01900000-0000-7000-8000-000000009402',run='01900000-0000-7000-8000-000000009403',version='01900000-0000-7000-8000-000000009404';
const selected=()=>Object.fromEntries(['message_acquisition_membership','session_milestone_event','need_follow_up','session_contribution','chat_outbound_job','chat_dispatch_claim','outbound_intent'].map(k=>[k,[]]));
const snapshot=trigger=>({rows:{workflow_run:[{tenant_id:tenant,id:run,version_id:version,context:JSON.stringify({trigger}),status:'completed'}],workflow_version:[{tenant_id:tenant,id:version}],outbox_event:[{tenant_id:tenant,event_type:'automation.conversation_activity.v1',aggregate_id:run,aggregate_version:'1',payload:JSON.stringify({conversation_id:conversation,run_id:run,definition_version_id:version,source_revision:'1'})}]}});
test('migration validates Workflow activity against durable trigger context for canonical and old aliases',async()=>{
 for(const trigger of [{conversation_id:conversation,aggregate_id:conversation},{aggregate_id:conversation}])await validateReferences(snapshot(trigger),selected(),[]);
 await assert.rejects(()=>validateReferences(snapshot({conversation_id:run}),selected(),[]),/AUTOMATION_EVENT_REFERENCE/);
});
