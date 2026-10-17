import {randomUUID} from 'node:crypto';
import type {TransactionScope} from '../../kernel/tenancy/unit-of-work.js';

// Chat-owned baseline application port. Callers hold the Thread registry fence.
// No transcript, current team membership inference, or delivery-success claim.
export async function contribute(s:TransactionScope,thread:string,input:{session?:string;kind:string;source:string;revision?:string;actor?:{kind:string;id:string}|null;payload?:Record<string,unknown>}){
 const tenant=s.context.tenantId;
 const [episode]=await s.query(`SELECT id,status FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? AND ${input.session?'id=?':"status='active'"}`,[tenant,thread,...(input.session?[input.session]:[])]);if(!episode)return;
 const [existing]=await s.query('SELECT id FROM session_contribution WHERE tenant_id=? AND session_id=? AND kind=? AND source_id=? AND source_revision=?',[tenant,episode.id,input.kind,input.source,input.revision??'1']);if(existing)return;
 const [owner]=episode.status==='active'?await s.query('SELECT owner_principal_id,team_id,owner_revision FROM crm_record WHERE tenant_id=? AND id=?',[tenant,thread]):await s.query('SELECT owner_id owner_principal_id,team_id,owner_revision FROM session_contribution WHERE tenant_id=? AND session_id=? ORDER BY revision DESC LIMIT 1',[tenant,episode.id]);
 const [last]=await s.query('SELECT MAX(revision) revision FROM session_contribution WHERE tenant_id=? AND session_id=?',[tenant,episode.id]);
 await s.query('INSERT INTO session_contribution(tenant_id,session_id,id,conversation_id,revision,kind,source_id,source_revision,actor_kind,actor_id,owner_id,team_id,owner_revision,payload,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))',[tenant,episode.id,randomUUID(),thread,String(BigInt(last.revision??0)+1n),input.kind,input.source,input.revision??'1',input.actor?.kind??null,input.actor?.id??null,owner?.owner_principal_id??null,owner?.team_id??null,String(owner?.owner_revision??0),JSON.stringify(input.payload??{})]);
}
