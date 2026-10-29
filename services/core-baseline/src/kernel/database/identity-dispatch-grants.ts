import type {Connection} from 'mysql2/promise';
// Baseline Identity-only role. No password hashes, provider/Chat/Sales tables or DDL.
export const identityDispatchPrivileges:Readonly<Record<string,string>>={
 tenant:'SELECT',account:'SELECT',auth_session:'SELECT',membership:'SELECT',principal:'SELECT',
 role:'SELECT',principal_role:'SELECT',team:'SELECT',team_member:'SELECT',field_policy:'SELECT',
 object_type:'SELECT', // Explicit baseline metadata mapping; replace before physical extraction.
 identity_dispatch_delegation:'SELECT,INSERT,UPDATE',identity_dispatch_grant:'SELECT,INSERT,UPDATE',
 identity_dispatch_request:'SELECT,INSERT',identity_dispatch_event:'SELECT,INSERT',
};
export async function applyIdentityDispatchGrants(connection:Connection,database:string,user:string){
 if(![database,user].every(v=>/^[a-z][a-z0-9_]{0,40}$/.test(v))||user==='root')throw new Error('Invalid Identity grant target');
 for(const [table,privileges] of Object.entries(identityDispatchPrivileges))await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
}
