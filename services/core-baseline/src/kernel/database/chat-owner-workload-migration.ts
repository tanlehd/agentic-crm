import type { Migration } from './migrations.js';

// Forward-only promotion of the reviewed owner-v1 registry vocabulary.
// The four original baseline041 checks remain immutable in its journal.
export const chatOwnerWorkloadMigration: Migration = {
  version: 46,
  name: 'chat_owner_workload_services',
  statements: ['service', 'certificate', 'admission', 'event'].map(part =>
    `ALTER TABLE identity_workload_${part} DROP CHECK identity_workload_${part}_chk_2, ADD CONSTRAINT ck_identity_workload_${part}_owner_v1_services CHECK(service IN ('identity','chat','connector','routing','bff','crm','sales','ai-runtime','chatflow','workflow','reporting'))`),
};
