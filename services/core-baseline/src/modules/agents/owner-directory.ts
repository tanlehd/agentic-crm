import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { OwnerAssignmentDirectory, OwnerCommandRef } from '@agentic-crm/contracts';
import { ownerDigest, ownerFail, ownerRoute, validateOwnerValue, type WorkloadRoute } from '@agentic-crm/workload-transport';

/** Advisory capacity only. Actual assignment still reserves against current owner gates. */
export class NativeAssignmentCapacity {
  constructor(private readonly pool:Pool,private readonly directory:(tenant:string,command:OwnerCommandRef,admission:string)=>Promise<OwnerAssignmentDirectory>){}
  async read(tenant:string,command:OwnerCommandRef,admission:string){
    const directory=validateOwnerValue<OwnerAssignmentDirectory>('OwnerAssignmentDirectory',await this.directory(tenant,command,admission));
    const ids=directory.candidates.filter(p=>p.kind==='human').map(p=>p.id),c=await this.pool.getConnection();
    try{
      await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();
      const [gates]=await c.execute<RowDataPacket[]>('SELECT state FROM routing_capacity_gate WHERE tenant_id=? FOR UPDATE',[tenant]);
      if(gates[0]?.state!=='open')ownerFail('REVOKED');
      const slots=ids.map(()=>'?').join(',');
      const [profiles]=ids.length?await c.execute<RowDataPacket[]>(`SELECT principal_id,enabled,capacity FROM routing_human_profile WHERE tenant_id=? AND principal_id IN (${slots})`,[tenant,...ids]):[[]];
      const [loads]=ids.length?await c.execute<RowDataPacket[]>(`SELECT principal_id,COUNT(*) n FROM (
        SELECT a.principal_id,w.session_id FROM routing_human_allocation a JOIN routing_work_item w ON w.tenant_id=a.tenant_id AND w.id=a.work_id WHERE a.tenant_id=? AND a.principal_id IN (${slots}) AND a.released_at IS NULL
        UNION SELECT principal_id,session_id FROM routing_capacity_reservation WHERE tenant_id=? AND principal_id IN (${slots}) AND mode='managed' AND state='reserved'
      ) occupied GROUP BY principal_id`,[tenant,...ids,tenant,...ids]):[[]];
      const data=directory.candidates.map(p=>{const profile=profiles.find(r=>r.principal_id===p.id),load=loads.find(r=>r.principal_id===p.id);return {id:p.id,eligible:p.kind==='human'&&(p.id===directory.resource.owner_principal_id||!profile||!!profile.enabled&&Number(load?.n??0)<Number(profile.capacity))};});
      await c.commit();return {directory_digest:ownerDigest(directory),data};
    }catch(error){await c.rollback();throw error;}finally{c.release();}
  }
}
export function assignmentCapacityRoutes(capacity:NativeAssignmentCapacity):Record<string,WorkloadRoute>{
  return {'/internal/v1/owners/routing/assignment-directory-capacity':ownerRoute('routing','assignment-directory-capacity',['chat'],r=>capacity.read(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string))};
}
