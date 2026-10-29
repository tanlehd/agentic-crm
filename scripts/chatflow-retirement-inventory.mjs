import {rootSQL} from './lib/chat-native.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const queries={
 indexes:"SELECT INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='agentic_crm' AND TABLE_NAME='lead' GROUP BY INDEX_NAME",
 tables:"SELECT TABLE_SCHEMA,TABLE_NAME FROM information_schema.TABLES WHERE TABLE_NAME LIKE 'chatflow%' ORDER BY 1,2",
 refs:"SELECT TABLE_SCHEMA,TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME LIKE 'chatflow%' ORDER BY 1,2,3,ORDINAL_POSITION",
 columns:"SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE COLUMN_NAME IN ('qualification_session_id','chatflow_session_id') ORDER BY 1,2",
 checks:"SELECT CONSTRAINT_NAME,CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='agentic_crm' AND (CHECK_CLAUSE LIKE '%chatflow%' OR CHECK_CLAUSE LIKE '%qualification_session%')",
 versions:"SELECT 'main',MAX(version) FROM agentic_crm.schema_migration UNION ALL SELECT 'native',MAX(version) FROM native_identity_test.schema_migration",
};
const result=Object.fromEntries(Object.entries(queries).map(([k,sql])=>[k,rootSQL(sql)]));
for(const db of ['agentic_crm','native_identity_test'])result[db]=rootSQL(['chatflow_definition','chatflow_version','chatflow_session','chatflow_node_run','chatflow_turn','lead','conversation','message','agent_execution'].map(t=>`SELECT '${t}',COUNT(*) FROM ${db}.\`${t}\``).join(' UNION ALL '));
await mkdir('artifacts/chatflow-retirement',{recursive:true});
await writeFile('artifacts/chatflow-retirement/inventory.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
