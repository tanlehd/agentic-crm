// Local runtime wiring only. Does not change Identity grants, accounts, data or schemas.
import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
const env=parseEnv(await readFile('.env','utf8')),reporting=parseEnv(await readFile('.local/reporting.env','utf8'));
assert.equal(env.APP_ENV,'development');assert.equal(env.MYSQL_DATABASE,'agentic_crm');assert.equal(env.APP_ORIGIN,'http://localhost:18080');assert.equal(reporting.REPORTING_DB_NAME,'crm_reporting');assert.equal(reporting.REPORTING_DB_HOST,'127.0.0.1');assert.equal(reporting.REPORTING_DB_PORT,'13306');
const runtime=Object.fromEntries(Object.entries(reporting).filter(([k])=>!k.startsWith('REPORTING_OPERATOR_')));Object.assign(runtime,{APP_ENV:'development',PORT:'3004',REPORTING_PORT:'3004',REPORTING_HOST:'127.0.0.1'});
await writeFile('.local/services/reporting.env',Object.entries(runtime).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600});
const apiPath='.local/services/api.env';let api=await readFile(apiPath,'utf8');for(const [k,v]of Object.entries({REPORTING_SERVICE_URL:'http://127.0.0.1:3004',REPORTING_ADMISSION_KEY:reporting.REPORTING_ADMISSION_KEY})){const line=k+'='+JSON.stringify(v);api=new RegExp('^'+k+'=.*$','m').test(api)?api.replace(new RegExp('^'+k+'=.*$','m'),line):api+'\n'+line;}
await writeFile(apiPath,api+'\n',{mode:0o600});console.log('PASS local runtime wiring only; restart API and start Reporting to activate.');
