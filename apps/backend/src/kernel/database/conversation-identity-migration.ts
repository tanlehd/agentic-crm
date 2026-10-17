import type {Migration} from './migrations.js';
// Coordinated writer cutover; applied migrations 31 and 33 remain immutable.
export const conversationIdentityMigration:Migration={version:34,name:'canonical_conversation_identity',statements:[
 ...['session_contribution','need_assessment','need_follow_up','sales_need_outcome'].map(table=>`ALTER TABLE ${table} RENAME COLUMN thread_id TO conversation_id`),
]};
