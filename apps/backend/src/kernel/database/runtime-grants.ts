import type { Connection } from 'mysql2/promise';
// Local operator connection only. No wildcard runtime privileges: future tables
// stay inaccessible until this reviewed provisioning step runs again.
export async function applyRuntimeGrants(connection: Connection, database: string, user: string) {
  if (![database,user].every(value=>/^[a-z][a-z0-9_]{0,40}$/.test(value)) || user==='root') throw new Error('Invalid grant target');
  const [tables] = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'',[database]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
  for (const {name} of tables as {name:string}[]) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid table');
    if (['account_credential','auth_session','auth_token','auth_challenge','auth_attempt','system_audit_entry'].includes(name)) continue;
    const privileges = ['audit_entry','ownership_history'].includes(name) ? 'SELECT,INSERT' : ['account','schema_migration'].includes(name) ? 'SELECT' : 'SELECT,INSERT,UPDATE,DELETE';
    await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${name}\` TO ?@'%'`,[user]);
  }
}

export async function applyAuthGrants(connection:Connection,database:string,user:string,password:string){
  if(![database,user].every(value=>/^[a-z][a-z0-9_]{0,40}$/.test(value))||user==='root'||password.length<24)throw new Error('Invalid auth grant target');
  await connection.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[user,password]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
  await connection.query(`GRANT SELECT,UPDATE(security_revision) ON \`${database}\`.account TO ?@'%'`,[user]);
  for(const table of ['account_credential','auth_session','auth_token','auth_challenge','auth_attempt'])await connection.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
  await connection.query(`GRANT INSERT ON \`${database}\`.system_audit_entry TO ?@'%'`,[user]);
}
