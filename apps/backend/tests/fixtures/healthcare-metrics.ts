import type { DataSource } from 'typeorm';

/** Private offline fixture queries; not a report API or authorization boundary. */
export async function healthcareMetrics(ds:DataSource,tenant:string,from:Date,to:Date,asOf:Date){
 if(![from,to,asOf].every(d=>Number.isFinite(+d))||+from>=+to||+asOf<+from)throw new Error('INVALID_METRIC_WINDOW');
 const conversations=await ds.query(`SELECT c.record_id id,c.contact_id,
 EXISTS(SELECT 1 FROM touchpoint t WHERE t.tenant_id=c.tenant_id AND t.conversation_id=c.record_id AND t.source='ctm' AND t.received_at<=?) ctm,
 EXISTS(SELECT 1 FROM \`lead\` l WHERE l.tenant_id=c.tenant_id AND l.conversation_id=c.record_id AND l.qualified_at<=?) qualified
 FROM conversation c WHERE c.tenant_id=? AND c.opened_at>=? AND c.opened_at<? AND c.opened_at<=?`,[asOf,asOf,tenant,from,to,asOf]);
 const [inbound]=await ds.query("SELECT COUNT(DISTINCT id) n FROM message WHERE tenant_id=? AND direction='inbound' AND received_at>=? AND received_at<? AND received_at<=?",[tenant,from,to,asOf]);
 const leads=await ds.query(`SELECT l.record_id,l.accepted_at,
 (SELECT h.to_owner_id FROM ownership_history h WHERE h.tenant_id=l.tenant_id AND h.record_id=l.record_id AND h.created_at<=l.qualified_at ORDER BY h.created_at DESC,h.owner_revision DESC LIMIT 1) qualified_owner
 FROM \`lead\` l WHERE l.tenant_id=? AND l.qualified_at>=? AND l.qualified_at<? AND l.qualified_at<=?`,[tenant,from,to,asOf]);
 const handoffs=await ds.query('SELECT created_at,accepted_at,accepted_by_principal_id FROM lead_handoff WHERE tenant_id=? AND created_at>=? AND created_at<? AND created_at<=?',[tenant,from,to,asOf]);
 const response=await ds.query(`SELECT c.record_id,
 (SELECT MIN(m.received_at) FROM message m WHERE m.tenant_id=c.tenant_id AND m.conversation_id=c.record_id AND m.direction='inbound' AND m.received_at<=?) first_inbound,
 (SELECT MIN(e.occurred_at) FROM outbox_event e WHERE e.tenant_id=c.tenant_id AND e.aggregate_id=c.record_id AND e.event_type='message.sent' AND e.occurred_at<=?) first_sent
 FROM conversation c WHERE c.tenant_id=? AND c.opened_at>=? AND c.opened_at<? AND c.opened_at<=?`,[asOf,asOf,tenant,from,to,asOf]);
 const complete=handoffs.filter((h:any)=>h.accepted_at&&+h.accepted_at<=+asOf);
 const latency=complete.map((h:any)=>(+h.accepted_at-+h.created_at)/1000);
 const first=response.filter((r:any)=>r.first_sent&&r.first_inbound).map((r:any)=>(+r.first_sent-+r.first_inbound)/1000);
 const ctm=conversations.filter((c:any)=>Number(c.ctm)),accepted=leads.filter((l:any)=>l.accepted_at&&+l.accepted_at<=+asOf);
 const ratio=(n:number,d:number)=>d?n/d:null;
 const byOwner:Record<string,number>={};for(const l of leads)byOwner[l.qualified_owner??'unassigned']=(byOwner[l.qualified_owner??'unassigned']??0)+1;
 const acceptedBy:Record<string,number>={};for(const h of complete)acceptedBy[h.accepted_by_principal_id]=(acceptedBy[h.accepted_by_principal_id]??0)+1;
 return {inbound_messages:Number(inbound.n),new_conversations:conversations.length,unique_contacts:new Set(conversations.map((c:any)=>c.contact_id)).size,ctm_conversations:ctm.length,qualified_leads:leads.length,ctm_to_qualified:ratio(ctm.filter((c:any)=>Number(c.qualified)).length,ctm.length),lead_acceptance_rate:ratio(accepted.length,leads.length),handoff_pending:handoffs.length-complete.length,handoff_acceptance_median_seconds:percentile(latency,.5),handoff_acceptance_p95_seconds:percentile(latency,.95),first_response_median_seconds:percentile(first,.5),first_response_pending:response.length-first.length,qualification_by_owner:byOwner,acceptance_by_owner:acceptedBy,customer_conversion:null,as_of:asOf.toISOString()};
}
function percentile(values:number[],p:number):number|null{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*p,lower=Math.floor(index);return sorted[lower]!+(sorted[Math.ceil(index)]!-sorted[lower]!)*(index-lower);}
