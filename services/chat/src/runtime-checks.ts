import {randomUUID} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {workloadRequest,type TlsMaterial,type CurrentAuthority} from '@agentic-crm/workload-transport';
import {verifyRuntimeLineage} from './runtime-lineage.js';
import {session} from './database.js';
import type {ChatCompositionConfig} from './composition.js';

export function assertOwnGrants(grants:string[],database:string){
 if(!grants.length)throw new Error('CHAT_GRANTS_MISSING');
 for(const grant of grants){
  if(/^GRANT USAGE ON \*\.\* TO /.test(grant))continue;
  const m=/^GRANT (.+) ON `([^`]+)`\.(?:`[^`]+`|\*) TO /.exec(grant);
  if(!m||m[2]!==database||/\b(ALL|CREATE|DROP|ALTER|TRIGGER|EXECUTE|REFERENCES|GRANT OPTION)\b/.test(grant))throw new Error('CHAT_FOREIGN_OR_PRIVILEGED_GRANT');
 }
}
export async function checkChatStorage(pool:Pool,config:Pick<ChatCompositionConfig,'tenants'|'epoch'>){
 const c=await pool.getConnection();try{
  await session(c);await verifyRuntimeLineage(c);
  for(const tenant of config.tenants){const [[row]]=await c.execute<RowDataPacket[]>('SELECT mode,epoch FROM chat_writer_gate WHERE tenant_id=?',[tenant]);if(row?.mode!=='active'||String(row.epoch)!==config.epoch)throw new Error('CHAT_WRITER_FENCED');}
 }finally{c.release();}
}
export async function checkChatGrants(pool:Pool,database:string){
 const [rows]=await pool.query<RowDataPacket[]>('SHOW GRANTS');assertOwnGrants(rows.map(r=>String(Object.values(r)[0])),database);
}
export async function chatBacklog(pool:Pool,tenants:readonly string[]){
 const result:Record<string,Record<string,number>>={};
 for(const [name,table,column,extra]of [['events','chat_event_delivery','state',''],['ingress','chat_ingress_inbox','state',''],['outbound','chat_outbound_job','status',''],['recovery','chat_owner_dependency','state'," AND slot='recovery'"]] as const){
  const [rows]=await pool.query<RowDataPacket[]>(`SELECT ${column} state,COUNT(*) n FROM ${table} WHERE tenant_id IN (?)${extra} GROUP BY ${column}`,[tenants]);result[name]=Object.fromEntries(rows.map(r=>[String(r.state),Number(r.n)]));
 }return result;
}
export async function checkChatPeers(material:TlsMaterial,authority:CurrentAuthority,config:ChatCompositionConfig){
 for(const tenant of config.tenants)for(const owner of ['identity','crm','connector','routing'] as const){
  const base=config.owners[owner];if(!base)throw new Error('CHAT_REQUIRED_OWNER_MISSING');
  const request_id=randomUUID(),reply=await workloadRequest(material,authority,{url:new URL('/internal/v1/workloads/ready',base),expectedService:owner,tenant,data:{schema_version:1,request_id,tenant_id:tenant}});
  if(reply.schema_version!==1||reply.request_id!==request_id||reply.service!==owner||reply.status!=='ready')throw new Error('CHAT_DEPENDENCY_UNAVAILABLE');
 }
}
