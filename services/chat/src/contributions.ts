import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandBinding} from '@agentic-crm/contracts';
import {sessionStamp} from './session-progress-storage.js';

/** Chat-only immutable page snapshot; source visibility is resolved outside this transaction. */
export async function sessionContributions(c:PoolConnection,tenant:string,cid:string,sid:string,before?:string){
 const [rows]=await c.execute<RowDataPacket[]>(`SELECT * FROM session_contribution WHERE tenant_id=? AND conversation_id=? AND session_id=?${before?' AND revision<?':''} ORDER BY revision DESC LIMIT 51`,[tenant,cid,sid,...(before?[before]:[])]);
 const [[first]]=await c.execute<RowDataPacket[]>('SELECT kind FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision LIMIT 1',[tenant,sid]);
 const [[last]]=await c.execute<RowDataPacket[]>('SELECT owner_id,team_id,owner_revision FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision DESC LIMIT 1',[tenant,sid]);
 return {coverage:!first?'none':first.kind==='opened'?'full':'partial',owner:last?{id:last.owner_id as string|null,team_id:last.team_id as string|null,revision:String(last.owner_revision)}:null,
  history:rows.slice(0,50).map(r=>({id:String(r.id),revision:String(r.revision),kind:String(r.kind),source_id:String(r.source_id),source_revision:String(r.source_revision),actor:r.actor_id?{kind:String(r.actor_kind),id:String(r.actor_id)}:null,owner_id:r.owner_id as string|null,handling_team_id:r.team_id as string|null,owner_revision:String(r.owner_revision),recorded_at:sessionStamp(r.recorded_at)!,payload:(typeof r.payload==='string'?JSON.parse(r.payload):r.payload) as Record<string,unknown>})),next_before_revision:rows.length>50?String(rows[49]!.revision):null};
}
export function visibleContributions(page:Awaited<ReturnType<typeof sessionContributions>>,b:OwnerCommandBinding,status:string,fields:string[],notes:string[],sales:string[]){
 const history=page.history.flatMap(row=>{
  if(row.kind==='note'&&!notes.includes(row.source_id)||row.kind==='outcome'&&!sales.includes(row.source_id))return [];
  if(row.kind!=='classification')return [row];
  const changes=Object.fromEntries(Object.entries(row.payload.changes as Record<string,unknown>).filter(([key])=>fields.includes(key)));
  return Object.keys(changes).length?[{...row,payload:{...row.payload,changes}}]:[];
 });
 return {session_id:b.session_id,coverage:page.coverage,owner:status==='active'?{id:b.resource.owner_principal_id,team_id:b.resource.team_id,revision:b.resource.owner_revision}:page.owner,history,next_before_revision:page.next_before_revision};
}
