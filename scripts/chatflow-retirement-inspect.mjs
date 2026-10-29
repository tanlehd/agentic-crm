import {rootSQL} from './lib/chat-native.mjs';
const queries={
 tests:"SELECT DB,COMMAND,TIME,STATE FROM information_schema.PROCESSLIST WHERE DB LIKE 'retire_%'",
 seed:"SELECT MAX(version) version FROM native_seed_test.schema_migration",
 journal:"SELECT version,state,error_code FROM agentic_crm.schema_migration WHERE version>=42",
 tables:"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='agentic_crm' AND TABLE_NAME LIKE 'chatflow%'",
 columns:"SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='agentic_crm' AND COLUMN_NAME IN ('chatflow_session_id','qualification_session_id')",
 privileges:"SELECT GRANTEE,PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE TABLE_SCHEMA='agentic_crm' ORDER BY 1,2",
};
for(const [name,sql] of Object.entries(queries))console.log(name,rootSQL(sql));
