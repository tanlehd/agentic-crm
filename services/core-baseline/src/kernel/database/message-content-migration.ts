import type { Migration } from './migrations.js';
const id='CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
export const messageContentMigration:Migration={version:18,name:'normalized_message_content',statements:[
  `CREATE TABLE message_content(tenant_id ${id} NOT NULL,message_id ${id} NOT NULL,content JSON NOT NULL,CHECK(JSON_TYPE(content)='OBJECT'),CHECK(OCTET_LENGTH(content)<=65536),PRIMARY KEY(tenant_id,message_id),FOREIGN KEY(tenant_id,message_id) REFERENCES message(tenant_id,id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs`,
]};
