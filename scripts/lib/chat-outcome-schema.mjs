import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {rootSQL} from './chat-native.mjs';

export async function outcomeCandidateSchema(operator,password,provision){
 const [[db]]=await operator.execute('SELECT DATABASE() db');assert.equal(db.db,'native_identity_test');assert.match(password,/^[a-f0-9]{64}$/);
 const source=await readFile('docs/data/chat-extraction/owner-additions-v1.sql','utf8'),sql=source.match(/CREATE TABLE `crm_sales`\.`sales_owner_command` \([\s\S]*?;(?=\r?\n|$)/)?.[0]?.replace('`crm_sales`.','');assert(sql);
 const digest=createHash('sha256').update(sql).digest('hex'),path='.local/chat-ownership/outcome-schema.json';let stamp;try{stamp=JSON.parse(await readFile(path,'utf8'));assert.equal(stamp.database,db.db);assert.equal(stamp.digest,digest);}catch(e){if(e.code!=='ENOENT')throw e;}
 const [tables]=await operator.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='sales_owner_command'",[db.db]);
 if(!provision){assert(stamp&&tables.length===1,'Run explicit native outcome provisioning');const [[definition]]=await operator.query('SHOW CREATE TABLE sales_owner_command');assert.equal(stamp.installed,createHash('sha256').update(definition['Create Table']).digest('hex'));return;}
 const [[before]]=await operator.execute('SELECT COUNT(*) n FROM sales_need_outcome');if(!tables.length)await operator.query(sql);const [[after]]=await operator.execute('SELECT COUNT(*) n FROM sales_need_outcome');assert.equal(String(before.n),String(after.n));
 const [[definition]]=await operator.query('SHOW CREATE TABLE sales_owner_command'),installed=createHash('sha256').update(definition['Create Table']).digest('hex');if(stamp)assert.equal(stamp.installed,installed);
 rootSQL(`CREATE USER IF NOT EXISTS 't05_sales_outcome_test'@'%' IDENTIFIED BY '${password}';
 GRANT SELECT,INSERT,UPDATE ON native_identity_test.sales_owner_command TO 't05_sales_outcome_test'@'%';
 GRANT SELECT,INSERT ON native_identity_test.sales_need_outcome TO 't05_sales_outcome_test'@'%';
 ${['crm_record','object_type','record_team_access','lead','deal','sales_session_context'].map(t=>`GRANT SELECT ON native_identity_test.${t} TO 't05_sales_outcome_test'@'%';`).join('\n')}`);
 if(!stamp)await writeFile(path,JSON.stringify({database:db.db,digest,installed,preservedRows:String(before.n),environment:'retained-test'}),{flag:'wx',mode:0o600});console.log('PASS scoped Sales outcome receipt table and retained link preservation');
}
