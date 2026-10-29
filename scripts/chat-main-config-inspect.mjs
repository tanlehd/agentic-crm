// Read-only, minimized local rollout inventory. Never print credential values.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
const files=['.env','.local/services/api.env','.local/services/worker.env','.local/human-outbound/identity.env','.local/human-outbound/chat.env','.local/human-outbound/connector.env','.local/human-outbound/worker.env','.local/human-outbound/config.json'];
const safe=/^(APP_ENV|MYSQL_DATABASE|MYSQL_HOST|MYSQL_PORT|MYSQL_USER|MYSQL_AUTH_USER|MYSQL_MIGRATION_USER|IDENTITY_DISPATCH_USER|ROUTING_OWNER_USER|PORT|WORKLOAD_SERVICE|WORKLOAD_PORT|WORKLOAD_TRANSPORT|WORKLOAD_REGISTRY_URL|CHAT_OWNER_URL|IDENTITY_OWNER_URL|ROUTING_OWNER_URL|CONNECTOR_DB_NAME|CONNECTOR_DB_HOST|CONNECTOR_DB_PORT)$/;
const report=[];
for(const path of files){const text=await readFile(path,'utf8'),values=path.endsWith('.env')?parseEnv(text):JSON.parse(text);report.push({path,sha256:createHash('sha256').update(text).digest('hex'),keys:Object.keys(values).sort(),settings:Object.fromEntries(Object.entries(values).filter(([k])=>safe.test(k)))});}
await mkdir('artifacts/chat-extraction/t09-20261027-02',{recursive:true});await writeFile('artifacts/chat-extraction/t09-20261027-02/config-inventory.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
