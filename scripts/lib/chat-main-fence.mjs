// Read-only verification. Locking accounts/stopping processes is an explicit
// operator step, never a side effect of export, import or runtime startup.
import {rootSQL} from './chat-native.mjs';
import {canonical,sha} from './chat-exact.mjs';

export function validateMainFence(accounts,sessions,operator){
 if(!/^[a-z][a-z0-9_]{0,40}$/.test(operator)||operator==='root')throw Error('MAIN_OPERATOR_REQUIRED');
 const writers=accounts.filter(a=>!['root',operator].includes(a.user));
 if(!writers.length||writers.some(a=>a.locked!==true))throw Error('MAIN_OLD_WRITERS_NOT_LOCKED');
 const names=new Set(writers.map(a=>a.user));
 const active=sessions.filter(s=>names.has(s.user));
 if(active.length)throw Error('MAIN_OLD_WRITER_CONNECTIONS');
 const fence={accounts:writers.sort((a,b)=>canonical(a).localeCompare(canonical(b))),activeSourceWriters:0,operator};
 return {fence,fenceDigest:sha(canonical(fence))};
}
export function mainWriterInventory(){
 const raw=rootSQL(`SELECT JSON_OBJECT('user',u.User,'host',u.Host,'locked',IF(u.account_locked='Y',true,false))
 FROM mysql.user u WHERE u.Insert_priv='Y' OR u.Update_priv='Y' OR u.Delete_priv='Y' OR u.Create_priv='Y' OR u.Alter_priv='Y'
 OR EXISTS(SELECT 1 FROM mysql.db d WHERE d.User=u.User AND d.Host=u.Host AND 'agentic_crm' LIKE d.Db AND (d.Insert_priv='Y' OR d.Update_priv='Y' OR d.Delete_priv='Y' OR d.Create_priv='Y' OR d.Alter_priv='Y'))
 OR EXISTS(SELECT 1 FROM mysql.tables_priv t WHERE t.User=u.User AND t.Host=u.Host AND t.Db='agentic_crm' AND (FIND_IN_SET('Insert',t.Table_priv)>0 OR FIND_IN_SET('Update',t.Table_priv)>0 OR FIND_IN_SET('Delete',t.Table_priv)>0 OR FIND_IN_SET('Insert',t.Column_priv)>0 OR FIND_IN_SET('Update',t.Column_priv)>0))
 ORDER BY u.User,u.Host;`);
 const accounts=raw.trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)).map(a=>({...a,locked:a.locked===true||a.locked===1}));
 const sessions=rootSQL("SELECT JSON_OBJECT('user',USER) FROM information_schema.PROCESSLIST;").trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
 return {accounts,sessions};
}
export function assertMainFence(operator){
 const {accounts,sessions}=mainWriterInventory();
 return validateMainFence(accounts,sessions,operator);
}
