import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const require=createRequire(new URL('../apps/backend/package.json',import.meta.url));const {createConnection}=require('mysql2/promise');
const env=parseEnv(await readFile('.env','utf8'));assert.equal(env.APP_ENV,'development');assert.equal(env.MYSQL_DATABASE,'agentic_crm');
const options={host:'127.0.0.1',port:Number(env.LOCAL_MYSQL_PORT??13306),database:env.MYSQL_DATABASE};
const app=await createConnection({...options,user:env.MYSQL_USER,password:env.MYSQL_PASSWORD}),auth=await createConnection({...options,user:env.MYSQL_AUTH_USER,password:env.MYSQL_AUTH_PASSWORD});
try{
 for(const table of ['account_credential','auth_session','auth_token','auth_challenge','auth_attempt','system_audit_entry'])await assert.rejects(app.query(`SELECT * FROM ${table} LIMIT 0`),{code:'ER_TABLEACCESS_DENIED_ERROR'});
 await assert.rejects(app.query('UPDATE account SET security_revision=security_revision WHERE 1=0'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
 await assert.rejects(auth.query('SELECT * FROM membership LIMIT 0'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
 await assert.rejects(auth.query('UPDATE account SET native_status=native_status WHERE 1=0'));
 await assert.rejects(auth.query('DELETE FROM system_audit_entry WHERE 1=0'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
 await auth.query('SELECT id,security_revision FROM account LIMIT 0');await auth.query('SELECT token_hash FROM auth_session LIMIT 0');
 await writeFile('artifacts/SRC-038/grants.json',JSON.stringify({result:'PASS',credentialIsolation:true,authRoleIsolated:true,auditAppendOnly:true}));console.log('PASS runtime/auth database privilege isolation');
}finally{await app.end();await auth.end();}
