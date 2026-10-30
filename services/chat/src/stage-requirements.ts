import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {ProcessDefinition} from './session-progress-storage.js';

export type StageRequirements={fields?:string[];need?:boolean;milestones?:string[]};
export function validStageRequirements(definition:ProcessDefinition):boolean {
 const milestones=new Set(definition.milestones.map(m=>m.key));
 return definition.stages.every((stage,index)=>{
  const r=stage.requirements;
  return !r || (!(index===0&&(r.need||r.fields?.length||r.milestones?.length)) &&
   (r.milestones??[]).every(key=>milestones.has(key)));
 });
}
export function hasRequiredValue(value:unknown):boolean {
 return value!==undefined&&value!==null&&(typeof value!=='string'||value.trim().length>0);
}
/** Called inside the existing locked Chat transaction. No value leaves the owner. */
export async function stageRequirementsMet(c:PoolConnection,tenant:string,session:string,r:StageRequirements={}):Promise<boolean>{
 if(r.fields?.length){
  const [[row]]=await c.execute<RowDataPacket[]>('SELECT values_json FROM session_classification WHERE tenant_id=? AND session_id=? FOR UPDATE',[tenant,session]);
  const values:Record<string,unknown>=row?(typeof row.values_json==='string'?JSON.parse(row.values_json):row.values_json):{};
  if(r.fields.some(key=>!Object.hasOwn(values,key)||!hasRequiredValue(values[key])))return false;
 }
 if(r.need){const [[row]]=await c.execute<RowDataPacket[]>('SELECT id FROM session_need WHERE tenant_id=? AND session_id=? LIMIT 1',[tenant,session]);if(!row)return false;}
 if(r.milestones?.length){
  // A replacement supersedes its parent; a retracted replacement cannot revive it.
  const [rows]=await c.execute<RowDataPacket[]>(`SELECT e.need_id,e.milestone_key FROM session_milestone_event e
   LEFT JOIN session_milestone_event corrected ON corrected.tenant_id=e.tenant_id AND corrected.supersedes_id=e.id
   WHERE e.tenant_id=? AND e.session_id=? AND e.kind<>'retract' AND corrected.id IS NULL
   AND e.milestone_key IN (${r.milestones.map(()=>'?').join(',')}) GROUP BY e.need_id,e.milestone_key`,[tenant,session,...r.milestones]);
  const needs=new Map<string,Set<string>>();for(const row of rows){const keys=needs.get(row.need_id)??new Set<string>();keys.add(row.milestone_key);needs.set(row.need_id,keys);}
  if(![...needs.values()].some(keys=>r.milestones!.every(key=>keys.has(key))))return false;
 }
 return true;
}
