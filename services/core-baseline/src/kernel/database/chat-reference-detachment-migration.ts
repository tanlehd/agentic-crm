import type { Migration } from './migrations.js';

// Existing rows remain intact. These are logical references to the new Chat owner.
export const chatReferenceDetachmentMigration: Migration = {
  version: 45,
  name: 'chat_remote_reference_detachment',
  statements: [
    'ALTER TABLE inbound_delivery DROP FOREIGN KEY inbound_delivery_ibfk_2, DROP FOREIGN KEY inbound_delivery_ibfk_3',
    'ALTER TABLE touchpoint DROP FOREIGN KEY touchpoint_ibfk_4',
    'ALTER TABLE `lead` DROP FOREIGN KEY lead_ibfk_3',
    'ALTER TABLE agent_execution DROP FOREIGN KEY agent_execution_ibfk_1',
    'ALTER TABLE association DROP FOREIGN KEY association_ibfk_2, DROP FOREIGN KEY association_ibfk_3',
    'ALTER TABLE routing_attention DROP FOREIGN KEY routing_attention_ibfk_1',
  ],
};
