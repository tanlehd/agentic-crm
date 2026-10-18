import {recordStage} from './stage-events.js';
import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError,DurableCommands } from '../../kernel/reliability/commands.js';
import { CrmRecords,type RecordDomain } from '../crm/records.js';
import { contactReferences,stamp,type ArchiveGuard } from '../crm/core.js';
import { SalesCrmPort } from '../crm/sales-port.js';
import { RecordRegistry } from '../crm/registry.js';
import { checkField,fieldError,object } from '../crm/properties.js';
import { uuid } from '../identity/admin.js';
import { sourceKeys } from './source.js';
import { conversationLeadSource } from '../conversation/lead-source-port.js';
import { requireSalesSession } from '../conversation/sales-context-port.js';
import { appendSalesContext,contextInput } from './session-context.js';
export const dealStages=['open','qualified','proposal','won','lost'];
export function dealAmount(value:unknown):string{
  if(typeof value!=='string'||! /^(0|[1-9]\d{0,13})(\.\d{1,6})?$/.test(value))fieldError('amount');
  const [whole,fraction='']=value.split('.');return whole+'.'+fraction.padEnd(6,'0');
}
export function dealCurrency(value:unknown):string{if(typeof value!=='string'||!/^[A-Z]{3}$/.test(value))fieldError('currency');return value;}
function title(value:unknown){if(typeof value!=='string'||!value.trim()||value.length>255)fieldError('title');return value.trim();}
const get=async(s:TransactionScope,id:string)=>{const [row]=await s.query('SELECT * FROM deal WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]);if(!row)throw new CommandError(404,'NOT_FOUND');return row;};
export function dealDomain():RecordDomain{return {
  genericCreate:false,allowCustomValues:false,
  adapter:{insert:async(s,id,input,a,correlation)=>{
    const b=object(input,['contact_id','lead_id','title','amount','currency','conversation_id','conversation_session_id']);contextInput(b);if(!uuid(b.contact_id))fieldError('contact_id');await contactReferences.requireActive(s,a,b.contact_id);
    const context=b.conversation_id?await conversationLeadSource(s,a,b.conversation_id,b.contact_id,b.conversation_session_id):null;
    const name=title(b.title),amount=dealAmount(b.amount),currency=dealCurrency(b.currency);
    let origin:Record<string,unknown>={source_conversation_session_id:null,source_origin:'manual',source_classification:'manual',source_channel:null,source_page_id:null,source_ad_id:null,source_campaign_id:null,source_connection_id:null,source_captured_at:new Date()};
    if(context)origin={...context,source_captured_at:new Date()};
    if(b.lead_id!==undefined&&b.lead_id!==null){
      if(!uuid(b.lead_id))fieldError('lead_id');const registry=new RecordRegistry(),lead=await registry.get(s,b.lead_id,true);registry.read(a,lead);
      if(lead.objectKey!=='lead'||lead.archived)throw new CommandError(404,'NOT_FOUND');
      for(const field of ['contact_id','status',...sourceKeys])checkField(a,'lead',field,'read');
      const [row]=await s.query('SELECT * FROM `lead` WHERE tenant_id=? AND record_id=?',[s.context.tenantId,b.lead_id]);
      if(!row||row.contact_id!==b.contact_id)throw new CommandError(422,'CONTACT_BINDING_MISMATCH');if(row.status==='disqualified')throw new CommandError(409,'INVALID_TRANSITION');
      origin=Object.fromEntries(sourceKeys.map(k=>[k,row[k]]));
    }
    await s.query(`INSERT INTO deal(tenant_id,record_id,contact_id,lead_id,title,amount,currency,${sourceKeys.join(',')}) VALUES (${Array(7+sourceKeys.length).fill('?').join(',')})`,[s.context.tenantId,id,b.contact_id,b.lead_id??null,name,amount,currency,...sourceKeys.map(k=>origin[k])]);
    await recordStage(s,'deal',id,null,'open',a.principalId,correlation);
    if(context?.source_conversation_session_id)await appendSalesContext(s,id,b.conversation_id,context.source_conversation_session_id,a.principalId,'created');
    await new DurableCommands().domainEvent(s,a.principalId,correlation,'deal.created',id,'1',{deal_id:id,contact_id:b.contact_id,lead_id:b.lead_id??null});
  },exists:async(s,id)=>!!(await s.query('SELECT record_id FROM deal WHERE tenant_id=? AND record_id=?',[s.context.tenantId,id]))[0],eligible:async()=>{},assigned:async()=>{}},
  read:async(s,r)=>{const {tenant_id,record_id,...fields}=await get(s,r.id);return {...fields,amount:String(fields.amount),closed_at:stamp(fields.closed_at),source_captured_at:stamp(fields.source_captured_at)};},
  update:async(s,r,input,a,correlation)=>{
    const b=object(input,['title','amount','currency','stage','conversation_id','conversation_session_id']);contextInput(b);if(!Object.keys(b).length)throw new CommandError(400,'INVALID_REQUEST');const row=await get(s,r.id);
    if(b.conversation_id&&(!b.conversation_session_id||b.stage!=='won'))fieldError('conversation_session_id');
    if(b.conversation_id)await requireSalesSession(s,a,b.conversation_id,b.conversation_session_id,row.contact_id);
    if(['won','lost'].includes(row.stage))throw new CommandError(409,'INVALID_TRANSITION');
    const name=b.title===undefined?row.title:title(b.title),amount=b.amount===undefined?String(row.amount):dealAmount(b.amount),currency=b.currency===undefined?row.currency:dealCurrency(b.currency),stage=b.stage??row.stage;
    if(!dealStages.includes(stage))fieldError('stage');if(stage==='won'&&BigInt(amount.replace('.',''))<=0n)fieldError('amount');
    if(stage==='won')for(const field of ['amount','currency','stage']){checkField(a,'deal',field,'read');checkField(a,'deal',field,'write');}
    await s.query("UPDATE deal SET title=?,amount=?,currency=?,stage=?,closed_at=IF(? IN ('won','lost'),UTC_TIMESTAMP(6),NULL) WHERE tenant_id=? AND record_id=?",[name,amount,currency,stage,stage,s.context.tenantId,r.id]);
    await recordStage(s,'deal',r.id,row.stage,stage,a.principalId,correlation);
    if(stage==='won'){
      if(b.conversation_id)await appendSalesContext(s,r.id,b.conversation_id,b.conversation_session_id,a.principalId,'closing');
      await new SalesCrmPort().markCustomer(s,a,row.contact_id,correlation);
      await new DurableCommands().domainEvent(s,a.principalId,correlation,'deal.won',r.id,String(BigInt(r.version)+1n),{deal_id:r.id,contact_id:row.contact_id,lead_id:row.lead_id});
    }
  },archive:async()=>{throw new CommandError(422,'OBJECT_NOT_IMPLEMENTED');},
};}
export const dealArchiveGuard:ArchiveGuard=async(s,r)=>{if(r.objectKey==='contact'&&(await s.query('SELECT record_id FROM deal WHERE tenant_id=? AND contact_id=? LIMIT 1',[s.context.tenantId,r.id])).length)throw new CommandError(409,'ACTIVE_DEPENDENCY');};
export class DealService {
  constructor(readonly records:CrmRecords){}
  read(account:string,tenant:string,id?:string,query:Record<string,unknown>={}){return this.records.read(account,tenant,{object:'deal',kind:'records',...(id?{id}:{})},query);}
  async mutate(account:string,tenant:string,id:string|undefined,input:unknown,key:string,version:string|undefined,correlation:string){
    const b=object(input,id?['title','amount','currency','stage','conversation_id','conversation_session_id']:['contact_id','lead_id','title','amount','currency','conversation_id','conversation_session_id']);
    return this.records.mutate(account,tenant,{object:'deal',kind:'records',...(id?{id}:{})},{fields:b},key,version,correlation,true);
  }
}
