import type { Migration } from './migrations.js';
// Follow-up to v14: a nullable member of a composite FK bypasses its check in MySQL.
export const chatflowBindingMigration:Migration={version:15,name:'chatflow_binding_guards',statements:[
  'ALTER TABLE `lead` ADD CONSTRAINT ck_lead_session_conversation CHECK(qualification_session_id IS NULL OR conversation_id IS NOT NULL)',
]};
