import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandRef,OwnerRoutingViewPolicy} from '@agentic-crm/contracts';
import {ownerCanonical,ownerDigest,ownerFail,ownerRoute,validateOwnerValue,type WorkloadRoute} from '@agentic-crm/workload-transport';
import {ChatOwnerCommands} from './owner-command.js';
import {routingReplySnapshot} from './routing-facts.js';

type Policy=(tenant:string,command:OwnerCommandRef,admission:string)=>Promise<OwnerRoutingViewPolicy>;
/** Data source for an admitted Routing read. The Routing root owns disclosure/recovery. */
export class ChatRoutingView{
 constructor(private readonly commands:ChatOwnerCommands,private readonly policy:Policy){}
 private async snapshot(c:PoolConnection,tenant:string,p:OwnerRoutingViewPolicy,correlation:string){
  const ids=p.selection.conversation_ids,slots=ids.map(()=>'?').join(',');
  const [records]=ids.length?await c.execute<RowDataPacket[]>(`SELECT r.id,r.owner_principal_id,r.team_id,r.version,r.owner_revision,r.archived_at FROM crm_record r JOIN conversation v ON v.tenant_id=r.tenant_id AND v.record_id=r.id WHERE r.tenant_id=? AND r.id IN (${slots}) ORDER BY r.id FOR UPDATE`,[tenant,...ids]):[[]];
  const [shares]=ids.length?await c.execute<RowDataPacket[]>(`SELECT record_id,team_id FROM record_team_access WHERE tenant_id=? AND record_id IN (${slots}) ORDER BY record_id,team_id FOR UPDATE`,[tenant,...ids]):[[]];
  const visible_ids=records.filter(r=>r.archived_at===null&&(!p.selection.mine||r.owner_principal_id===p.principal_id)&&(p.read.all||p.read.own&&r.owner_principal_id===p.principal_id||p.read.team_ids.includes(r.team_id)||shares.some(s=>s.record_id===r.id&&p.read.team_ids.includes(s.team_id)))).map(r=>String(r.id));
  const replies=p.selection.mine?[]:(await routingReplySnapshot(c,tenant,{session_ids:p.selection.session_ids,from:p.selection.from,mode:'aggregate'},correlation)).replies;
  return {visible_ids,replies,snapshot_digest:ownerDigest({records,shares,replies})};
 }
 async read(tenant:string,command:OwnerCommandRef,admission:string){
  const policy=validateOwnerValue<OwnerRoutingViewPolicy>('OwnerRoutingViewPolicy',await this.policy(tenant,command,admission)),snapshot=await this.commands.transaction(tenant,c=>this.snapshot(c,tenant,policy,command.command_id));
  if(ownerCanonical(await this.policy(tenant,command,admission))!==ownerCanonical(policy))ownerFail('REVOKED');
  await this.commands.transaction(tenant,async c=>{if((await this.snapshot(c,tenant,policy,command.command_id)).snapshot_digest!==snapshot.snapshot_digest)ownerFail('STALE_VERSION');});
  return {policy_digest:ownerDigest(policy),...snapshot};
 }
}
export function chatRoutingViewRoutes(view:ChatRoutingView):Record<string,WorkloadRoute>{return {'/internal/v1/owners/chat/routing-view':ownerRoute('chat','routing-view',['routing'],r=>view.read(r.tenant_id,r.payload.command as OwnerCommandRef,r.payload.admission_id as string))};}
