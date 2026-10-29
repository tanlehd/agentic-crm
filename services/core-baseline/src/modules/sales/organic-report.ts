import { CommandError } from '../../kernel/reliability/commands.js';
import type { CrmRecords } from '../crm/records.js';
import { RecordRegistry } from '../crm/registry.js';
import { allows,withFieldPolicies } from '../crm/access.js';
import { checkField,object } from '../crm/properties.js';
export function reportPeriod(input:unknown){
 const b=object(input,['from','to']);
 const date=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v)||!Number.isFinite(Date.parse(v)))throw new CommandError(400,'INVALID_DATE_RANGE');const d=new Date(v);if(d.toISOString()!==v.replace(/Z$/,v.includes('.')?'Z':'.000Z'))throw new CommandError(400,'INVALID_DATE_RANGE');return d;};
 const from=date(b.from),to=date(b.to);if(to.getTime()<=from.getTime()||to.getTime()-from.getTime()>366*86400000)throw new CommandError(400,'INVALID_DATE_RANGE');return {from,to};
}
export const moneyUnits=(value:string)=>{const [whole,fraction='']=value.split('.');return BigInt(whole!)*1000000n+BigInt(fraction.padEnd(6,'0'));};
export const moneyString=(value:bigint)=>`${value/1000000n}.${String(value%1000000n).padStart(6,'0')}`;
// Sales-owned read model in current monolith. Extracted Reporting consumes API/events.
export class OrganicSalesReport {
 constructor(private readonly records:CrmRecords){}
 read(account:string,tenant:string,input:unknown){const {from,to}=reportPeriod(input);return this.records.authorization.runHuman(account,tenant,async(s,raw)=>{
  const a=await withFieldPolicies(s,raw);
  if(!a.capabilities.includes('sales')||!allows(a,'report','read')||!a.grants.some(g=>g.resource==='deal'&&g.action==='read'))throw new CommandError(403,'FORBIDDEN');
  for(const field of ['source_classification','source_channel','source_page_id','amount','currency','stage','closed_at']){checkField(a,'deal',field,'read');checkField(a,'deal',field,'filter');}
  const groups=new Map<string,{channel:string;page_id:string;currency:string;won_deal_count:number;value:bigint;deal_ids:string[]}>(),registry=new RecordRegistry();let after='',scanned=0;
  while(true){
   const rows=await s.query("SELECT record_id,source_channel,source_page_id,currency,amount FROM deal WHERE tenant_id=? AND stage='won' AND source_classification='organic' AND closed_at>=? AND closed_at<? AND record_id>? ORDER BY record_id LIMIT 250",[tenant,from,to,after]);
   for(const row of rows){if(++scanned>20000)throw new CommandError(422,'REPORT_RANGE_TOO_LARGE');const record=await registry.get(s,row.record_id);if(record.archived||!allows(a,'deal','read',record))continue;
    const key=JSON.stringify([row.source_channel,row.source_page_id,row.currency]),g=groups.get(key)??{channel:row.source_channel,page_id:row.source_page_id,currency:row.currency,won_deal_count:0,value:0n,deal_ids:[] as string[]};g.value+=moneyUnits(String(row.amount));g.won_deal_count++;g.deal_ids.push(row.record_id);groups.set(key,g);
   }
   if(rows.length<250)break;after=rows.at(-1).record_id;
  }
  return {data:[...groups.values()].map(({value,...g})=>({...g,won_value:moneyString(value)})).sort((a,b)=>JSON.stringify([a.channel,a.page_id,a.currency]).localeCompare(JSON.stringify([b.channel,b.page_id,b.currency]))),period:{from:from.toISOString(),to:to.toISOString()},metric:'won_value',scope:'authorized_deals',excluded_sources:['manual','paid','unknown'],organic_basis:'no_ad_referral_observed'};
 });}
}
