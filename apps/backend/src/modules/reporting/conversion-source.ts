import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {IdentityAuthorization} from '../identity/authorization.js';
import {withFieldPolicies,allows} from '../crm/access.js';
import {permits,fieldAllowed,type Access} from '../identity/domain/authorization.js';
import {conversionRecordMetadata} from '../crm/conversion-metadata-port.js';
import {conversionChatFacts} from '../conversation/conversion-port.js';
import {conversionSalesFacts} from '../sales/conversion-port.js';
import {CommandError} from '../../kernel/reliability/commands.js';
const sourceFields=['source_conversation_session_id','source_channel','source_page_id','source_ad_id','source_classification'];
const fields:Record<string,string[]>={conversation:['contact_id','channel','channel_id','page_id','attribution','owner_principal_id','team_id','status','text'],contact:['id'],lead:['contact_id','status','owner_principal_id','team_id',...sourceFields],deal:['contact_id','lead_id','stage','amount','currency','closed_at','owner_principal_id','team_id',...sourceFields]};
export function conversionAllowed(a:Access,csv=false){return permits(a,'report_definition','run')&&(!csv||permits(a,'report_definition','export'))&&Object.entries(fields).every(([resource,keys])=>(resource==='conversation'?permits(a,resource,'read'):allows(a,resource,'read'))&&[...keys,'created_at'].every(f=>fieldAllowed(a,resource,f,'read')&&fieldAllowed(a,resource,f,'filter')&&(!csv||fieldAllowed(a,resource,f,'export'))));}
const iso=(v:any)=>v===null||v===undefined?null:new Date(typeof v==='string'&&!v.endsWith('Z')?v.replace(' ','T')+'Z':v).toISOString();
export async function conversionSource(source:DataSource,account:string,tenant:string,csv=false){
 const uow=new UnitOfWork(source),auth=new IdentityAuthorization(uow);
 return uow.run({tenantId:tenant},async s=>{
  const a=await withFieldPolicies(s,await auth.loadHuman(s,account));if(!conversionAllowed(a,csv))return {authRevision:a.revision,conversion:null};
  const [{now}]=await s.query('SELECT UTC_TIMESTAMP(3) now');const asOf=iso(now)!,historyFrom=new Date(Date.parse(asOf)-365*86400000).toISOString();
  const chat=await conversionChatFacts(s),sales=await conversionSalesFacts(s),metadata=await conversionRecordMetadata(s);
  if([metadata,...Object.values(chat),...Object.values(sales)].reduce((n,rows)=>n+rows.length,0)>5000)throw new CommandError(422,'CONVERSION_SOURCE_LIMIT');
  const meta=new Map<string,any>(metadata.map((r:any)=>[r.id,r])),merges=new Map<string,string>(sales.merges.map((r:any)=>[r.source_id,r.target_id]));
  const canonical=(id:string)=>{const seen=new Set<string>();while(merges.has(id)){if(seen.has(id))throw new CommandError(422,'CONVERSION_LINEAGE_INVALID');seen.add(id);id=merges.get(id)!;}return id;};
  const origin=(r:any)=>({origin_session_id:r.source_conversation_session_id??null,channel:r.source_channel??null,page_id:r.source_page_id??null,ad_id:r.source_ad_id??null,source_kind:r.source_classification??'unknown'});
  const owner=(id:string)=>{const m=meta.get(id);if(!m)throw new CommandError(422,'CONVERSION_COVERAGE_INCOMPLETE');return {owner_id:m.owner_principal_id,team_id:m.team_id};};
  const created=(id:string)=>{const at=iso(meta.get(id)?.created_at);if(!at)throw new CommandError(422,'CONVERSION_COVERAGE_INCOMPLETE');return at;};
  const leads=sales.leads.map((r:any)=>({id:r.record_id,created_at:created(r.record_id),canonical_id:canonical(r.record_id),status:r.status,...origin(r),...owner(r.record_id)}));
  const leadIds=new Set(leads.map((l:any)=>l.id));for(const l of leads)if(!leadIds.has(l.canonical_id))throw new CommandError(422,'CONVERSION_COVERAGE_INCOMPLETE');
  const deals=sales.deals.map((r:any)=>({id:r.record_id,created_at:created(r.record_id),closed_at:iso(r.closed_at),lead_id:r.lead_id,canonical_lead_id:r.lead_id?canonical(r.lead_id):null,via_lead_session_id:r.lead_id?r.source_conversation_session_id:null,direct_session_id:r.lead_id?null:r.source_conversation_session_id,stage:r.stage,amount:String(r.amount),currency:r.currency,...origin(r),...owner(r.record_id)}));
  for(const d of deals)if(d.lead_id&&!leadIds.has(d.lead_id))throw new CommandError(422,'CONVERSION_COVERAGE_INCOMPLETE');
  const sessions=chat.sessions.map((r:any)=>({id:r.id,conversation_id:r.conversation_id,opened_at:iso(r.opened_at),status:r.status,channel:r.source_channel??r.channel??null,page_id:r.source_page_id??r.page_id??null,ad_id:r.source_ad_id??r.ad_id??null,source_kind:r.source_classification??r.source_kind??'unknown',initial_owner_id:r.initial_owner_id,initial_team_id:r.initial_team_id}));
  const attention:any[]=[],age=(at:any)=>Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(iso(at)!))/86400000)),at=new Date(Date.parse(asOf)-1).toISOString();
  const add=(id:string,kind:string,record:string,session:string|null,reason:string,since:any)=>attention.push({id,kind,record_id:record,session_id:session,reason,age_days:age(since),as_of:at,...owner(record)});
  const sessionOutcomes=new Set([...leads,...deals].map((r:any)=>r.origin_session_id));for(const c of sales.contexts)sessionOutcomes.add(c.session_id);
  for(const row of sessions)if(!sessionOutcomes.has(row.id)&&!meta.get(row.conversation_id)?.archived_at)add('session:'+row.id,'conversation',row.conversation_id,row.id,'Phiên chưa có Lead/Deal',row.opened_at);
  const leadDeals=new Set(deals.map((d:any)=>d.canonical_lead_id));for(const l of leads)if(l.id===l.canonical_id&&!leadDeals.has(l.id)&&!['disqualified','converted'].includes(l.status)&&!meta.get(l.id)?.archived_at)add('lead:'+l.id,'lead',l.id,l.origin_session_id,'Lead chưa có Deal',l.created_at);
  for(const d of deals)if(!['won','lost'].includes(d.stage)&&!meta.get(d.id)?.archived_at)add('deal:'+d.id,'deal',d.id,d.origin_session_id,'Deal đang mở',d.created_at);
  const mapped=new Set(sales.outcomes.map((o:any)=>o.need_id)),sessionMap=new Map<string,any>(sessions.map((r:any)=>[r.id,r]));
  for(const n of chat.needs)if(!mapped.has(n.id)){const session=sessionMap.get(n.session_id);if(session&&!meta.get(session.conversation_id)?.archived_at)add('need:'+n.id,'conversation',session.conversation_id,n.session_id,'Nhu cầu chưa liên kết outcome',n.created_at);}
  const rows={cv_session:sessions,cv_lead:leads,cv_canonical_lead:leads.filter((l:any)=>l.id===l.canonical_id),cv_deal:deals,cv_attention:attention};
  if(Object.values(rows).reduce((n,rs)=>n+rs.length,0)>10000)throw new CommandError(422,'CONVERSION_SOURCE_LIMIT');
  return {authRevision:a.revision,conversion:{schemaVersion:1,tenantId:tenant,asOf,historyFrom,rows}};
 },'REPEATABLE READ');
}
