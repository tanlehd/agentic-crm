import type {Pool,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerCommandProof,OwnerActivityPolicy} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import type {ReferenceProofReader} from '../../kernel/reliability/owner-reference.js';
import {activitySourceState} from '../../kernel/reliability/owner-activity-source.js';

type Input={command:OwnerCommandRef;admission_id:string;ids:string[];limit:number};
/** Workflow trigger binding and revision are read locally, with fresh owning Identity policy. */
export class NativeWorkflowActivity{
 constructor(private readonly pool:Pool,private readonly proof:ReferenceProofReader,private readonly policy:(tenant:string,input:{command:OwnerCommandRef;admission_id:string})=>Promise<OwnerActivityPolicy>){}
 async read(tenant:string,input:Input){
  const proof=validateOwnerValue<OwnerCommandProof>('OwnerCommandProof',await this.proof(tenant,input.command,false)),b=proof.binding;
  if(proof.state!=='prepared'||b.tenant_id!==tenant||b.owner!=='chat'||b.actor.kind!=='human'||b.operation!=='workspace-get-activity'||b.resource.object_key!=='conversation'||!b.projection||b.command_id!==input.command.command_id||proof.binding_digest!==input.command.binding_digest||ownerBindingDigest(b)!==proof.binding_digest)ownerFail('FORBIDDEN');
  const policy=validateOwnerValue<OwnerActivityPolicy>('OwnerActivityPolicy',await this.policy(tenant,{command:input.command,admission_id:input.admission_id}));if(policy.principal_id!==b.actor.principal_id)ownerFail('FORBIDDEN');
  const c=await this.pool.getConnection();try{
   await c.beginTransaction();let data:RowDataPacket[]=[];
   if(policy.automation_read&&input.ids.length){const marks=input.ids.map(()=>'?').join(',');[data]=await c.execute<RowDataPacket[]>(`SELECT id run_id,version_id definition_version_id,CAST(activity_revision AS CHAR) revision FROM workflow_run WHERE tenant_id=? AND id IN (${marks}) AND activity_revision>0
     AND JSON_UNQUOTE(JSON_EXTRACT(context,'$.trigger.aggregate_id'))=? AND JSON_UNQUOTE(JSON_EXTRACT(context,'$.trigger.contact_id'))=? AND JSON_UNQUOTE(JSON_EXTRACT(context,'$.trigger.connection_id'))=? ORDER BY FIELD(id,${marks}) LIMIT ${input.limit}`,[tenant,...input.ids,b.resource.resource_id,b.projection.contact_id,b.projection.connection_id,...input.ids]);}
   const state=await activitySourceState(c,tenant,b.resource.resource_id,'automation.conversation_activity.v1');await c.commit();return {policy_digest:ownerDigest(policy),state,data};
  }catch(error){await c.rollback();throw error;}finally{c.release();}
 }
}
export function workflowActivityRoutes(source:NativeWorkflowActivity):Record<string,WorkloadRoute>{return {'/internal/v1/owners/workflow/activity-runs':ownerRoute('workflow','activity-runs',['chat'],r=>source.read(r.tenant_id,r.payload as Input))};}
