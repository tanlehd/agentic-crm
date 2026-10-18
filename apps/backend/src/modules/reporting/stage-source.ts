import type {DataSource} from 'typeorm';
import {UnitOfWork} from '../../kernel/tenancy/unit-of-work.js';
import {IdentityAuthorization} from '../identity/authorization.js';
import {withFieldPolicies} from '../crm/access.js';
import {fieldAllowed} from '../identity/domain/authorization.js';
import {conversionAllowed} from './conversion-source.js';
import {conversionRecordMetadata} from '../crm/conversion-metadata-port.js';
import {salesStageFacts} from '../sales/stage-events.js';
import {chatStageFacts} from '../conversation/stage-reporting-port.js';
import {CommandError} from '../../kernel/reliability/commands.js';
const iso=(v:any)=>v==null?null:new Date(typeof v==='string'&&!v.endsWith('Z')?v.replace(' ','T')+'Z':v).toISOString();
export async function stageSource(ds:DataSource,account:string,tenant:string,csv=false){
 const uow=new UnitOfWork(ds),auth=new IdentityAuthorization(uow);
 return uow.run({tenantId:tenant},async s=>{
  const a=await withFieldPolicies(s,await auth.loadHuman(s,account));
  if(!conversionAllowed(a,csv)||!['read','filter',...(csv?['export']:[])].every(op=>fieldAllowed(a,'conversation','stage_key',op as 'read'|'filter'|'export')))return {authRevision:a.revision,stage:null};
  const [{now}]=await s.query('SELECT UTC_TIMESTAMP(3) now');const asOf=iso(now)!,historyFrom=new Date(Date.parse(asOf)-365*86400000).toISOString();
  const chat=await chatStageFacts(s),sales=await salesStageFacts(s),metadata=await conversionRecordMetadata(s);
  if(metadata.length>5000||[metadata,...Object.values(chat),...Object.values(sales)].reduce((n,r)=>n+r.length,0)>10000)throw new CommandError(422,'STAGE_SOURCE_LIMIT');
  const meta=new Map<string,any>(metadata.map((m:any)=>[m.id,m]));
  const subjects:any[]=[],events:any[]=[],stages:any[]=[];
  const process=(kind:string,version:string,steps:{key:string;label:string}[])=>steps.forEach((step,index)=>stages.push({id:kind+':'+version+':'+step.key,kind,process_version:version,key:step.key,label:step.label,position:index}));
  for(const p of chat.processes)process('conversation',String(p.version),(typeof p.definition==='string'?JSON.parse(p.definition):p.definition).stages);
  process('lead','1',['new','qualifying','qualified','handed_off','accepted','disqualified'].map(key=>({key,label:key})));
  process('deal','1',['open','qualified','proposal','won','lost'].map(key=>({key,label:key})));
  const subject=(id:string,kind:string,record:string,version:string|null,stage:string|null,at:any,coverage:string,closed:any)=>{
   const m=meta.get(record);if(!m)throw new CommandError(422,'STAGE_COVERAGE_INCOMPLETE');
   subjects.push({id,kind,record_id:record,process_version:version,stage,started_at:iso(at),coverage,closed_at:iso(closed),owner_id:m.owner_principal_id,team_id:m.team_id});
  };
  for(const r of chat.sessions){const version=r.process_version==null?null:String(r.process_version);subject(r.id,'conversation',r.conversation_id,version,r.stage_key??null,r.opened_at,r.coverage??'none',r.closed_at);
   if(version){const initial=stages.find(x=>x.kind==='conversation'&&x.process_version===version&&x.position===0);if(!initial)throw new CommandError(422,'STAGE_COVERAGE_INCOMPLETE');events.push({id:'initial:'+r.id,subject_id:r.id,sequence:'1',from_stage:null,to_stage:initial.key,occurred_at:iso(r.progress_at),recorded_at:iso(r.progress_at)});}
  }
  for(const e of chat.events)events.push({id:e.id,subject_id:e.session_id,sequence:String(e.revision),from_stage:e.from_stage,to_stage:e.to_stage,occurred_at:iso(e.recorded_at),recorded_at:iso(e.recorded_at)});
  const first=new Map<string,any>();for(const e of sales.events)if(String(e.sequence)==='1')first.set(e.subject_id,e);
  for(const [kind,rows]of [['lead',sales.leads],['deal',sales.deals]] as const)for(const r of rows){const f=first.get(r.record_id);subject(r.record_id,kind,r.record_id,'1',kind==='lead'?r.status:r.stage,meta.get(r.record_id)?.created_at,f?f.from_stage===null?'full':'partial':'none',null);}
  for(const e of sales.events)events.push({id:e.id,subject_id:e.subject_id,sequence:String(e.sequence),from_stage:e.from_stage,to_stage:e.to_stage,occurred_at:iso(e.occurred_at),recorded_at:iso(e.recorded_at)});
  const rows={sf_subject:subjects,sf_event:events,sf_stage:stages};if(subjects.length+events.length+stages.length>10000)throw new CommandError(422,'STAGE_SOURCE_LIMIT');
  return {authRevision:a.revision,stage:{schemaVersion:1,tenantId:tenant,asOf,historyFrom,rows}};
 },'REPEATABLE READ');
}
