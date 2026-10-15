import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { object } from '../crm/properties.js';
export interface ProcessDefinition {stages:{key:string;label:string}[];milestones:{key:string;label:string}[]}
export const defaultProcess:ProcessDefinition={stages:[{key:'received',label:'Tiếp nhận'},{key:'consulting',label:'Tư vấn'},{key:'next_step',label:'Bước tiếp theo'}],milestones:[{key:'need_confirmed',label:'Đã xác nhận nhu cầu'},{key:'next_step_agreed',label:'Đã thống nhất bước tiếp theo'}]};
export function processDefinition(input:unknown):ProcessDefinition {
 const b=object(input,['stages','milestones']);
 for(const [kind,max] of [['stages',20],['milestones',12]] as const){
  const rows=b[kind];if(!Array.isArray(rows)||!rows.length||rows.length>max)throw new CommandError(422,'INVALID_PROCESS');
  const seen=new Set();for(const value of rows){const r=object(value,['key','label']);if(typeof r.key!=='string'||! /^[a-z][a-z0-9_]{0,63}$/.test(r.key)||['won','lost','revenue','consent'].includes(r.key)||seen.has(r.key)||typeof r.label!=='string'||!r.label.trim()||r.label.length>120)throw new CommandError(422,'INVALID_PROCESS');seen.add(r.key);}
 }
 return b as ProcessDefinition;
}
export async function ensureProcess(s:TransactionScope){
 const t=s.context.tenantId;
 await s.query('INSERT IGNORE INTO session_process_head(tenant_id,version,created_at,updated_at) VALUES (?,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))',[t]);
 const [head]=await s.query('SELECT version FROM session_process_head WHERE tenant_id=? FOR UPDATE',[t]);
 await s.query('INSERT IGNORE INTO session_process_version(tenant_id,version,definition,created_at) VALUES (?,1,?,UTC_TIMESTAMP(3))',[t,JSON.stringify(defaultProcess)]);
 return String(head.version);
}
export async function readProcess(s:TransactionScope,version?:string){
 const [head]=await s.query('SELECT version FROM session_process_head WHERE tenant_id=?',[s.context.tenantId]);
 const current=String(head?.version??1),selected=version??current;
 const [row]=await s.query('SELECT definition FROM session_process_version WHERE tenant_id=? AND version=?',[s.context.tenantId,selected]);
 if(!row&&selected!=='1')throw new CommandError(404,'NOT_FOUND');
 return {version:selected,current_version:current,definition:row?(typeof row.definition==='string'?JSON.parse(row.definition):row.definition) as ProcessDefinition:defaultProcess};
}
// Tenant-local committed-time watermark. A regressing wall clock must not backdate
// a later fact into an already observed as_of. All callers hold this head lock to commit.
export async function advanceProgressClock(s:TransactionScope){
 await ensureProcess(s);
 await s.query('UPDATE session_process_head SET updated_at=GREATEST(UTC_TIMESTAMP(3),updated_at+INTERVAL 1000 MICROSECOND) WHERE tenant_id=?',[s.context.tenantId]);
 const [row]=await s.query('SELECT updated_at FROM session_process_head WHERE tenant_id=?',[s.context.tenantId]);return new Date(row.updated_at);
}
export async function initializeProgress(s:TransactionScope,session:string,coverage:'full'|'partial',recordedAt?:Date){
 const version=await ensureProcess(s),p=await readProcess(s,version);
 const at=recordedAt??await advanceProgressClock(s);
 await s.query('INSERT INTO session_progress(tenant_id,session_id,process_version,stage_key,coverage,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',[s.context.tenantId,session,version,p.definition.stages[0]!.key,coverage,at,at]);
}
