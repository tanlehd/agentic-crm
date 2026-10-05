import type { Migration } from './migrations.js';
export const chatflowProposalMigration:Migration={version:16,name:'chatflow_runtime_proposals',statements:[
  'ALTER TABLE chatflow_node_run ADD proposed_reply TEXT NULL CHECK(proposed_reply IS NULL OR CHAR_LENGTH(proposed_reply) BETWEEN 1 AND 4000)',
]};
