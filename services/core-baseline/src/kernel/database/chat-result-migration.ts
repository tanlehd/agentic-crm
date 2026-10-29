import type {Migration} from './migrations.js';
import {PLATFORM_TENANT_ID} from './system-scope.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const chatResultMigration:Migration={version:40,name:'chat_native_dispatch_result',statements:[
 `CREATE TABLE chat_result_request(tenant_id ${id} NOT NULL CHECK(tenant_id<>'${PLATFORM_TENANT_ID}'),request_id ${id} NOT NULL,intent_id ${id} NOT NULL,request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,created_at DATETIME(6) NOT NULL,PRIMARY KEY(tenant_id,request_id),FOREIGN KEY(tenant_id,intent_id) REFERENCES chat_dispatch_claim(tenant_id,intent_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT='Chat; immutable Connector terminal-result replay receipt'`,
]};
