import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';
import {CommandError} from '../../kernel/reliability/commands.js';
import type {Access} from '../identity/domain/authorization.js';
import {RecordRegistry} from '../crm/registry.js';
import {allows} from '../crm/access.js';
import {checkField} from '../crm/properties.js';
// Caller holds the Chat thread lock. This is a baseline monolith application port;
// extraction replaces it with an owner API, never a cross-service SQL query.
export async function linkNeedOutcome(s:TransactionScope,a:Access,input:{thread:string;session:string;need:string;record:string;contact:string}){
 const registry=new RecordRegistry(),r=await registry.get(s,input.record,true);registry.read(a,r);
 if(!['lead','deal'].includes(r.objectKey)||r.archived)throw new CommandError(404,'NOT_FOUND');
 if(!allows(a,r.objectKey,r.objectKey==='lead'?'qualify':'update',r))throw new CommandError(403,'FORBIDDEN');checkField(a,r.objectKey,'contact_id','read');
 const [row]=await s.query(`SELECT contact_id FROM \`${r.objectKey}\` WHERE tenant_id=? AND record_id=?`,[s.context.tenantId,r.id]);
 const [ctx]=await s.query('SELECT id FROM sales_session_context WHERE tenant_id=? AND record_id=? AND session_id=? AND conversation_id=?',[s.context.tenantId,r.id,input.session,input.thread]);
 if(row?.contact_id!==input.contact||!ctx)throw new CommandError(422,'OUTCOME_BINDING_MISMATCH');
 await s.query('INSERT IGNORE INTO sales_need_outcome(tenant_id,need_id,record_id,conversation_id,session_id,actor_id,created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))',[s.context.tenantId,input.need,r.id,input.thread,input.session,a.principalId]);
}
export async function needOutcomeState(s:TransactionScope,need:string,session:string):Promise<'linked'|'ambiguous'|'none'>{
 const [linked]=await s.query('SELECT record_id FROM sales_need_outcome WHERE tenant_id=? AND need_id=? LIMIT 1',[s.context.tenantId,need]);if(linked)return 'linked';
 // A session outcome with no exact need mapping cannot safely be treated as absent.
 const [unknown]=await s.query('SELECT c.record_id FROM sales_session_context c WHERE c.tenant_id=? AND c.session_id=? AND NOT EXISTS (SELECT 1 FROM sales_need_outcome n WHERE n.tenant_id=c.tenant_id AND n.session_id=c.session_id AND n.record_id=c.record_id) LIMIT 1',[s.context.tenantId,session]);
 return unknown?'ambiguous':'none';
}
export async function listNeedOutcomes(s:TransactionScope,a:Access,session:string,need:string){
 const rows=await s.query('SELECT DISTINCT c.record_id,EXISTS(SELECT 1 FROM sales_need_outcome n WHERE n.tenant_id=c.tenant_id AND n.need_id=? AND n.record_id=c.record_id) linked FROM sales_session_context c WHERE c.tenant_id=? AND c.session_id=? ORDER BY c.record_id LIMIT 101',[need,s.context.tenantId,session]);
 if(rows.length>100)throw new CommandError(422,'OUTCOME_LIMIT_EXCEEDED');
 const result=[];for(const row of rows){try{const registry=new RecordRegistry(),r=await registry.get(s,row.record_id);registry.read(a,r);if(!['lead','deal'].includes(r.objectKey)||r.archived)continue;result.push({id:r.id,label:`${r.objectKey==='lead'?'Lead':'Deal'} ${r.id.slice(-8)}`,linked:!!Number(row.linked),can_link:allows(a,r.objectKey,r.objectKey==='lead'?'qualify':'update',r)});}catch(e){if(!(e instanceof CommandError&&[403,404].includes(e.status)))throw e;}}
 return result;
}
