CREATE TABLE `crm_chat`.`audit_entry` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_kind` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `action` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_type` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `outcome` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `changed_fields` json NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `correlation_id` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`id`),
  CONSTRAINT `ck_audit_entry_1` CHECK ((`actor_kind` in (_utf8mb4'human',_utf8mb4'ai',_utf8mb4'service',_utf8mb4'system'))),
  CONSTRAINT `ck_audit_entry_2` CHECK ((`outcome` in (_utf8mb4'accepted',_utf8mb4'denied'))),
  CONSTRAINT `ck_audit_entry_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Chat-owned accepted/denied audit, immutable';

CREATE TABLE `crm_chat`.`chat_claim_request` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `intent_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_digest` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`request_id`),
  KEY `tenant_id` (`tenant_id`,`intent_id`),
  CONSTRAINT `ck_chat_claim_request_1` CHECK ((`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')),
  CONSTRAINT `ck_chat_claim_request_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; D2 claim request digest replay identity';

CREATE TABLE `crm_chat`.`chat_dispatch_claim` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `intent_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempt_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `claim_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `grant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `binding_json` json NOT NULL,
  `resource_json` json NOT NULL,
  `created_at` datetime(6) NOT NULL,
  UNIQUE KEY `chat_claim_attempt` (`tenant_id`,`attempt_id`),
  UNIQUE KEY `chat_claim_id` (`tenant_id`,`claim_id`),
  PRIMARY KEY (`tenant_id`,`intent_id`),
  KEY `tenant_id` (`tenant_id`,`intent_id`,`conversation_id`),
  CONSTRAINT `ck_chat_dispatch_claim_1` CHECK ((`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')),
  CONSTRAINT `ck_chat_dispatch_claim_2` CHECK ((json_type(`binding_json`) = _utf8mb4'OBJECT')),
  CONSTRAINT `ck_chat_dispatch_claim_3` CHECK ((json_type(`resource_json`) = _utf8mb4'OBJECT')),
  CONSTRAINT `ck_chat_dispatch_claim_4` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; D2 immutable intent/attempt/grant claim proof';

CREATE TABLE `crm_chat`.`chat_inbox` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `creator_principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `predicate_schema_version` smallint NOT NULL DEFAULT 1,
  `predicate` json NOT NULL,
  `sort` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `archived_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  KEY `inbox_creator` (`tenant_id`,`creator_principal_id`,`archived_at`,`id`),
  PRIMARY KEY (`tenant_id`,`id`),
  CONSTRAINT `ck_chat_inbox_1` CHECK ((`version` > 0)),
  CONSTRAINT `ck_chat_inbox_2` CHECK ((`predicate_schema_version` = 1)),
  CONSTRAINT `ck_chat_inbox_3` CHECK ((`sort` in (_utf8mb4'latest_message_desc',_utf8mb4'latest_message_asc',_utf8mb4'waiting_longest'))),
  CONSTRAINT `ck_chat_inbox_4` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Saved inbox predicate and creator; never Conversation ACL';

CREATE TABLE `crm_chat`.`chat_inbox_share` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `inbox_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `target_kind` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  KEY `inbox_recipient` (`tenant_id`,`target_kind`,`target_id`,`inbox_id`),
  PRIMARY KEY (`tenant_id`,`inbox_id`,`target_kind`,`target_id`),
  CONSTRAINT `ck_chat_inbox_share_1` CHECK ((`target_kind` in (_utf8mb4'principal',_utf8mb4'team'))),
  CONSTRAINT `ck_chat_inbox_share_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Inbox definition recipients only';

CREATE TABLE `crm_chat`.`chat_outbound_job` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `intent_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempt_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `delegation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `binding_json` json NOT NULL,
  `resource_json` json NOT NULL,
  `phase` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'issue',
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'pending',
  `grant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `claim_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lease_token` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lease_until` datetime(6) NULL,
  `next_attempt_at` datetime(6) NOT NULL,
  `failures` int unsigned NOT NULL DEFAULT 0,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `last_error` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  KEY `fk_chat_outbound_intent` (`tenant_id`,`intent_id`,`conversation_id`),
  KEY `ix_chat_outbound_due` (`status`,`next_attempt_at`,`tenant_id`,`intent_id`),
  PRIMARY KEY (`tenant_id`,`intent_id`),
  UNIQUE KEY `uq_chat_outbound_attempt` (`tenant_id`,`attempt_id`),
  CONSTRAINT `ck_chat_outbound_job_1` CHECK (((json_type(`binding_json`) = _utf8mb4'OBJECT') and (length(`binding_json`) <= 8192))),
  CONSTRAINT `ck_chat_outbound_job_2` CHECK ((((`lease_token` is null) and (`lease_until` is null)) or ((`lease_token` is not null) and (`lease_until` is not null)))),
  CONSTRAINT `ck_chat_outbound_job_3` CHECK ((`phase` in (_utf8mb4'issue',_utf8mb4'payload',_utf8mb4'prepare',_utf8mb4'claim',_utf8mb4'begin',_utf8mb4'deliver'))),
  CONSTRAINT `ck_chat_outbound_job_4` CHECK (((json_type(`resource_json`) = _utf8mb4'OBJECT') and (length(`resource_json`) <= 8192))),
  CONSTRAINT `ck_chat_outbound_job_5` CHECK ((`status` in (_utf8mb4'pending',_utf8mb4'done',_utf8mb4'attention'))),
  CONSTRAINT `ck_chat_outbound_job_6` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_chat_outbound_job_7` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Durable D2 orchestration and scheduler lease';

CREATE TABLE `crm_chat`.`chat_read_rollout_conversation` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `baseline_inbound_seq` bigint unsigned NOT NULL,
  PRIMARY KEY (`tenant_id`,`conversation_id`),
  CONSTRAINT `ck_chat_read_rollout_conversation_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Retained unread baseline per Conversation';

CREATE TABLE `crm_chat`.`chat_read_rollout_principal` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`principal_id`),
  CONSTRAINT `ck_chat_read_rollout_principal_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Retained Human unread rollout enrollment';

CREATE TABLE `crm_chat`.`chat_result_request` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `intent_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_digest` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`request_id`),
  KEY `tenant_id` (`tenant_id`,`intent_id`),
  CONSTRAINT `ck_chat_result_request_1` CHECK ((`tenant_id` <> _utf8mb4'01900000-0000-7000-8000-000000000001')),
  CONSTRAINT `ck_chat_result_request_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; D2 immutable result request digest replay';

CREATE TABLE `crm_chat`.`chat_snippet` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `shortcut` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `archived_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`shortcut`),
  CONSTRAINT `ck_chat_snippet_1` CHECK ((`version` > 0)),
  CONSTRAINT `ck_chat_snippet_2` CHECK ((char_length(`text`) between 1 and 4000)),
  CONSTRAINT `ck_chat_snippet_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Versioned text snippet catalog';

CREATE TABLE `crm_chat`.`chat_workspace_rollout` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `feature_key` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `state` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `watermark` json NOT NULL DEFAULT (json_object()),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`feature_key`),
  CONSTRAINT `ck_chat_workspace_rollout_1` CHECK ((`state` in (_utf8mb4'disabled',_utf8mb4'backfilling',_utf8mb4'ready'))),
  CONSTRAINT `ck_chat_workspace_rollout_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Business-tenant feature rollout checkpoint; not migration journal';

CREATE TABLE `crm_chat`.`consumer_inbox` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `consumer_name` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `processed_at` datetime(6) NULL,
  PRIMARY KEY (`tenant_id`,`consumer_name`,`event_id`),
  KEY `tenant_id` (`tenant_id`,`event_id`),
  CONSTRAINT `ck_consumer_inbox_1` CHECK ((((`status` = _utf8mb4'processing') and (`processed_at` is null)) or ((`status` = _utf8mb4'completed') and (`processed_at` is not null)))),
  CONSTRAINT `ck_consumer_inbox_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Eight Chat handler legacy dedup receipts; producer is logical';

CREATE TABLE `crm_chat`.`conversation` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `record_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `contact_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `contact_identity_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `connection_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'open',
  `active_identity_key` char(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS ((case when (`status` in (_utf8mb4'open',_utf8mb4'pending')) then `contact_identity_id` else NULL end)) STORED,
  `opened_at` datetime(6) NOT NULL,
  `closed_at` datetime(6) NULL,
  `channel` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'mock_messenger',
  `channel_id` char(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (`connection_id`) STORED,
  KEY `fk_conversation_channel` (`tenant_id`,`connection_id`,`channel`),
  KEY `ix_conversation_channel` (`tenant_id`,`channel`,`opened_at`,`record_id`),
  KEY `ix_conversation_channel_id` (`tenant_id`,`channel_id`,`opened_at`,`record_id`),
  KEY `ix_conversation_queue` (`tenant_id`,`opened_at`,`record_id`),
  PRIMARY KEY (`tenant_id`,`record_id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`active_identity_key`),
  UNIQUE KEY `tenant_id_2` (`tenant_id`,`record_id`,`connection_id`),
  KEY `tenant_id_3` (`tenant_id`,`contact_identity_id`,`contact_id`,`connection_id`),
  CONSTRAINT `ck_conversation_1` CHECK ((`status` in (_utf8mb4'open',_utf8mb4'pending',_utf8mb4'closed'))),
  CONSTRAINT `ck_conversation_2` CHECK ((((`status` = _utf8mb4'closed') and (`closed_at` is not null)) or ((`status` <> _utf8mb4'closed') and (`closed_at` is null)))),
  CONSTRAINT `ck_conversation_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Thread lifecycle and canonical Contact/connection binding';

CREATE TABLE `crm_chat`.`conversation_acquisition_session` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sequence` bigint unsigned NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `opening_reason` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `close_reason` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `opened_at` datetime(6) NOT NULL,
  `opening_occurred_at` datetime(6) NOT NULL,
  `closed_at` datetime(6) NULL,
  `source_classification` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `source_channel` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `source_page_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `source_ad_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `source_campaign_id` varchar(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `source_connection_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `source_touchpoint_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `policy_version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `active_conversation_key` char(36) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'active') then `conversation_id` else NULL end)) STORED,
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `uq_acquisition_active` (`tenant_id`,`active_conversation_key`),
  UNIQUE KEY `uq_acquisition_binding` (`tenant_id`,`id`,`conversation_id`),
  UNIQUE KEY `uq_acquisition_sequence` (`tenant_id`,`conversation_id`,`sequence`),
  CONSTRAINT `ck_conversation_acquisition_session_1` CHECK ((((`status` = _utf8mb4'active') and (`closed_at` is null) and (`close_reason` is null)) or ((`status` = _utf8mb4'closed') and (`closed_at` is not null) and (`close_reason` is not null)))),
  CONSTRAINT `ck_conversation_acquisition_session_2` CHECK ((`sequence` >= 1)),
  CONSTRAINT `ck_conversation_acquisition_session_3` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_conversation_acquisition_session_4` CHECK ((`status` in (_utf8mb4'active',_utf8mb4'closed'))),
  CONSTRAINT `ck_conversation_acquisition_session_5` CHECK ((`opening_reason` in (_utf8mb4'first_inbound',_utf8mb4'new_referral',_utf8mb4'after_close'))),
  CONSTRAINT `ck_conversation_acquisition_session_6` CHECK (((`close_reason` is null) or (`close_reason` in (_utf8mb4'agent_closed',_utf8mb4'new_referral')))),
  CONSTRAINT `ck_conversation_acquisition_session_7` CHECK ((`source_classification` in (_utf8mb4'organic',_utf8mb4'paid',_utf8mb4'unknown'))),
  CONSTRAINT `ck_conversation_acquisition_session_8` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable episode/source and active-session uniqueness';

CREATE TABLE `crm_chat`.`conversation_activity` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `activity_seq` bigint unsigned NOT NULL,
  `source_service` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `source_kind` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `source_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_revision` bigint unsigned NOT NULL,
  `kind` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `actor_kind` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `occurred_at` datetime(6) NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  `payload` json NOT NULL,
  UNIQUE KEY `activity_order` (`tenant_id`,`conversation_id`,`activity_seq`),
  UNIQUE KEY `activity_provenance` (`tenant_id`,`source_service`,`source_kind`,`source_id`,`source_revision`,`conversation_id`),
  PRIMARY KEY (`tenant_id`,`id`),
  CONSTRAINT `ck_conversation_activity_1` CHECK ((`activity_seq` > 0)),
  CONSTRAINT `ck_conversation_activity_2` CHECK ((`source_revision` > 0)),
  CONSTRAINT `ck_conversation_activity_3` CHECK ((`source_service` in (_utf8mb4'chat',_utf8mb4'crm',_utf8mb4'workflow',_utf8mb4'chatflow'))),
  CONSTRAINT `ck_conversation_activity_4` CHECK ((`kind` in (_utf8mb4'message',_utf8mb4'note',_utf8mb4'assignment',_utf8mb4'lifecycle',_utf8mb4'snooze',_utf8mb4'tags',_utf8mb4'automation'))),
  CONSTRAINT `ck_conversation_activity_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Minimized source reference timeline, not remote note body';

CREATE TABLE `crm_chat`.`conversation_activity_counter` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `last_seq` bigint unsigned NOT NULL DEFAULT 0,
  `backfilled` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`tenant_id`,`conversation_id`),
  CONSTRAINT `ck_conversation_activity_counter_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Per-thread activity sequence allocator';

CREATE TABLE `crm_chat`.`conversation_read_state` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `last_read_inbound_seq` bigint unsigned NOT NULL DEFAULT 0,
  `revision` bigint unsigned NOT NULL DEFAULT 1,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`conversation_id`,`principal_id`),
  KEY `read_principal` (`tenant_id`,`principal_id`,`conversation_id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`id`),
  CONSTRAINT `ck_conversation_read_state_1` CHECK ((`revision` > 0)),
  CONSTRAINT `ck_conversation_read_state_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Monotonic per-Human read marker';

CREATE TABLE `crm_chat`.`conversation_snooze` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `until_at` datetime(6) NULL,
  `revision` bigint unsigned NOT NULL DEFAULT 1,
  `actor_principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reason` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `last_cause` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`conversation_id`),
  KEY `snooze_due` (`until_at`,`tenant_id`,`conversation_id`),
  CONSTRAINT `ck_conversation_snooze_1` CHECK ((`revision` > 0)),
  CONSTRAINT `ck_conversation_snooze_2` CHECK ((`last_cause` in (_utf8mb4'scheduled',_utf8mb4'rescheduled',_utf8mb4'deadline',_utf8mb4'inbound',_utf8mb4'manual',_utf8mb4'assignment',_utf8mb4'closed'))),
  CONSTRAINT `ck_conversation_snooze_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Deadline overlay; not ownership/lifecycle';

CREATE TABLE `crm_chat`.`conversation_tag` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `normalized_name` varbinary(256) NOT NULL,
  `color` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `archived_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`normalized_name`),
  CONSTRAINT `ck_conversation_tag_1` CHECK ((`version` > 0)),
  CONSTRAINT `ck_conversation_tag_2` CHECK ((`color` in (_utf8mb4'gray',_utf8mb4'blue',_utf8mb4'green',_utf8mb4'amber',_utf8mb4'red',_utf8mb4'purple'))),
  CONSTRAINT `ck_conversation_tag_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Versioned tenant tag definitions including archived';

CREATE TABLE `crm_chat`.`conversation_tag_link` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tag_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`conversation_id`,`tag_id`),
  KEY `tag_conversations` (`tenant_id`,`tag_id`,`conversation_id`),
  CONSTRAINT `ck_conversation_tag_link_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Conversation tag membership';

CREATE TABLE `crm_chat`.`conversation_workspace` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `latest_inbound_seq` bigint unsigned NOT NULL DEFAULT 0,
  `answered_inbound_seq` bigint unsigned NOT NULL DEFAULT 0,
  `last_message_at` datetime(6) NOT NULL,
  `waiting_since` datetime(6) NULL,
  `waiting_metric_state` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'ready',
  `tag_set_revision` bigint unsigned NOT NULL DEFAULT 0,
  `snoozed_until` datetime(6) NULL,
  `snooze_revision` bigint unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`tenant_id`,`conversation_id`),
  KEY `workspace_latest` (`tenant_id`,`last_message_at`,`conversation_id`),
  KEY `workspace_snooze` (`tenant_id`,`snoozed_until`,`conversation_id`),
  KEY `workspace_waiting` (`tenant_id`,`waiting_since`,`conversation_id`),
  CONSTRAINT `ck_conversation_workspace_1` CHECK ((`answered_inbound_seq` <= `latest_inbound_seq`)),
  CONSTRAINT `ck_conversation_workspace_2` CHECK ((`waiting_metric_state` in (_utf8mb4'ready',_utf8mb4'unavailable'))),
  CONSTRAINT `ck_conversation_workspace_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Retained unread/coverage/waiting projection';

CREATE TABLE `crm_chat`.`crm_record` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `object_type_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `owner_principal_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `owner_revision` bigint unsigned NOT NULL DEFAULT 1,
  `custom_values` json NOT NULL DEFAULT (json_object()),
  `archived_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  KEY `ix_record_owner` (`tenant_id`,`object_type_id`,`owner_principal_id`,`updated_at`,`id`),
  KEY `ix_record_team` (`tenant_id`,`object_type_id`,`team_id`,`updated_at`,`id`),
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`,`owner_principal_id`),
  KEY `tenant_id_2` (`tenant_id`,`team_id`),
  UNIQUE KEY `tenant_id_3` (`tenant_id`,`id`),
  CONSTRAINT `ck_crm_record_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_crm_record_2` CHECK ((`owner_revision` >= 1)),
  CONSTRAINT `ck_crm_record_3` CHECK ((json_type(`custom_values`) = _utf8mb4'OBJECT')),
  CONSTRAINT `ck_crm_record_4` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Conversation-only local metadata/owner/version/custom values';

CREATE TABLE `crm_chat`.`idempotency_record` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_kind` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `route_key` varchar(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `key` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `status` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `response_status` int NULL,
  `response_body` json NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NULL,
  KEY `ix_receipt_expiry` (`expires_at`),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`actor_kind`,`actor_id`,`route_key`,`key`),
  UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`),
  CONSTRAINT `ck_idempotency_record_1` CHECK ((`actor_kind` in (_ascii'human',_ascii'ai',_ascii'service',_ascii'system'))),
  CONSTRAINT `ck_idempotency_record_2` CHECK ((`status` in (_ascii'pending',_ascii'completed'))),
  CONSTRAINT `ck_idempotency_record_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Exact legacy HTTP receipt identity/expiry/result';

CREATE TABLE `crm_chat`.`message` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `connection_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `provider_message_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `outbound_intent_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `direction` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `received_at` datetime(6) NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  KEY `ix_message_timeline` (`tenant_id`,`conversation_id`,`received_at`,`id`),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`id`),
  UNIQUE KEY `tenant_id_2` (`tenant_id`,`connection_id`,`provider_message_id`),
  UNIQUE KEY `tenant_id_3` (`tenant_id`,`outbound_intent_id`),
  KEY `tenant_id_4` (`tenant_id`,`conversation_id`,`connection_id`),
  KEY `tenant_id_5` (`tenant_id`,`outbound_intent_id`,`conversation_id`),
  CONSTRAINT `ck_message_1` CHECK ((`direction` in (_utf8mb4'inbound',_utf8mb4'outbound'))),
  CONSTRAINT `ck_message_2` CHECK ((char_length(`text`) between 1 and 4000)),
  CONSTRAINT `ck_message_3` CHECK ((`status` in (_utf8mb4'received',_utf8mb4'queued',_utf8mb4'sending',_utf8mb4'sent',_utf8mb4'failed',_utf8mb4'unknown',_utf8mb4'cancelled'))),
  CONSTRAINT `ck_message_4` CHECK ((((`direction` = _utf8mb4'inbound') and (`status` = _utf8mb4'received') and (`outbound_intent_id` is null) and (`provider_message_id` is not null)) or ((`direction` = _utf8mb4'outbound') and (`status` <> _utf8mb4'received') and (`outbound_intent_id` is not null)))),
  CONSTRAINT `ck_message_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Original message timeline and outbound state';

CREATE TABLE `crm_chat`.`message_acquisition_membership` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `message_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `resolution` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `created_at` datetime(6) NOT NULL,
  KEY `fk_acquisition_member_session` (`tenant_id`,`session_id`,`conversation_id`),
  KEY `ix_acquisition_message` (`tenant_id`,`session_id`,`message_id`),
  PRIMARY KEY (`tenant_id`,`message_id`),
  CONSTRAINT `ck_message_acquisition_membership_1` CHECK ((((`resolution` = _utf8mb4'assigned') and (`session_id` is not null)) or ((`resolution` <> _utf8mb4'assigned') and (`session_id` is null)))),
  CONSTRAINT `ck_message_acquisition_membership_2` CHECK ((`resolution` in (_utf8mb4'assigned',_utf8mb4'unresolved_late',_utf8mb4'unresolved_legacy'))),
  CONSTRAINT `ck_message_acquisition_membership_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Message to episode resolution';

CREATE TABLE `crm_chat`.`message_content` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `message_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `content` json NOT NULL,
  PRIMARY KEY (`tenant_id`,`message_id`),
  CONSTRAINT `ck_message_content_1` CHECK ((json_type(`content`) = _utf8mb4'OBJECT')),
  CONSTRAINT `ck_message_content_2` CHECK ((length(`content`) <= 65536)),
  CONSTRAINT `ck_message_content_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Versioned original rich message JSON';

CREATE TABLE `crm_chat`.`message_workspace` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `message_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `inbound_seq` bigint unsigned NULL,
  `reply_through_inbound_seq` bigint unsigned NULL,
  PRIMARY KEY (`tenant_id`,`message_id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`conversation_id`,`inbound_seq`),
  CONSTRAINT `ck_message_workspace_1` CHECK (((`inbound_seq` is null) or (`inbound_seq` > 0))),
  CONSTRAINT `ck_message_workspace_2` CHECK (((`inbound_seq` is null) or (`reply_through_inbound_seq` is null))),
  CONSTRAINT `ck_message_workspace_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Inbound sequence and reply coverage evidence';

CREATE TABLE `crm_chat`.`need_assessment` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `need_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `values_json` json NOT NULL,
  `pinned_json` json NOT NULL,
  `proposal_json` json NOT NULL,
  `version` bigint unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  KEY `fk_need_assessment_need` (`tenant_id`,`session_id`,`need_id`),
  PRIMARY KEY (`tenant_id`,`need_id`),
  CONSTRAINT `ck_need_assessment_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_need_assessment_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Current need values, Human pins and AI proposal';

CREATE TABLE `crm_chat`.`need_assessment_revision` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `need_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` bigint unsigned NOT NULL,
  `values_json` json NOT NULL,
  `pinned_json` json NOT NULL,
  `proposal_json` json NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`need_id`,`version`),
  CONSTRAINT `ck_need_assessment_revision_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_need_assessment_revision_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable assessment revision history';

CREATE TABLE `crm_chat`.`need_follow_up` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `need_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `run_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`need_id`),
  UNIQUE KEY `uq_need_follow_up_session` (`tenant_id`,`session_id`),
  CONSTRAINT `ck_need_follow_up_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Permanent original-need dedup and recovery episode';

CREATE TABLE `crm_chat`.`outbound_intent` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_kind` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `account_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `owner_revision` bigint unsigned NOT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `idempotency_key` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `provider_message_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `error_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `dispatch_token` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sending_at` datetime(6) NULL,
  `created_at` datetime(6) NOT NULL,
  `chatflow_session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  KEY `account_id` (`account_id`),
  KEY `ix_outbound_work` (`status`,`created_at`,`id`),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`id`),
  UNIQUE KEY `tenant_id_2` (`tenant_id`,`id`,`conversation_id`),
  UNIQUE KEY `tenant_id_3` (`tenant_id`,`actor_id`,`idempotency_key`),
  KEY `tenant_id_4` (`tenant_id`,`conversation_id`),
  KEY `tenant_id_5` (`tenant_id`,`chatflow_session_id`,`conversation_id`),
  CONSTRAINT `ck_outbound_intent_1` CHECK ((`status` in (_utf8mb4'queued',_utf8mb4'sending',_utf8mb4'sent',_utf8mb4'failed',_utf8mb4'unknown',_utf8mb4'cancelled',_utf8mb4'remote_queued',_utf8mb4'remote_sending',_utf8mb4'remote_unknown'))),
  CONSTRAINT `ck_outbound_intent_2` CHECK ((`actor_kind` in (_utf8mb4'human',_utf8mb4'ai'))),
  CONSTRAINT `ck_outbound_intent_3` CHECK ((`owner_revision` >= 1)),
  CONSTRAINT `ck_outbound_intent_4` CHECK ((char_length(`text`) between 1 and 4000)),
  CONSTRAINT `ck_outbound_intent_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Durable actor/owner-bound send intent, unknown delivery retained';

CREATE TABLE `crm_chat`.`outbox_event` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_type` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `schema_version` bigint unsigned NOT NULL DEFAULT 1,
  `aggregate_type` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_version` bigint unsigned NOT NULL,
  `payload` json NOT NULL,
  `correlation_id` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `causation_id` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `actor_kind` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `status` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attempts` bigint unsigned NOT NULL DEFAULT 0,
  `next_attempt_at` datetime(6) NULL,
  `lease_until` datetime(6) NULL,
  `fencing_token` bigint unsigned NOT NULL DEFAULT 0,
  KEY `ix_outbox_lease` (`status`,`lease_until`),
  KEY `ix_outbox_ready` (`status`,`next_attempt_at`),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`id`),
  CONSTRAINT `ck_outbox_event_1` CHECK ((`aggregate_version` >= 1)),
  CONSTRAINT `ck_outbox_event_2` CHECK ((`schema_version` >= 1)),
  CONSTRAINT `ck_outbox_event_3` CHECK ((`actor_kind` in (_ascii'human',_ascii'ai',_ascii'service',_ascii'system'))),
  CONSTRAINT `ck_outbox_event_4` CHECK ((`status` in (_ascii'pending',_ascii'processing',_ascii'dispatched',_ascii'failed'))),
  CONSTRAINT `ck_outbox_event_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Chat-produced legacy events and scheduler state';

CREATE TABLE `crm_chat`.`ownership_history` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `record_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_owner_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `to_owner_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `from_team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `to_team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `owner_revision` bigint unsigned NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `actor_kind` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`,`record_id`,`owner_revision`),
  KEY `tenant_id_2` (`tenant_id`,`from_owner_id`),
  KEY `tenant_id_3` (`tenant_id`,`to_owner_id`),
  KEY `tenant_id_4` (`tenant_id`,`from_team_id`),
  KEY `tenant_id_5` (`tenant_id`,`to_team_id`),
  UNIQUE KEY `tenant_id_6` (`tenant_id`,`id`),
  CONSTRAINT `ck_ownership_history_1` CHECK ((`owner_revision` >= 1)),
  CONSTRAINT `ck_ownership_history_2` CHECK ((`actor_kind` in (_utf8mb4'human',_utf8mb4'ai',_utf8mb4'service',_utf8mb4'system'))),
  CONSTRAINT `ck_ownership_history_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Conversation-only immutable owner/team history';

CREATE TABLE `crm_chat`.`property_index_value` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `record_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `property_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `value_kind` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `string_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  `integer_value` bigint NULL,
  `decimal_value` decimal(20,6) NULL,
  `boolean_value` tinyint NULL,
  `date_value` date NULL,
  `datetime_value` datetime(6) NULL,
  KEY `ix_property_boolean` (`tenant_id`,`property_id`,`boolean_value`,`record_id`),
  KEY `ix_property_date` (`tenant_id`,`property_id`,`date_value`,`record_id`),
  KEY `ix_property_datetime` (`tenant_id`,`property_id`,`datetime_value`,`record_id`),
  KEY `ix_property_decimal` (`tenant_id`,`property_id`,`decimal_value`,`record_id`),
  KEY `ix_property_integer` (`tenant_id`,`property_id`,`integer_value`,`record_id`),
  KEY `ix_property_string` (`tenant_id`,`property_id`,`string_value`,`record_id`),
  PRIMARY KEY (`tenant_id`,`record_id`,`property_id`),
  CONSTRAINT `ck_property_index_value_1` CHECK ((((((((`string_value` is not null) + (`integer_value` is not null)) + (`decimal_value` is not null)) + (`boolean_value` is not null)) + (`date_value` is not null)) + (`datetime_value` is not null)) = 1)),
  CONSTRAINT `ck_property_index_value_2` CHECK ((((`value_kind` = _utf8mb4'string') and (`string_value` is not null)) or ((`value_kind` = _utf8mb4'integer') and (`integer_value` is not null)) or ((`value_kind` = _utf8mb4'decimal') and (`decimal_value` is not null)) or ((`value_kind` = _utf8mb4'boolean') and (`boolean_value` is not null)) or ((`value_kind` = _utf8mb4'date') and (`date_value` is not null)) or ((`value_kind` = _utf8mb4'datetime') and (`datetime_value` is not null)))),
  CONSTRAINT `ck_property_index_value_3` CHECK (((`boolean_value` is null) or (`boolean_value` in (0,1)))),
  CONSTRAINT `ck_property_index_value_4` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Conversation typed custom-value query index; Core definitions remote';

CREATE TABLE `crm_chat`.`record_team_access` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `record_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`tenant_id`,`record_id`,`team_id`),
  KEY `tenant_id` (`tenant_id`,`team_id`),
  CONSTRAINT `ck_record_team_access_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Conversation-only explicit team shares';

CREATE TABLE `crm_chat`.`session_classification` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `values_json` json NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`session_id`),
  CONSTRAINT `ck_session_classification_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_session_classification_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Episode custom values and version';

CREATE TABLE `crm_chat`.`session_contribution` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `revision` bigint unsigned NOT NULL,
  `kind` varchar(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_revision` varchar(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_kind` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `owner_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `owner_revision` bigint unsigned NOT NULL,
  `payload` json NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  KEY `ix_session_contribution_thread` (`tenant_id`,`conversation_id`,`session_id`),
  PRIMARY KEY (`tenant_id`,`session_id`,`revision`),
  UNIQUE KEY `uq_session_contribution_source` (`tenant_id`,`session_id`,`kind`,`source_id`,`source_revision`),
  CONSTRAINT `ck_session_contribution_1` CHECK ((`revision` >= 1)),
  CONSTRAINT `ck_session_contribution_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable source/version handling evidence';

CREATE TABLE `crm_chat`.`session_milestone_event` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `need_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `revision` bigint unsigned NOT NULL,
  `milestone_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `kind` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `supersedes_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `message_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  KEY `fk_milestone_need` (`tenant_id`,`session_id`,`need_id`),
  KEY `fk_milestone_parent` (`tenant_id`,`session_id`,`supersedes_id`),
  KEY `ix_milestone_asof` (`tenant_id`,`session_id`,`recorded_at`),
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `uq_milestone_correction` (`tenant_id`,`supersedes_id`),
  UNIQUE KEY `uq_milestone_revision` (`tenant_id`,`session_id`,`revision`),
  UNIQUE KEY `uq_milestone_session` (`tenant_id`,`session_id`,`id`),
  CONSTRAINT `ck_session_milestone_event_1` CHECK ((((`kind` = _utf8mb4'record') and (`supersedes_id` is null)) or ((`kind` in (_utf8mb4'replace',_utf8mb4'retract')) and (`supersedes_id` is not null)))),
  CONSTRAINT `ck_session_milestone_event_2` CHECK ((`kind` in (_utf8mb4'record',_utf8mb4'replace',_utf8mb4'retract'))),
  CONSTRAINT `ck_session_milestone_event_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Append-only need milestone correction chain';

CREATE TABLE `crm_chat`.`session_need` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `label` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `uq_session_need` (`tenant_id`,`session_id`,`id`),
  CONSTRAINT `ck_session_need_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Need identity within episode';

CREATE TABLE `crm_chat`.`session_process_head` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` bigint unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`),
  CONSTRAINT `ck_session_process_head_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_session_process_head_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Tenant process publication head';

CREATE TABLE `crm_chat`.`session_process_version` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` bigint unsigned NOT NULL,
  `definition` json NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`tenant_id`,`version`),
  CONSTRAINT `ck_session_process_version_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_session_process_version_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable pinned process definition';

CREATE TABLE `crm_chat`.`session_progress` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `process_version` bigint unsigned NOT NULL,
  `stage_key` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` bigint unsigned NOT NULL DEFAULT 1,
  `coverage` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  KEY `fk_session_progress_process` (`tenant_id`,`process_version`),
  PRIMARY KEY (`tenant_id`,`session_id`),
  CONSTRAINT `ck_session_progress_1` CHECK ((`version` >= 1)),
  CONSTRAINT `ck_session_progress_2` CHECK ((`coverage` in (_utf8mb4'full',_utf8mb4'partial'))),
  CONSTRAINT `ck_session_progress_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Episode stage/process/version and coverage';

CREATE TABLE `crm_chat`.`session_stage_event` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `revision` bigint unsigned NOT NULL,
  `from_stage` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `to_stage` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `actor_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`id`),
  UNIQUE KEY `uq_stage_revision` (`tenant_id`,`session_id`,`revision`),
  CONSTRAINT `ck_session_stage_event_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable stage transition evidence';

CREATE TABLE `crm_chat`.`session_touchpoint` (
  `tenant_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `touchpoint_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `occurred_at` datetime(6) NOT NULL,
  `recorded_at` datetime(6) NOT NULL,
  KEY `fk_session_touchpoint_session` (`tenant_id`,`session_id`,`conversation_id`),
  KEY `ix_session_touchpoint` (`tenant_id`,`session_id`,`touchpoint_id`),
  PRIMARY KEY (`tenant_id`,`touchpoint_id`),
  CONSTRAINT `ck_session_touchpoint_1` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable Connector touchpoint references';

CREATE TABLE `crm_chat`.`schema_migration` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` INT UNSIGNED NOT NULL,
  `name` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `checksum` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `started_at` DATETIME(6) NOT NULL,
  `applied_at` DATETIME(6) NULL,
  `error_code` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`tenant_id`,`version`),
  CONSTRAINT `ck_schema_migration_1` CHECK (state IN ('started','applied','failed')),
  CONSTRAINT `ck_schema_migration_2` CHECK (tenant_id = '01900000-0000-7000-8000-000000000001'),
  CONSTRAINT `ck_schema_migration_3` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; system; Own schema lineage, not copied baseline journal';

CREATE TABLE `crm_chat`.`chat_owner_command` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `operation` VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `binding_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `actor_kind` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `delegation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `resource_kind` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `record_version` BIGINT UNSIGNED NULL,
  `owner_revision` BIGINT UNSIGNED NULL,
  `control_revision` BIGINT UNSIGNED NULL,
  `legacy_route` VARCHAR(512) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `legacy_key` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `legacy_request_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `binding_json` JSON NULL,
  `request_json` JSON NULL,
  `result_json` JSON NULL,
  `admission_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `terminal_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `terminal_at` DATETIME(6) NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`command_id`),
  KEY `ix_chat_owner_command_1` (`state`,`updated_at`,`tenant_id`,`command_id`),
  KEY `ix_chat_owner_command_2` (`tenant_id`,`actor_id`,`state`,`command_id`),
  CONSTRAINT `ck_chat_owner_command_1` CHECK (state IN ('prepared','committed','aborted')),
  CONSTRAINT `ck_chat_owner_command_2` CHECK ((state='prepared' AND terminal_at IS NULL AND terminal_digest IS NULL AND binding_json IS NOT NULL AND request_json IS NOT NULL) OR (state IN ('committed','aborted') AND terminal_at IS NOT NULL AND terminal_digest IS NOT NULL)),
  CONSTRAINT `ck_chat_owner_command_3` CHECK (state='aborted' OR (operation IS NOT NULL AND actor_kind IS NOT NULL AND actor_id IS NOT NULL AND resource_kind IS NOT NULL AND resource_id IS NOT NULL AND record_version IS NOT NULL AND owner_revision IS NOT NULL AND control_revision IS NOT NULL)),
  CONSTRAINT `ck_chat_owner_command_4` CHECK (binding_json IS NULL OR JSON_STORAGE_SIZE(binding_json)<=262144),
  CONSTRAINT `ck_chat_owner_command_5` CHECK (request_json IS NULL OR JSON_STORAGE_SIZE(request_json)<=262144),
  CONSTRAINT `ck_chat_owner_command_6` CHECK (result_json IS NULL OR JSON_STORAGE_SIZE(result_json)<=262144),
  CONSTRAINT `ck_chat_owner_command_7` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_owner_command_8` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable prepared binding and permanent terminal/abort receipt; never a reusable authorization grant';

CREATE TABLE `crm_chat`.`chat_owner_dependency` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `slot` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `remote_owner` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `remote_command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `child_key` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `binding_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `receipt_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `request_json` JSON NOT NULL,
  `proof_json` JSON NULL,
  `remote_revision` BIGINT UNSIGNED NOT NULL,
  `next_attempt_at` DATETIME(6) NOT NULL,
  `lease_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lease_until` DATETIME(6) NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`command_id`,`slot`),
  UNIQUE KEY `uq_chat_owner_dependency_1` (`tenant_id`,`remote_owner`,`child_key`),
  KEY `ix_chat_owner_dependency_1` (`state`,`next_attempt_at`,`tenant_id`,`command_id`),
  CONSTRAINT `ck_chat_owner_dependency_1` CHECK (state IN ('prepared','pending','committed','aborted','released')),
  CONSTRAINT `ck_chat_owner_dependency_2` CHECK (JSON_STORAGE_SIZE(request_json)<=262144),
  CONSTRAINT `ck_chat_owner_dependency_3` CHECK (proof_json IS NULL OR JSON_STORAGE_SIZE(proof_json)<=262144),
  CONSTRAINT `ck_chat_owner_dependency_4` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_owner_dependency_5` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Fixed prerequisite slots and durable child command delivery; parent cannot abort while child is unknown';

CREATE TABLE `crm_chat`.`chat_owner_selection` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ordinal` SMALLINT UNSIGNED NOT NULL,
  `resource_kind` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `resource_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `owner_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `team_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `record_version` BIGINT UNSIGNED NOT NULL,
  `owner_revision` BIGINT UNSIGNED NOT NULL,
  `control_revision` BIGINT UNSIGNED NOT NULL,
  `context_json` JSON NOT NULL,
  `candidate_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`tenant_id`,`command_id`,`ordinal`),
  CONSTRAINT `ck_chat_owner_selection_1` CHECK (ordinal < 100),
  CONSTRAINT `ck_chat_owner_selection_2` CHECK (JSON_STORAGE_SIZE(context_json)<=262144),
  CONSTRAINT `ck_chat_owner_selection_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable per-row policy context for admitted bounded read; result snapshot is never permission';

CREATE TABLE `crm_chat`.`chat_event_stream` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `consumer_name` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_type` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `next_sequence` BIGINT UNSIGNED NOT NULL,
  `acked_through` BIGINT UNSIGNED NOT NULL,
  `retained_from` BIGINT UNSIGNED NOT NULL,
  `registration_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`),
  CONSTRAINT `ck_chat_event_stream_1` CHECK (next_sequence >= 1),
  CONSTRAINT `ck_chat_event_stream_2` CHECK (retained_from >= 1),
  CONSTRAINT `ck_chat_event_stream_3` CHECK (acked_through < next_sequence),
  CONSTRAINT `ck_chat_event_stream_4` CHECK (retained_from <= next_sequence),
  CONSTRAINT `ck_chat_event_stream_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_event_stream_6` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Per-tenant subscriber stream, ACK and replay low-watermark';

CREATE TABLE `crm_chat`.`chat_event_delivery` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `consumer_name` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_type` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sequence` BIGINT UNSIGNED NOT NULL,
  `event_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `registration_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `envelope_json` JSON NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `next_attempt_at` DATETIME(6) NOT NULL,
  `attempts` BIGINT UNSIGNED NOT NULL,
  `lease_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lease_until` DATETIME(6) NULL,
  `acked_at` DATETIME(6) NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`),
  UNIQUE KEY `uq_chat_event_delivery_1` (`tenant_id`,`consumer_name`,`event_id`),
  KEY `ix_chat_event_delivery_1` (`state`,`next_attempt_at`,`tenant_id`,`consumer_name`,`sequence`),
  CONSTRAINT `ck_chat_event_delivery_1` CHECK (sequence >= 1),
  CONSTRAINT `ck_chat_event_delivery_2` CHECK (state IN ('pending','acked','quarantined')),
  CONSTRAINT `ck_chat_event_delivery_3` CHECK (JSON_STORAGE_SIZE(envelope_json)<=262144),
  CONSTRAINT `ck_chat_event_delivery_4` CHECK ((state='acked') = (acked_at IS NOT NULL)),
  CONSTRAINT `ck_chat_event_delivery_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_event_delivery_6` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable per-subscription event envelope with durable retry/ACK; outbox event ID is preserved';

CREATE TABLE `crm_chat`.`chat_event_inbox` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `producer` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `consumer_name` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_type` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `aggregate_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `sequence` BIGINT UNSIGNED NOT NULL,
  `event_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `envelope_json` JSON NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `next_attempt_at` DATETIME(6) NOT NULL,
  `attempts` BIGINT UNSIGNED NOT NULL,
  `lease_token` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lease_until` DATETIME(6) NULL,
  `applied_at` DATETIME(6) NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`producer`,`consumer_name`,`event_id`),
  UNIQUE KEY `uq_chat_event_inbox_1` (`tenant_id`,`producer`,`consumer_name`,`aggregate_type`,`aggregate_id`,`sequence`),
  KEY `ix_chat_event_inbox_1` (`state`,`next_attempt_at`,`tenant_id`,`producer`,`consumer_name`),
  CONSTRAINT `ck_chat_event_inbox_1` CHECK (sequence >= 1),
  CONSTRAINT `ck_chat_event_inbox_2` CHECK (state IN ('pending','applied','quarantined')),
  CONSTRAINT `ck_chat_event_inbox_3` CHECK ((state='applied') = (applied_at IS NOT NULL)),
  CONSTRAINT `ck_chat_event_inbox_4` CHECK (JSON_STORAGE_SIZE(envelope_json)<=262144),
  CONSTRAINT `ck_chat_event_inbox_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_event_inbox_6` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Authenticated remote envelope and stream offset; no FK to producer database';

CREATE TABLE `crm_chat`.`chat_control_head` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `conversation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `registry_revision` BIGINT UNSIGNED NOT NULL,
  `control_revision` BIGINT UNSIGNED NOT NULL,
  `cancel_through` BIGINT UNSIGNED NOT NULL,
  `pause_through` BIGINT UNSIGNED NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`conversation_id`),
  CONSTRAINT `ck_chat_control_head_1` CHECK (registry_revision >= 1),
  CONSTRAINT `ck_chat_control_head_2` CHECK (control_revision >= 1),
  CONSTRAINT `ck_chat_control_head_3` CHECK (cancel_through < control_revision),
  CONSTRAINT `ck_chat_control_head_4` CHECK (pause_through < control_revision),
  CONSTRAINT `ck_chat_control_head_5` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_control_head_6` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Cumulative Chat registry/control state used by D2; existing owner revision remains in crm_record';

CREATE TABLE `crm_chat`.`chat_dataset_head` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dataset` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `revision` BIGINT UNSIGNED NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`dataset`),
  CONSTRAINT `ck_chat_dataset_head_1` CHECK (dataset IN ('conversion','stage','progress','routing','registry')),
  CONSTRAINT `ck_chat_dataset_head_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_dataset_head_3` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Tenant fact watermark changed in every relevant local fact/registry transaction';

CREATE TABLE `crm_chat`.`chat_contact_guard` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `contact_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `archive_command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `binding_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `core_revision` BIGINT UNSIGNED NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`contact_id`),
  CONSTRAINT `ck_chat_contact_guard_1` CHECK (state IN ('closing','archived','released')),
  CONSTRAINT `ck_chat_contact_guard_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_contact_guard_3` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Contact archive tombstone/closing fence; protects every delayed ingress and reopen';

CREATE TABLE `crm_chat`.`chat_report_snapshot` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `snapshot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `command_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `dataset` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `watermark` BIGINT UNSIGNED NOT NULL,
  `query_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `snapshot_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `row_count` BIGINT UNSIGNED NOT NULL,
  `page_count` INT UNSIGNED NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`snapshot_id`),
  UNIQUE KEY `uq_chat_report_snapshot_1` (`tenant_id`,`command_id`),
  KEY `ix_chat_report_snapshot_1` (`state`,`expires_at`,`tenant_id`,`snapshot_id`),
  CONSTRAINT `ck_chat_report_snapshot_1` CHECK (state IN ('prepared','released')),
  CONSTRAINT `ck_chat_report_snapshot_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_report_snapshot_3` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Temporary immutable report candidate and source watermark; no authority cache';

CREATE TABLE `crm_chat`.`chat_report_page` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `snapshot_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `page_number` INT UNSIGNED NOT NULL,
  `row_count` SMALLINT UNSIGNED NOT NULL,
  `facts_json` JSON NOT NULL,
  `page_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`tenant_id`,`snapshot_id`,`page_number`),
  CONSTRAINT `ck_chat_report_page_1` CHECK (row_count <= 100),
  CONSTRAINT `ck_chat_report_page_2` CHECK (JSON_STORAGE_SIZE(facts_json)<=262144),
  CONSTRAINT `ck_chat_report_page_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Immutable bounded report facts; payload discarded after release, digest remains in snapshot';

CREATE TABLE `crm_chat`.`chat_writer_gate` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `epoch` BIGINT UNSIGNED NOT NULL,
  `mode` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `manifest_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`),
  CONSTRAINT `ck_chat_writer_gate_1` CHECK (mode IN ('disabled','shadow','active','frozen')),
  CONSTRAINT `ck_chat_writer_gate_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Local startup/write epoch fence; only migration operator changes mode';

CREATE TABLE `crm_chat`.`chat_migration_run` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `run_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `manifest_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `snapshot_digest` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_identity` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `destination_identity` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `source_watermark` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `writer_epoch` BIGINT UNSIGNED NOT NULL,
  `version` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`run_id`),
  CONSTRAINT `ck_chat_migration_run_1` CHECK (state IN ('exporting','copying','validated','active','frozen')),
  CONSTRAINT `ck_chat_migration_run_2` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'),
  CONSTRAINT `ck_chat_migration_run_3` CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Retained business-tenant migration checkpoint, explicit environment identity and validation evidence';

CREATE TABLE `crm_chat`.`chat_migration_chunk` (
  `tenant_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `run_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `table_name` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `chunk_number` INT UNSIGNED NOT NULL,
  `last_key` JSON NOT NULL,
  `row_count` BIGINT UNSIGNED NOT NULL,
  `source_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `target_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `state` VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`tenant_id`,`run_id`,`table_name`,`chunk_number`),
  CONSTRAINT `ck_chat_migration_chunk_1` CHECK (state IN ('copied','validated')),
  CONSTRAINT `ck_chat_migration_chunk_2` CHECK (JSON_STORAGE_SIZE(last_key)<=4096),
  CONSTRAINT `ck_chat_migration_chunk_3` CHECK (tenant_id <> '01900000-0000-7000-8000-000000000001' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='chat; business; Durable replayable import checkpoint committed with exact rows; never update past unverified differences';
