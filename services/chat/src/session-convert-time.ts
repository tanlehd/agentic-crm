import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {ConversationPipelineDefinition} from '@agentic-crm/contracts';
import {sessionStamp} from './session-progress-storage.js';

/** The committed stage ledger is the durable automation effect, under an immutable pin. */
export async function readSessionConvertTime(c:PoolConnection,tenant:string,session:string,definition:ConversationPipelineDefinition):Promise<string|null>{
 const rules=definition.automations;if(!rules)return null;
 const stages=definition.stages.filter(s=>s.type==='converted'?rules.set_convert_time:(s.type==='open'||s.type==='unqualified')&&rules.clear_convert_time);
 if(!stages.length)return null;
 const [[event]]=await c.execute<RowDataPacket[]>(`SELECT to_stage,recorded_at FROM session_stage_event WHERE tenant_id=? AND session_id=? AND to_stage IN (${stages.map(()=>'?').join(',')}) ORDER BY revision DESC LIMIT 1`,[tenant,session,...stages.map(s=>s.key)]);
 return event&&stages.find(s=>s.key===event.to_stage)?.type==='converted'?sessionStamp(event.recorded_at):null;
}
