import type { Connection } from 'mysql2/promise';
// Shared ledgers/registry retain non-Chat owner rows. Their application predicates
// are checked separately; exclusive Chat tables are inaccessible to baseline.
export const chatExclusiveTables = new Set([
  'chat_claim_request','chat_dispatch_claim','chat_inbox','chat_inbox_share','chat_outbound_job',
  'chat_read_rollout_conversation','chat_read_rollout_principal','chat_result_request','chat_snippet','chat_workspace_rollout',
  'conversation','conversation_acquisition_session','conversation_activity','conversation_activity_counter','conversation_read_state',
  'conversation_snooze','conversation_tag','conversation_tag_link','conversation_workspace','message','message_acquisition_membership',
  'message_content','message_workspace','need_assessment','need_assessment_revision','need_follow_up','outbound_intent',
  'session_classification','session_contribution','session_milestone_event','session_need','session_process_head','session_process_version',
  'session_progress','session_stage_event','session_touchpoint',
]);
// Local operator connection only. No wildcard runtime privileges: future tables
// stay inaccessible until this reviewed provisioning step runs again.
export async function applyRuntimeGrants(connection: Connection, database: string, user: string) {
  if (![database,user].every(value=>/^[a-z][a-z0-9_]{0,40}$/.test(value)) || user==='root') throw new Error('Invalid grant target');
  const [tables] = await connection.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'',[database]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
  for (const {name} of tables as {name:string}[]) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid table');
    if (name.startsWith('identity_dispatch_') || name.startsWith('identity_workload_')) continue;
    if (chatExclusiveTables.has(name) || name.startsWith('chat_')) continue;
    if (['account_credential','auth_session','auth_token','auth_challenge','auth_attempt','system_audit_entry','channel_marketing_credential','channel_marketing_admission_receipt'].includes(name)) continue;
    const privileges = ['audit_entry','ownership_history','session_process_version','session_stage_event','session_need','session_milestone_event'].includes(name) ? 'SELECT,INSERT' : ['session_process_head','session_progress'].includes(name) ? 'SELECT,INSERT,UPDATE' : ['account','schema_migration'].includes(name) ? 'SELECT' : 'SELECT,INSERT,UPDATE,DELETE';
    await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${name}\` TO ?@'%'`,[user]);
  }
}

export async function applyAuthGrants(connection:Connection,database:string,user:string,password:string){
  if(![database,user].every(value=>/^[a-z][a-z0-9_]{0,40}$/.test(value))||user==='root'||password.length<24)throw new Error('Invalid auth grant target');
  await connection.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[user,password]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
  await connection.query(`GRANT SELECT,UPDATE(security_revision) ON \`${database}\`.account TO ?@'%'`,[user]);
  for(const table of ['account_credential','auth_session','auth_token','auth_challenge','auth_attempt'])await connection.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
  for(const table of ['identity_account_gate','identity_account_barrier'])await connection.query(`GRANT SELECT,INSERT,UPDATE ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
  await connection.query(`GRANT SELECT ON \`${database}\`.identity_owner_admission TO ?@'%'`,[user]);
  await connection.query(`GRANT INSERT ON \`${database}\`.system_audit_entry TO ?@'%'`,[user]);
}
