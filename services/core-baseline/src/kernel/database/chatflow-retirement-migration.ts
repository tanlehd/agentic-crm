import type { Migration } from './migrations.js';

// CHG-20261021-08: explicit retirement, never replay or translate legacy effects.
const affected = `(JSON_SEARCH(v.graph,'one','start_chatflow',NULL,'$.nodes[*].type') IS NOT NULL OR JSON_SEARCH(v.graph,'one','chatflow.completed',NULL,'$.nodes[*].config.event_type') IS NOT NULL)`;
const legacyEvent = `(event_type LIKE 'chatflow.%' OR aggregate_type='chatflow_session' OR (event_type='automation.conversation_activity.v1' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.source_service'))='chatflow'))`;
export const chatflowRetirementMigration: Migration = {version:43,name:'retire_chatflow',statements:[
  `UPDATE workflow_definition d JOIN workflow_version v ON v.tenant_id=d.tenant_id AND v.id=d.active_version_id SET d.enabled=0,d.active_version_id=NULL,d.version=d.version+1 WHERE ${affected}`,
  `UPDATE workflow_run r JOIN workflow_version v ON v.tenant_id=r.tenant_id AND v.id=r.version_id SET r.status='cancelled',r.error_code='CHATFLOW_RETIRED',r.attention=1,r.cancel_pending=0,r.finished_at=UTC_TIMESTAMP(6) WHERE ${affected} AND r.status IN ('queued','running','waiting')`,
  `UPDATE workflow_run r JOIN workflow_version v ON v.tenant_id=r.tenant_id AND v.id=r.version_id SET r.cancel_pending=0 WHERE ${affected} AND r.cancel_pending=1`,
  `UPDATE workflow_step_run s JOIN workflow_run r ON r.tenant_id=s.tenant_id AND r.id=s.run_id SET s.status='cancelled',s.error_code='CHATFLOW_RETIRED',s.lease_until=NULL,s.next_attempt_at=NULL,s.fencing_token=s.fencing_token+1 WHERE r.error_code='CHATFLOW_RETIRED' AND s.status IN ('pending','running')`,
  `UPDATE workflow_wait w JOIN workflow_run r ON r.tenant_id=w.tenant_id AND r.id=w.run_id SET w.status='cancelled' WHERE r.error_code='CHATFLOW_RETIRED' AND w.status='waiting'`,
  // Keep message/intent/dispatch result history. An uncertain send stays unknown.
  `UPDATE message m JOIN outbound_intent i ON i.tenant_id=m.tenant_id AND i.id=m.outbound_intent_id SET m.status=IF(i.status='sending','unknown','cancelled') WHERE i.chatflow_session_id IS NOT NULL AND i.status IN ('queued','sending')`,
  `UPDATE outbound_intent SET status=IF(status='sending','unknown','cancelled'),error_code='CHATFLOW_RETIRED' WHERE chatflow_session_id IS NOT NULL AND status IN ('queued','sending')`,
  `DELETE FROM conversation_activity WHERE source_service='chatflow'`,
  `DELETE i FROM consumer_inbox i JOIN outbox_event e ON e.tenant_id=i.tenant_id AND e.id=i.event_id WHERE ${legacyEvent}`,
  `DELETE FROM outbox_event WHERE ${legacyEvent}`,
  `DELETE FROM consumer_inbox WHERE consumer_name LIKE 'chatflow.%' OR consumer_name='workflow.chatflow.completed.v1'`,
  `DELETE FROM idempotency_record WHERE route_key LIKE '%/chatflows%' OR route_key LIKE '%/chatflow-sessions%'`,
  `DELETE t FROM tool_execution t JOIN agent_execution e ON e.tenant_id=t.tenant_id AND e.id=t.agent_execution_id JOIN chatflow_session s ON s.tenant_id=e.tenant_id AND s.id=e.session_id`,
  `DELETE c FROM agent_capacity_slot c JOIN agent_execution e ON e.tenant_id=c.tenant_id AND e.id=c.execution_id JOIN chatflow_session s ON s.tenant_id=e.tenant_id AND s.id=e.session_id`,
  'DROP TABLE chatflow_turn',
  'DROP TABLE chatflow_node_run',
  `DELETE e FROM agent_execution e JOIN chatflow_session s ON s.tenant_id=e.tenant_id AND s.id=e.session_id`,
  // Drop the old unique index too: retaining only tenant_id would prevent multiple Leads per tenant.
  'ALTER TABLE `lead` DROP FOREIGN KEY lead_ibfk_4, DROP CHECK ck_lead_session_conversation, DROP INDEX tenant_id, DROP INDEX tenant_id_3, DROP COLUMN qualification_session_id',
  'ALTER TABLE outbound_intent DROP FOREIGN KEY outbound_intent_ibfk_4, DROP COLUMN chatflow_session_id',
  'DROP TABLE chatflow_session',
  'ALTER TABLE chatflow_definition DROP FOREIGN KEY chatflow_definition_ibfk_2',
  'DROP TABLE chatflow_version',
  'DROP TABLE chatflow_definition',
  `ALTER TABLE conversation_activity DROP CHECK conversation_activity_chk_3, ADD CONSTRAINT ck_activity_source_current CHECK(source_service IN ('chat','crm','workflow'))`,
  // Keep workload event evidence but revoke all live admissions/certificates.
  `UPDATE identity_workload_admission SET enabled=0,updated_at=UTC_TIMESTAMP(6) WHERE service='chatflow' AND enabled=1`,
  `UPDATE identity_workload_certificate SET revoked=1 WHERE service='chatflow' AND revoked=0`,
  `UPDATE identity_workload_service SET enabled=0,version=version+1,updated_at=UTC_TIMESTAMP(6) WHERE service='chatflow' AND enabled=1`,
]};
