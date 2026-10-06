import type { DataSource } from 'typeorm';
import { UnitOfWork,type TransactionScope } from '../../kernel/tenancy/unit-of-work.js';

// Schema compatibility is transaction-local: never cache a negative across migration.
const supported=new WeakMap<TransactionScope,boolean>();
export async function workspaceSupported(s:TransactionScope){
  if(!supported.has(s))supported.set(s,!!(await s.query("SELECT version FROM schema_migration WHERE version=20 AND state='applied'"))[0]);
  return supported.get(s)!;
}

// Caller holds the Conversation registry lock. Backfill and live writes share that fence.
export async function prepareWorkspace(s:TransactionScope,id:string){
  if(!await workspaceSupported(s))return false;
  const tenant=s.context.tenantId;
  if((await s.query('SELECT conversation_id FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[tenant,id]))[0])return true;
  const [c]=await s.query('SELECT opened_at,status FROM conversation WHERE tenant_id=? AND record_id=?',[tenant,id]);
  let seq=0n,after:{time:string;id:string}|undefined,first:Date|null=null,last:Date=c.opened_at,hasOutbound=false;
  for(;;){
    const rows=await s.query(`SELECT id,direction,received_at,DATE_FORMAT(received_at,'%Y-%m-%d %H:%i:%s.%f') position_time FROM message WHERE tenant_id=? AND conversation_id=? ${after?'AND (received_at>? OR (received_at=? AND id>?))':''} ORDER BY received_at,id LIMIT 200`,[tenant,id,...(after?[after.time,after.time,after.id]:[])]);
    for(const m of rows){if(m.direction==='inbound'){seq++;first??=m.received_at;}else hasOutbound=true;
      await s.query('INSERT INTO message_workspace(tenant_id,message_id,conversation_id,inbound_seq) VALUES (?,?,?,?)',[tenant,m.id,id,m.direction==='inbound'?seq.toString():null]);last=m.received_at;
    }
    if(rows.length<200)break;const tail=rows.at(-1);after={time:tail.position_time,id:tail.id};
  }
  await s.query('INSERT INTO conversation_workspace(tenant_id,conversation_id,latest_inbound_seq,last_message_at,waiting_since,waiting_metric_state) VALUES (?,?,?,?,?,?)',[tenant,id,seq.toString(),last,c.status==='closed'||hasOutbound?null:first,c.status!=='closed'&&hasOutbound?'unavailable':'ready']);
  return true;
}

export async function workspaceInbound(s:TransactionScope,id:string,message:string){
  if(!await workspaceSupported(s))return;
  const tenant=s.context.tenantId;
  await s.query('UPDATE conversation_workspace SET latest_inbound_seq=latest_inbound_seq+1 WHERE tenant_id=? AND conversation_id=?',[tenant,id]);
  await s.query('INSERT INTO message_workspace(tenant_id,message_id,conversation_id,inbound_seq) SELECT tenant_id,?,conversation_id,latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[message,tenant,id]);
  await s.query('UPDATE conversation_workspace w JOIN message m ON m.tenant_id=w.tenant_id AND m.id=? SET w.last_message_at=m.received_at,w.waiting_since=IF(w.waiting_metric_state=\'ready\',COALESCE(w.waiting_since,m.received_at),NULL) WHERE w.tenant_id=? AND w.conversation_id=?',[message,tenant,id]);
}

export async function workspaceOutbound(s:TransactionScope,id:string,message:string){
  if(!await workspaceSupported(s))return;
  await s.query('INSERT INTO message_workspace(tenant_id,message_id,conversation_id,reply_through_inbound_seq) SELECT tenant_id,?,conversation_id,latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?',[message,s.context.tenantId,id]);
  await s.query('UPDATE conversation_workspace w JOIN message m ON m.tenant_id=w.tenant_id AND m.id=? SET w.last_message_at=m.received_at WHERE w.tenant_id=? AND w.conversation_id=?',[message,s.context.tenantId,id]);
}

export async function workspaceSent(s:TransactionScope,id:string,message:string){
  if(!await workspaceSupported(s))return;
  await prepareWorkspace(s,id);
  const tenant=s.context.tenantId,[m]=await s.query('SELECT reply_through_inbound_seq FROM message_workspace WHERE tenant_id=? AND message_id=?',[tenant,message]);
  if(m?.reply_through_inbound_seq==null)return; // Historical/provider effect has no verified causal coverage.
  await s.query("UPDATE conversation_workspace SET answered_inbound_seq=GREATEST(answered_inbound_seq,?),waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?",[m.reply_through_inbound_seq,tenant,id]);
  const [next]=await s.query('SELECT m.received_at FROM message_workspace mw JOIN message m ON m.tenant_id=mw.tenant_id AND m.id=mw.message_id JOIN conversation_workspace w ON w.tenant_id=mw.tenant_id AND w.conversation_id=mw.conversation_id WHERE mw.tenant_id=? AND mw.conversation_id=? AND mw.inbound_seq>w.answered_inbound_seq ORDER BY mw.inbound_seq LIMIT 1',[tenant,id]);
  await s.query('UPDATE conversation_workspace w JOIN conversation c ON c.tenant_id=w.tenant_id AND c.record_id=w.conversation_id SET w.waiting_since=IF(c.status=\'closed\',NULL,?) WHERE w.tenant_id=? AND w.conversation_id=?',[next?.received_at??null,tenant,id]);
}

export async function workspaceClosed(s:TransactionScope,id:string){
  if(await workspaceSupported(s))await s.query("UPDATE conversation_workspace SET waiting_since=NULL,waiting_metric_state='ready' WHERE tenant_id=? AND conversation_id=?",[s.context.tenantId,id]);
}

// Resumable operator backfill. Per-conversation atomic commits are the checkpoint;
// bounded reads never load the whole transcript into memory. Run after DDL, before UI enable.
export async function backfillWorkspace(source:DataSource){
  const uow=new UnitOfWork(source);let completed=0;
  for(;;){
    const rows=await source.query('SELECT c.tenant_id,c.record_id FROM conversation c LEFT JOIN conversation_workspace w ON w.tenant_id=c.tenant_id AND w.conversation_id=c.record_id WHERE w.conversation_id IS NULL ORDER BY c.tenant_id,c.record_id LIMIT 100');
    if(!rows.length)return completed;
    for(const c of rows)await uow.run({tenantId:c.tenant_id},async s=>{
      await s.query('SELECT id FROM tenant WHERE id=? FOR SHARE',[c.tenant_id]);
      await s.query('SELECT id FROM crm_record WHERE tenant_id=? AND id=? FOR UPDATE',[c.tenant_id,c.record_id]);
      await prepareWorkspace(s,c.record_id);completed++;
    });
  }
}
