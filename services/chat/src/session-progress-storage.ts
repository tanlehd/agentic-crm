import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {upgradeConversationPipeline,type ConversationPipelineDefinition,type OwnerCommandBinding} from '@agentic-crm/contracts';
import {nextOwnerCounter,ownerCanonical,ownerFail} from '@agentic-crm/workload-transport';

export type ProcessDefinition=ConversationPipelineDefinition;
export const defaultSessionProcess:ProcessDefinition=upgradeConversationPipeline({stages:[{key:'received',label:'Tiếp nhận'},{key:'consulting',label:'Tư vấn'},{key:'next_step',label:'Bước tiếp theo'}],milestones:[{key:'need_confirmed',label:'Đã xác nhận nhu cầu'},{key:'next_step_agreed',label:'Đã thống nhất bước tiếp theo'}]});
export const sessionStamp=(v:unknown)=>v==null?null:v instanceof Date?v.toISOString():new Date(String(v).replace(' ','T').replace(/Z?$/,'Z')).toISOString();
export function cleanSessionRow(row:RowDataPacket){const {tenant_id:_tenant,...rest}=row;for(const k of ['version','revision','process_version'])if(rest[k]!=null)rest[k]=String(rest[k]);for(const k of ['created_at','updated_at','recorded_at','occurred_at'])if(rest[k]!=null)rest[k]=sessionStamp(rest[k]);return rest;}
export async function readSessionProcess(c:PoolConnection,tenant:string,version?:string){
 const [[head]]=await c.execute<RowDataPacket[]>('SELECT version FROM session_process_head WHERE tenant_id=?',[tenant]),current=String(head?.version??'1'),selected=version??current;
 const [[row]]=await c.execute<RowDataPacket[]>('SELECT definition FROM session_process_version WHERE tenant_id=? AND version=?',[tenant,selected]);if(!row&&selected!=='1')ownerFail('NOT_FOUND');
 return {version:selected,current_version:current,definition:row?(typeof row.definition==='string'?JSON.parse(row.definition):row.definition) as ProcessDefinition:defaultSessionProcess};
}
export async function ensureSessionProcess(c:PoolConnection,tenant:string){
 await c.execute('INSERT IGNORE INTO session_process_head(tenant_id,version,created_at,updated_at) VALUES (?,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))',[tenant]);
 const [[head]]=await c.execute<RowDataPacket[]>('SELECT version FROM session_process_head WHERE tenant_id=? FOR UPDATE',[tenant]);
 await c.execute('INSERT IGNORE INTO session_process_version(tenant_id,version,definition,created_at) VALUES (?,1,?,UTC_TIMESTAMP(3))',[tenant,ownerCanonical(defaultSessionProcess)]);return String(head!.version);
}
export async function advanceSessionClock(c:PoolConnection,tenant:string){
 await ensureSessionProcess(c,tenant);await c.execute('UPDATE session_process_head SET updated_at=GREATEST(UTC_TIMESTAMP(3),updated_at+INTERVAL 1000 MICROSECOND) WHERE tenant_id=?',[tenant]);
 const [[head]]=await c.execute<RowDataPacket[]>('SELECT updated_at FROM session_process_head WHERE tenant_id=?',[tenant]);return sessionStamp(head!.updated_at)!;
}
export async function initializeSessionProgress(c:PoolConnection,tenant:string,session:string,at:string){
 const version=await ensureSessionProcess(c,tenant),process=await readSessionProcess(c,tenant,version);
 await c.execute("INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,?,'partial',?,?)",[tenant,session,version,process.definition.stages[0]!.key,at.replace('T',' ').replace('Z',''),at.replace('T',' ').replace('Z','')]);
}
export async function sessionProgressContribution(c:PoolConnection,b:OwnerCommandBinding,status:string,kind:string,source:string,revision:string,payload:Record<string,unknown>){
 const tenant=b.tenant_id,sid=b.session_id!,[[existing]]=await c.execute<RowDataPacket[]>('SELECT id FROM session_contribution WHERE tenant_id=? AND session_id=? AND kind=? AND source_id=? AND source_revision=?',[tenant,sid,kind,source,revision]);if(existing)return;
 const [[oldOwner]]=status==='active'?[[]]:await c.execute<RowDataPacket[]>('SELECT owner_id,team_id,owner_revision FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision DESC LIMIT 1',[tenant,sid]);
 const [[last]]=await c.execute<RowDataPacket[]>('SELECT MAX(revision) revision FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,sid]);
 await c.execute('INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,sid,randomUUID(),b.resource.resource_id,nextOwnerCounter(String(last?.revision??0)),kind,source,revision,b.actor.kind,b.actor.principal_id,status==='active'?b.resource.owner_principal_id:oldOwner?.owner_id??null,status==='active'?b.resource.team_id:oldOwner?.team_id??null,status==='active'?b.resource.owner_revision:String(oldOwner?.owner_revision??0),ownerCanonical(payload)]);
}
export async function advanceSessionDatasets(c:PoolConnection,tenant:string){
 const [heads]=await c.execute<RowDataPacket[]>("SELECT dataset,revision,version FROM chat_dataset_head WHERE tenant_id=? AND dataset IN ('progress','stage') ORDER BY dataset FOR UPDATE",[tenant]);if(heads.length!==2)ownerFail('PRECONDITION_REQUIRED');
 for(const h of heads)await c.execute('UPDATE chat_dataset_head SET revision=?,version=?,updated_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND dataset=?',[nextOwnerCounter(String(h.revision)),nextOwnerCounter(String(h.version)),tenant,h.dataset]);
}
