// Reviewed owner-local adapter permissions inside the baseline deployment.
// Shared registry/ledgers are partitioned by existing owner application ports.
const read=names=>Object.fromEntries(names.split(' ').map(n=>[n,'SELECT']));
const write=names=>Object.fromEntries(names.split(' ').map(n=>[n,'SELECT,INSERT,UPDATE']));
export const mainOwnerGrants={
 identity:{...read('schema_migration tenant account auth_session membership principal role principal_role team team_member field_policy service_actor ai_agent agent_policy identity_dispatch_delegation external_app'),...write('identity_owner_admission identity_owner_gate identity_owner_barrier identity_account_gate identity_account_barrier'),external_app:'SELECT,UPDATE(quota_minute,quota_count)',identity_dispatch_delegation:'SELECT,INSERT',audit_entry:'INSERT',outbox_event:'INSERT'},
 crm:{...read('schema_migration object_type property_definition contact contact_identity crm_record activity record_team_access outbox_event'),...write('crm_reference_gate crm_reference_reservation crm_owner_command'),crm_record:'SELECT,INSERT',activity:'SELECT,INSERT',ownership_history:'SELECT,INSERT',audit_entry:'SELECT,INSERT',outbox_event:'SELECT,INSERT'},
 connector:{...read('schema_migration channel_connection facebook_page touchpoint'),...write('connector_reference_gate connector_reference_reservation channel_ingress_touchpoint')},
 routing:{schema_migration:'SELECT',...write('routing_skill routing_team_skill routing_human_profile routing_queue routing_queue_version routing_work_item routing_queue_entry routing_assignment_attempt routing_human_allocation routing_capacity_reservation routing_allocation_head routing_capacity_gate routing_owner_command')},
 sales:{...read('schema_migration crm_record object_type record_team_access lead deal sales_session_context'),sales_need_outcome:'SELECT,INSERT',...write('sales_owner_command')},
 workflow:read('schema_migration workflow_run outbox_event'),
};
// Native Identity serializes admissions against tenant ACL writers with FOR UPDATE.
// MySQL requires an UPDATE privilege for that locking read; constrain it to tenant status.
mainOwnerGrants.identity.tenant='SELECT,UPDATE(status)';
export async function grantMainOwners(connection,database,credentials){
 if(database!=='agentic_crm'&&!/^test_t09_owner_[a-f0-9]{16}$/.test(database))throw Error('OWNER_GRANT_DATABASE');
 for(const [role,grants]of Object.entries(mainOwnerGrants)){
  const c=credentials[role];if(c?.user!=='main_'+role||!/^[a-f0-9]{64}$/.test(c.password))throw Error('OWNER_GRANT_CREDENTIAL');
  await connection.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?",[c.user,c.password]);
  await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[c.user]);
  for(const [table,access]of Object.entries(grants))await connection.query(`GRANT ${access} ON \`${database}\`.\`${table}\` TO ?@'%'`,[c.user]);
 }
}
