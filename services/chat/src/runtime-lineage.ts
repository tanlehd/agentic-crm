import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {SYSTEM_TENANT} from './database.js';
import {retirementStep,retirementChecksum} from './retirement-step.js';

type Step={version:number;name:string;checksum:string};
const folder=new URL('../migrations/',import.meta.url);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
async function text(name:string){return (await readFile(new URL(name,folder),'utf8')).replaceAll('\r\n','\n');}
let packaged:Promise<Step[]>|undefined;
export function runtimeLineage():Promise<readonly Step[]>{
 return packaged??= (async()=>{
  const checks=JSON.parse(await text('checksums.json')) as Record<string,string>;
  const steps:Step[]=[];
  for(const [index,name] of ['chat001-owned-storage.sql','chat002-local-constraints.sql','chat003-ingress.sql'].entries()){
   const checksum=index===2?(await text('chat003-ingress.sha256')).trim():checks[name];
   if(!checksum||!/^[a-f0-9]{64}$/.test(checksum)||hash(await text(name))!==checksum)throw new Error('CHAT_PACKAGE_LINEAGE_INVALID');
   steps.push({version:index+1,name,checksum});
  }
  steps.push({version:4,name:retirementStep.name,checksum:retirementChecksum});return steps;
 })();
}
export function validateRuntimeJournal(rows:readonly Record<string,unknown>[],steps:readonly Step[]){
 if(rows.length!==steps.length||!steps.length)throw new Error('CHAT_RUNTIME_LINEAGE_MISMATCH');
 for(const [i,row] of rows.entries()){
  const step=steps[i]!;
  if(row.tenant_id!==SYSTEM_TENANT||Number(row.version)!==step.version||row.name!==step.name||row.checksum!==step.checksum||row.state!=='applied'||row.applied_at==null||row.error_code!==null)throw new Error('CHAT_RUNTIME_LINEAGE_MISMATCH');
 }
}
/** Read-only. Never imports the operator migration runner or writes a journal. */
export async function verifyRuntimeLineage(c:PoolConnection){
 const steps=await runtimeLineage();
 const [rows]=await c.execute<RowDataPacket[]>('SELECT tenant_id,version,name,checksum,state,applied_at,error_code FROM schema_migration ORDER BY version');
 validateRuntimeJournal(rows,steps);
 return {lineage:'crm_chat' as const,version:steps.at(-1)!.version};
}
