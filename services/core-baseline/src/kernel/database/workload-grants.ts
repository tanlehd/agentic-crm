import type {Connection} from 'mysql2/promise';
export const workloadReaderPrivileges:Readonly<Record<string,string>>={tenant:'SELECT',identity_workload_service:'SELECT',identity_workload_certificate:'SELECT',identity_workload_admission:'SELECT'};
export const workloadOperatorPrivileges:Readonly<Record<string,string>>={tenant:'SELECT',identity_workload_service:'SELECT,INSERT,UPDATE',identity_workload_certificate:'SELECT,INSERT,UPDATE',identity_workload_admission:'SELECT,INSERT,UPDATE',identity_workload_event:'SELECT,INSERT'};
export async function applyWorkloadGrants(connection:Connection,database:string,user:string,operator=false){
 if(![database,user].every(v=>/^[a-z][a-z0-9_]{0,40}$/.test(v))||user==='root')throw new Error('Invalid workload grant target');
 await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'",[user]);
 for(const [table,p] of Object.entries(operator?workloadOperatorPrivileges:workloadReaderPrivileges))await connection.query(`GRANT ${p} ON \`${database}\`.\`${table}\` TO ?@'%'`,[user]);
}
