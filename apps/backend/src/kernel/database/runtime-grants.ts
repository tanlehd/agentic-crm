import type { Connection } from 'mysql2/promise';
// Local operator connection only. No wildcard runtime privileges: future tables
// stay inaccessible until this reviewed provisioning step runs again.
export async function applyRuntimeGrants(connection: Connection, database: string, user: string) {
  if (![database,user].every(value=>/^[a-z][a-z0-9_]{0,40}$/.test(value)) || user==='root') throw new Error('Invalid grant target');
  const [tables] = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'',[database]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
  for (const {name} of tables as {name:string}[]) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid table');
    const privileges = ['audit_entry','ownership_history'].includes(name) ? 'SELECT,INSERT' : name==='schema_migration' ? 'SELECT' : 'SELECT,INSERT,UPDATE,DELETE';
    await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${name}\` TO ?@'%'`,[user]);
  }
}
