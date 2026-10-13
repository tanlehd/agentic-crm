import {summaryExtensions} from './summary-catalog.js';
import {catalogV1} from './catalog.js';
import type {Catalog,FieldType} from './types.js';
import {ImmutableSnapshotAdapter,type Observation,type ProjectionContext,type Scalar} from './projection-contract.js';
export function syntheticCatalog():Catalog{
 const c=structuredClone(catalogV1);c.metrics.push(...summaryExtensions().map(x=>x.descriptor));
 const add=(object:string,fields:Record<string,FieldType>)=>{c.objects.push({id:object,owner:'synthetic',grain:object+'_event',key:object+'.id'});for(const [name,type]of Object.entries({id:'reference' as const,...fields}))c.fields.push({id:object+'.'+name,object,label:name,type,groupable:false,filterable:false});};
 add('message',{session_id:'reference',direction:'string',kind:'string',delivery:'string',agent_id:'reference',occurred_at:'datetime'});
 add('assignment',{session_id:'reference',agent_id:'reference',team_id:'reference',role:'string',occurred_at:'datetime'});
 add('team_membership',{agent_id:'reference',team_id:'reference',valid_from:'datetime',valid_to:'datetime'});
 add('creative_media_link',{creative_id:'reference',media_id:'reference'});
 add('lead_event',{lead_id:'reference',agent_id:'reference',team_id:'reference',action:'string',occurred_at:'datetime'});
 add('deal_event',{deal_id:'reference',agent_id:'reference',team_id:'reference',stage:'string',amount:'money',currency:'string',occurred_at:'datetime'});
 return c;
}
export function syntheticRows(c=syntheticCatalog()):Observation[]{
 const out:Observation[]=[];const day=(n:number,seconds=0)=>`2026-09-${String(n).padStart(2,'0')}T00:00:${String(seconds).padStart(2,'0')}.000Z`;
 const row=(object:string,id:string,values:Record<string,Scalar>,revision='1')=>{const fields=Object.fromEntries(c.fields.filter(f=>f.object===object).map(f=>[f.id,null])) as Record<string,Scalar>;for(const [k,v]of Object.entries({id,...values}))fields[object+'.'+k]=v;const r={object,id,revision,deleted:false,observedAt:'2026-10-07T00:00:00.000Z',values:fields};out.push(r);return r;};
 row('channel','channel1',{platform:'messenger'});row('page','page1',{name:'Synthetic Page'});
 for(let n=1;n<=4;n++){row('conversation','C'+n,{status:n===4?'open':'closed'});row('contact','P'+n,{created_at:day(1)});}
 row('team','T1',{name:'Intake'});row('team','T2',{name:'Sales'});
 for(const [id,name,kind]of [['H1','Anna','human'],['H2','Binh','human'],['AI1','Assistant','ai']])row('agent',id!,{name:name!,kind:kind!});
 row('team_membership','TM1',{agent_id:'H1',team_id:'T1',valid_from:'2026-08-01T00:00:00.000Z',valid_to:day(5)});row('team_membership','TM2',{agent_id:'H1',team_id:'T2',valid_from:day(5),valid_to:null});
 row('team_membership','TM3',{agent_id:'H2',team_id:'T2',valid_from:'2026-08-01T00:00:00.000Z',valid_to:null});row('team_membership','TM4',{agent_id:'AI1',team_id:'T1',valid_from:'2026-08-01T00:00:00.000Z',valid_to:null});
 const sessions=[['C1','P1','A','H1',10],['C2','P2','A','AI1',30],['C1','P1','B','H1',50],['C3','P3','B','H1',null],['C4','P4',null,'H1',null]] as const;
 sessions.forEach(([conversation,contact,ad,agent,latency],i)=>{const id='S'+(i+1),n=i+1;row('session',id,{opened_at:day(n),source_kind:ad?'paid':'organic',conversation_id:conversation,contact_id:contact,channel_id:'channel1',source_page_id:'page1',source_ad_id:ad,initial_agent_id:agent,initial_team_id:'T1',first_response_seconds:latency,unanswered:latency===null});
  row('assignment','AS'+n,{session_id:id,agent_id:agent,team_id:'T1',role:'initial',occurred_at:day(n)});row('message','MI'+n,{session_id:id,direction:'inbound',kind:'message',delivery:'received',agent_id:null,occurred_at:day(n)});
  if(latency!==null)row('message','MO'+n,{session_id:id,direction:'outbound',kind:'message',delivery:'sent',agent_id:agent,occurred_at:day(n,latency)});
  row('message','MN'+n,{session_id:id,direction:'outbound',kind:'note',delivery:'sent',agent_id:'H1',occurred_at:day(n,1)});row('message','MQ'+n,{session_id:id,direction:'outbound',kind:'message',delivery:'queued',agent_id:'H1',occurred_at:day(n,2)});
 });
 row('assignment','AS_HANDOFF',{session_id:'S1',agent_id:'H2',team_id:'T2',role:'handling',occurred_at:day(1,20)});
 for(const [id,session,n]of [['L1','S1',1],['L2','S1',1],['L3','S3',3],['L4','S5',5]] as const){row('lead',id,{origin_session_id:session,created_at:day(n,40),qualified_at:id==='L4'?null:day(n,50)});row('lead_event','LE_'+id,{lead_id:id,agent_id:'H2',team_id:'T2',action:id==='L4'?'created':'qualified',occurred_at:day(n,50)});}
 for(const [id,lead,session,amount]of [['D1','L1','S1','100.000000'],['D2','L2','S1','100.000000'],['D3','L3','S3','200.000000']]){row('deal',id!,{origin_session_id:session!,lead_id:lead!,stage:'won',amount:amount!,currency:'USD',closed_at:day(7)});row('deal_event',id+'_open',{deal_id:id!,agent_id:'H1',team_id:'T1',stage:'open',amount:amount!,currency:'USD',occurred_at:day(6)});row('deal_event',id+'_won',{deal_id:id!,agent_id:'H2',team_id:'T2',stage:'won',amount:amount!,currency:'USD',occurred_at:day(7)});}
 row('account','account1',{name:'Synthetic shared account',currency:'USD'});for(const id of ['X','Y'])row('campaign',id,{name:'Campaign '+id,account_id:'account1'});
 row('ad_set','SET_X',{name:'Ad set X',campaign_id:'X'});row('ad_set','SET_Y',{name:'Ad set Y',campaign_id:'Y'});
 for(const id of ['A','B','C'])row('ad',id,{name:'Ad '+id,ad_set_id:id==='B'?'SET_Y':'SET_X',observed_creative_id:'CR1'});
 row('creative','CR1',{name:'Shared Creative',cta:'MESSAGE_PAGE',post_id:'POST1',asset_link_id:'LINK1'});row('post','POST1',{name:'Synthetic Post'});row('post','OBSOLETE',{name:'Deleted Post'});out.push({object:'post',id:'OBSOLETE',revision:'2',deleted:true,observedAt:'2026-10-07T00:00:00.000Z',values:{}});
 for(const id of ['M1','M2']){row('media',id,{name:'Synthetic '+id,kind:'image'});row('creative_media_link','LINK'+id.slice(1),{creative_id:'CR1',media_id:id});}
 const a=row('insights_base','base_A',{ad_id:'A',date_start:day(1),currency:'USD',impressions:1000,clicks:100,spend:'100.000000',reach:900},'2');
 row('insights_base','base_A',{ad_id:'A',date_start:day(1),currency:'USD',impressions:800,clicks:80,spend:'80.000000',reach:700});out.push(structuredClone(a));
 row('insights_base','base_B',{ad_id:'B',date_start:day(1),currency:'USD',impressions:500,clicks:25,spend:'50.000000',reach:450});row('insights_base','base_C',{ad_id:'C',date_start:day(1),currency:'USD',impressions:250,clicks:25,spend:'25.000000',reach:220});
 for(const [profile,dimension,parts]of [['age','age',[['18-24',600,60,'60.000000'],['25-34',400,40,'40.000000']]],['region','region',[['North',700,70,'70.000000'],['South',300,30,'30.000000']]]] as const)for(const [label,impressions,clicks,spend]of parts)row('insights_'+profile,profile+'_'+label,{ad_id:'A',date_start:day(1),currency:'USD',impressions,clicks,spend,reach:null,[dimension]:label});
 return out;
}
export function syntheticAdapter(context:ProjectionContext,pageSize=25){const catalog=syntheticCatalog();return new ImmutableSnapshotAdapter(context,catalog,syntheticRows(catalog),pageSize);}
