import type { Pool } from 'mysql2/promise';
// Explicit operator command; never called by API/worker startup.
export async function grantRuntime(pool:Pool,database:string,user:string,password:string){
 if(!/^[a-z][a-z0-9_]{0,63}$/.test(database)||!/^[a-z][a-z0-9_]{0,31}$/.test(user)||['root','mysql','sys'].includes(user)||password.length<24)throw new Error('INVALID_RUNTIME_GRANT');
 const c=await pool.getConnection();
 try{
  const [rows]=await c.query<any[]>('SELECT CURRENT_USER() runtime_actor,DATABASE() db');
  if(rows[0].db!==database||String(rows[0].runtime_actor).split('@')[0]===user)throw new Error('INVALID_RUNTIME_GRANT');
  await c.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[user,password]);
  // Reject existing users with unrelated privileges; this command never revokes another service's grants.
  const [grants]=await c.query<any[]>("SHOW GRANTS FOR ?@'%'",[user]);
  const allowed=[['connector_connection','SELECT, INSERT, UPDATE'],['connector_delivery','SELECT, INSERT, UPDATE'],['connector_audit','SELECT, INSERT'],['connector_schema_migration','SELECT'],['connector_meta_page','SELECT'],['connector_meta_event','SELECT, INSERT, UPDATE'],['connector_meta_audit','SELECT, INSERT']].map(([table,permissions])=>'GRANT '+permissions+' ON `'+database+'`.`'+table+'` TO ');
  for(const row of grants){const grant=String(Object.values(row)[0]);if(grant.includes('WITH GRANT OPTION')||!['GRANT USAGE ON *.* TO ',...allowed].some(prefix=>grant.startsWith(prefix)))throw new Error('UNSAFE_EXISTING_GRANTS');}
  for(const [table,privileges] of [['connector_connection','SELECT, INSERT, UPDATE'],['connector_delivery','SELECT, INSERT, UPDATE'],['connector_audit','SELECT, INSERT'],['connector_schema_migration','SELECT'],['connector_meta_page','SELECT'],['connector_meta_event','SELECT, INSERT, UPDATE'],['connector_meta_audit','SELECT, INSERT']])await c.query(`GRANT ${privileges} ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
 }finally{c.release();}
}
