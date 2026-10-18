import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {defaultProcess} from './session-process-storage.js';
export async function chatStageFacts(s:TransactionScope){
 const t=s.context.tenantId;
 const processes=await s.query('SELECT version,definition FROM session_process_version WHERE tenant_id=? LIMIT 10001',[t]);
 if(!processes.some((p:any)=>String(p.version)==='1'))processes.push({version:'1',definition:defaultProcess});
 return {processes,sessions:await s.query('SELECT a.id,a.conversation_id,a.opened_at,a.closed_at,p.process_version,p.stage_key,p.coverage,p.created_at progress_at FROM conversation_acquisition_session a LEFT JOIN session_progress p ON p.tenant_id=a.tenant_id AND p.session_id=a.id WHERE a.tenant_id=? LIMIT 10001',[t]),events:await s.query('SELECT id,session_id,revision,from_stage,to_stage,recorded_at FROM session_stage_event WHERE tenant_id=? LIMIT 10001',[t])};
}
