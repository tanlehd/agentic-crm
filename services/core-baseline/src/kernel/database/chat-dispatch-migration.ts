import type {Migration} from './migrations.js';
import {PLATFORM_TENANT_ID} from './system-scope.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const scope=`tenant_id ${id} NOT NULL CHECK(tenant_id<>'${PLATFORM_TENANT_ID}')`;
const engine='ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs';
export const chatDispatchMigration:Migration={version:39,name:'chat_native_dispatch_claim',statements:[
 `CREATE TABLE chat_dispatch_claim(${scope},intent_id ${id} NOT NULL,attempt_id ${id} NOT NULL,claim_id ${id} NOT NULL,grant_id ${id} NOT NULL,conversation_id ${id} NOT NULL,binding_json JSON NOT NULL CHECK(JSON_TYPE(binding_json)='OBJECT'),resource_json JSON NOT NULL CHECK(JSON_TYPE(resource_json)='OBJECT'),created_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,intent_id),UNIQUE KEY chat_claim_attempt(tenant_id,attempt_id),UNIQUE KEY chat_claim_id(tenant_id,claim_id),FOREIGN KEY(tenant_id,intent_id,conversation_id) REFERENCES outbound_intent(tenant_id,id,conversation_id)) ${engine} COMMENT='Chat; immutable owner-admitted dispatch claim, no content'`,
 `CREATE TABLE chat_claim_request(${scope},request_id ${id} NOT NULL,intent_id ${id} NOT NULL,request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,created_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,request_id),FOREIGN KEY(tenant_id,intent_id) REFERENCES chat_dispatch_claim(tenant_id,intent_id)) ${engine} COMMENT='Chat; immutable Connector claim request replay'`,
]};
