import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
await mkdir('.local',{recursive:true});
const path='.local/native-auth-test.env';
try{await writeFile(path,`APP_ENV=test\nMYSQL_HOST=127.0.0.1\nMYSQL_PORT=13306\nMYSQL_DATABASE=native_identity_test\nMYSQL_MIGRATION_USER=native_test_operator\nMYSQL_MIGRATION_PASSWORD=${randomBytes(32).toString('hex')}\n`,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
const env=parseEnv(await readFile(path,'utf8'));
if(env.MYSQL_DATABASE!=='native_identity_test'||env.MYSQL_MIGRATION_USER!=='native_test_operator'||!/^[a-f0-9]{64}$/.test(env.MYSQL_MIGRATION_PASSWORD))throw new Error('TEST_CONFIG_DENIED');
const sql=`CREATE DATABASE IF NOT EXISTS native_identity_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
CREATE USER IF NOT EXISTS 'native_test_operator'@'%' IDENTIFIED BY '${env.MYSQL_MIGRATION_PASSWORD}';
GRANT ALL ON native_identity_test.* TO 'native_test_operator'@'%';
CREATE DATABASE IF NOT EXISTS native_connector_test CHARACTER SET utf8mb4;
GRANT ALL ON native_connector_test.* TO 'native_test_operator'@'%';
CREATE DATABASE IF NOT EXISTS native_seed_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
GRANT ALL ON native_seed_test.* TO 'native_test_operator'@'%';`;
const result=spawnSync('docker',['exec','-i','agentic-crm-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot'],{input:sql,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:30000});
if(result.status!==0)throw new Error('TEST_DATABASE_SETUP_FAILED');
console.log('Persistent native test database ready; no reset or dev data mutation.');
