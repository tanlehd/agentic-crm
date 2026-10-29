import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {rootSQL} from './chat-native.mjs';

/** Explicit retained candidate only. Never applies the broad legacy detachment script. */
export async function noteCandidateSchema(operator,password,provision){
 const [[db]]=await operator.execute('SELECT DATABASE() db');assert.equal(db.db,'native_identity_test');assert.match(password,/^[a-f0-9]{64}$/);
 const source=await readFile('docs/data/chat-extraction/owner-additions-v1.sql','utf8'),sql=source.match(/CREATE TABLE `crm_core`\.`crm_owner_command` \([\s\S]*?;(?=\r?\n|$)/)?.[0]?.replace('`crm_core`.','');assert(sql);
 const digest=createHash('sha256').update(sql).digest('hex'),path='.local/chat-ownership/note-schema.json';let stamp;
 try{stamp=JSON.parse(await readFile(path,'utf8'));assert.equal(stamp.database,db.db);assert.equal(stamp.digest,digest);}catch(e){if(e.code!=='ENOENT')throw e;}
 const [tables]=await operator.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='crm_owner_command'",[db.db]);
 const [fk]=await operator.execute("SELECT COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME='activity' AND CONSTRAINT_NAME='activity_ibfk_1' ORDER BY ORDINAL_POSITION",[db.db]);
 if(!provision){assert(stamp&&tables.length===1&&fk.length===0,'Run explicit native note provisioning');const [[definition]]=await operator.query('SHOW CREATE TABLE crm_owner_command');assert.equal(stamp.installed,createHash('sha256').update(definition['Create Table']).digest('hex'));return;}
 if(!tables.length)await operator.query(sql);
 const [[before]]=await operator.execute('SELECT COUNT(*) n FROM activity');
 if(fk.length){assert.deepEqual(fk.map(r=>[r.COLUMN_NAME,r.REFERENCED_TABLE_NAME,r.REFERENCED_COLUMN_NAME]),[['tenant_id','crm_record','tenant_id'],['related_record_id','crm_record','id']]);rootSQL('ALTER TABLE native_identity_test.activity DROP FOREIGN KEY activity_ibfk_1;');}
 const [[after]]=await operator.execute('SELECT COUNT(*) n FROM activity');assert.equal(String(before.n),String(after.n));
 const [[definition]]=await operator.query('SHOW CREATE TABLE crm_owner_command');const installed=createHash('sha256').update(definition['Create Table']).digest('hex');if(stamp)assert.equal(stamp.installed,installed);
 rootSQL(`CREATE USER IF NOT EXISTS 't05_crm_note_writer_test'@'%' IDENTIFIED BY '${password}';
 GRANT SELECT,INSERT,UPDATE ON native_identity_test.crm_owner_command TO 't05_crm_note_writer_test'@'%';
 GRANT SELECT ON native_identity_test.object_type TO 't05_crm_note_writer_test'@'%';
 ${['crm_record','activity','ownership_history','audit_entry','outbox_event'].map(t=>`GRANT SELECT,INSERT ON native_identity_test.${t} TO 't05_crm_note_writer_test'@'%';`).join('\n')}`);
 if(!stamp)await writeFile(path,JSON.stringify({database:db.db,digest,installed,detached:'activity_ibfk_1',preservedRows:String(before.n),environment:'retained-test'}),{flag:'wx',mode:0o600});
 console.log('PASS scoped CRM note schema: one reviewed receipt table, related-record FK detached, existing Activity rows preserved');
}
