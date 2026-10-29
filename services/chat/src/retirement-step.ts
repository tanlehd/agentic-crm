import {createHash} from 'node:crypto';

// Forward-only owner migration; versions 1..3 and their dictionaries remain immutable.
export const retirementStep={version:4,name:'chat004-retire-chatflow',statements:[
 "UPDATE message m JOIN outbound_intent i ON i.tenant_id=m.tenant_id AND i.id=m.outbound_intent_id SET m.status=IF(i.status='sending','unknown','cancelled') WHERE i.chatflow_session_id IS NOT NULL AND i.status IN ('queued','sending')",
 "UPDATE outbound_intent SET status=IF(status='sending','unknown','cancelled'),error_code='CHATFLOW_RETIRED' WHERE chatflow_session_id IS NOT NULL AND status IN ('queued','sending')",
 "DELETE FROM conversation_activity WHERE source_service='chatflow'",
 "DELETE FROM chat_event_delivery WHERE consumer_name='chatflow.chat-control.v1'",
 "DELETE FROM chat_event_stream WHERE consumer_name='chatflow.chat-control.v1'",
 "DELETE FROM chat_event_inbox WHERE producer='chatflow'",
 'ALTER TABLE outbound_intent DROP COLUMN chatflow_session_id',
]};
export const retirementChecksum=createHash('sha256').update(JSON.stringify(retirementStep)).digest('hex');
