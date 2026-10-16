'use client';
import {useState} from 'react';
import type {RecordPageCard,RecordPageLayout,RecordPageSurface,ResolvedRecordPage} from '@agentic-crm/contracts';
import {useApi,ErrorNotice,can,type Context} from './api';
import './record-pages.css';

export const recordTitle=(r:any)=>String(r?.fields?.display_name??r?.fields?.title??r?.fields?.name??r?.fields?.subject??r?.custom_values?.title??r?.id?.slice(0,8)??'Tên bản ghi');
export const recordPath=(object:string,id?:string)=>`/api/v1/${object==='deal'?'deals':object==='lead'?'leads':`objects/${object}/records`}${id?'/'+id:'?limit=20'}`;
export function pageTarget(card:RecordPageCard,root:string,meta:Pick<ResolvedRecordPage,'objects'|'relations'>){
  if(card.relation==='contact_leads')return 'lead';if(card.relation==='contact_deals')return 'deal';
  const o=meta.objects.find(o=>o.key===root),r=meta.relations.find(r=>r.id===card.relation);
  return meta.objects.find(x=>x.id===(r?.source_object_type_id===o?.id?r?.target_object_type_id:r?.target_object_type_id===o?.id?r?.source_object_type_id:undefined))?.key;
}
const value=(v:unknown)=>v===null||v===undefined||v===''?'—':typeof v==='boolean'?v?'Có':'Không':typeof v==='object'?JSON.stringify(v):String(v);
export function PageProperties({fields,object,record,meta}:{fields:string[];object:string;record?:any;meta:Pick<ResolvedRecordPage,'objects'>}){
  const defs=meta.objects.find(o=>o.key===object)?.properties??[];
  return <dl className="rp-property-values">{fields.flatMap(key=>{const def=defs.find(p=>p.key===key);return def?[<div key={key}><dt>{def.label}</dt><dd>{record?value(record.custom_values?.[key]??record.fields?.[key]):<span className="rp-placeholder">Giá trị thuộc tính</span>}</dd></div>]:[]})}{!fields.length&&<p>Chưa có thuộc tính được chọn hoặc được phép đọc.</p>}</dl>;
}
export function PageCard({card,tenant,object,record,meta,context}:{card:RecordPageCard;tenant:string;object:string;record?:any;meta:Pick<ResolvedRecordPage,'objects'|'relations'>;context:Context}){
  return <section className="rp-runtime-card" aria-label={card.title}><h3>{card.title}</h3>{card.kind==='properties'?<PageProperties fields={card.fields} object={object} record={record} meta={meta}/>:!record?<p className="rp-placeholder">Chọn bản ghi mẫu để xem dữ liệu được phép đọc.</p>:card.kind==='activities'?<PageActivities tenant={tenant} object={object} record={record} limit={card.limit}/>:<PageAssociations {...{card,tenant,object,record,meta,context}}/>}</section>;
}
function PageActivities({tenant,object,record,limit}:{tenant:string;object:string;record:any;limit:number}){
  const query=useApi(tenant,`/api/v1/objects/${object}/records/${record.id}/page-activities`);
  if(query.isPending)return <p role="status">Đang tải hoạt động…</p>;if(query.error)return <ErrorNotice error={query.error} reload={()=>void query.refetch()}/>;
  const rows=query.data?.data??[];return <>{rows.length?<><p className="rp-hint">Tối đa {limit} hoạt động gần nhất trong phạm vi quyền.</p><ul className="rp-related-list">{rows.slice(0,limit).map((r:any)=><li key={r.id}><strong>{r.fields.subject??'Hoạt động'}</strong><p>{r.fields.kind??'—'} · {r.fields.due_at??'Chưa có hạn'}</p>{r.fields.body&&<p>{r.fields.body}</p>}</li>)}</ul></>:<p>Chưa có hoạt động được phép xem.</p>}</>;
}
function PageAssociations(props:{card:RecordPageCard;tenant:string;object:string;record:any;meta:Pick<ResolvedRecordPage,'objects'|'relations'>;context:Context}){
  const {card,tenant,record,object,meta,context}=props,target=pageTarget(card,object,meta),domain=card.relation==='contact_leads'||card.relation==='contact_deals';
  if(!target||!can(context,target,'read'))return <p>Không có dữ liệu liên quan được phép xem.</p>;
  return domain?<SalesRelated {...props} target={target}/>:<GenericRelated {...props} target={target}/>;
}
function SalesRelated({card,tenant,record,target,meta}:{card:RecordPageCard;tenant:string;record:any;target:string;meta:Pick<ResolvedRecordPage,'objects'>}){
  const def=meta.objects.find(o=>o.key===target)?.properties.find(p=>p.key===card.filter?.field),input=card.filter?.value;
  const filter=[{field:'contact_id',op:'eq',value:record.id},...(card.filter?[{field:card.filter.field,op:'eq',value:def?.type==='integer'?Number(input):def?.type==='boolean'?input==='true':input}]:[])];
  const query=useApi(tenant,`/api/v1/${target}s?${new URLSearchParams({limit:String(card.limit),filter:JSON.stringify(filter),...(card.sort?{sort:JSON.stringify(card.sort)}:{})})}`);
  if(query.isPending)return <p role="status">Đang tải bản ghi liên quan…</p>;if(query.error)return <ErrorNotice error={query.error} reload={()=>void query.refetch()}/>;
  return <>{query.data?.data.length?<ul className="rp-related-list">{query.data.data.map((r:any)=><li key={r.id}><strong>{recordTitle(r)}</strong><PageProperties fields={card.fields} object={target} record={r} meta={meta}/></li>)}</ul>:<p>Không có bản ghi phù hợp trong phạm vi quyền.</p>}{query.data?.next_cursor&&<p className="rp-hint">Đang hiển thị {card.limit} bản ghi. Mở danh sách {target} để xem thêm.</p>}</>;
}
function GenericRelated({card,tenant,record,target,meta}:{card:RecordPageCard;tenant:string;record:any;target:string;meta:Pick<ResolvedRecordPage,'objects'>}){
  const [cursor,setCursor]=useState(''),query=useApi(tenant,`/api/v1/records/${record.id}/associations?limit=100${cursor?'&cursor='+encodeURIComponent(cursor):''}`);
  if(query.isPending)return <p role="status">Đang tải liên kết…</p>;if(query.error)return <ErrorNotice error={query.error} reload={()=>void query.refetch()}/>;
  const rows=(query.data?.data??[]).filter((r:any)=>r.association_type_id===card.relation);
  return <>{rows.length?<ul className="rp-related-list">{rows.slice(0,card.limit).map((r:any)=><RelatedRecord key={r.id} tenant={tenant} object={target} id={r.source_record_id===record.id?r.target_record_id:r.source_record_id} fields={card.fields} meta={meta}/>)}</ul>:<p>Không có liên kết phù hợp trên trang này.</p>}{rows.length>card.limit&&<p className="rp-hint">Chỉ hiển thị {card.limit} liên kết đầu trên trang.</p>}{query.data?.next_cursor&&<button type="button" onClick={()=>setCursor(query.data.next_cursor)}>Trang liên kết tiếp</button>}{cursor&&<button type="button" onClick={()=>setCursor('')}>Trang liên kết đầu</button>}</>;
}
function RelatedRecord({tenant,object,id,fields,meta}:{tenant:string;object:string;id:string;fields:string[];meta:Pick<ResolvedRecordPage,'objects'>}){
  const query=useApi(tenant,recordPath(object,id));if(query.isPending)return <li>Đang tải…</li>;if(query.error)return <li><ErrorNotice error={query.error}/></li>;
  return <li><strong>{recordTitle(query.data.data)}</strong><PageProperties {...{fields,object,meta}} record={query.data.data}/></li>;
}
export function RecordPageCanvas({layout,surface,tenant,object,record,meta,context}:{layout:RecordPageLayout;surface:RecordPageSurface;tenant:string;object:string;record?:any;meta:Pick<ResolvedRecordPage,'objects'|'relations'>;context:Context}){
  const [selected,setSelected]=useState(''),tab=layout.tabs.find(t=>t.id===selected)??layout.tabs[0];
  const cards=(items:RecordPageCard[])=>items.map(card=><PageCard key={card.id} {...{card,tenant,object,record,meta,context}}/>);
  return <div className={'rp-runtime '+surface}><div className="rp-runtime-left">{cards(layout.left)}</div>{surface==='detail'&&<><div className="rp-runtime-main"><div className="rp-runtime-tabs" role="tablist" aria-label="Nội dung bản ghi">{layout.tabs.map(t=><button type="button" role="tab" aria-selected={t.id===tab?.id} key={t.id} onClick={()=>setSelected(t.id)}>{t.title}</button>)}</div><div role="tabpanel">{cards(tab?.cards??[])}{!tab?.cards.length&&<p className="rp-hint">Chưa có card trong tab này.</p>}</div></div><div className="rp-runtime-right">{cards(layout.right)}</div></>}</div>;
}
export function RuntimeRecordPage({tenant,object,record,context,surface='detail'}:{tenant:string;object:string;record:any;context:Context;surface?:RecordPageSurface}){
  const query=useApi(tenant,`/api/v1/objects/${object}/record-page/${surface}`,true,true);
  if(query.isPending)return <p role="status">Đang tải giao diện bản ghi…</p>;if(query.error)return <ErrorNotice error={query.error} reload={()=>void query.refetch()}/>;
  const data=query.data.data as ResolvedRecordPage;return <div data-page-view={data.view.key}><small className="rp-view-label">{data.view.name}</small><RecordPageCanvas {...{tenant,object,record,context,surface}} layout={data.view.layout} meta={data}/></div>;
}
export function RecordPreview({tenant,object,id,context,onOpen}:{tenant:string;object:string;id:string;context:Context;onOpen?:()=>void}){
  const record=useApi(tenant,recordPath(object,id),true,true);
  if(record.isPending)return <p role="status">Đang tải bản ghi…</p>;if(record.error)return <ErrorNotice error={record.error} reload={()=>void record.refetch()}/>;
  return <div className="rp-record-preview"><div className="rp-identity"><span className="ui-avatar">{recordTitle(record.data.data).slice(0,2).toUpperCase()}</span><h3>{recordTitle(record.data.data)}</h3>{onOpen&&<button type="button" onClick={onOpen}>Mở {object==='contact'?'Contact':'chi tiết'}</button>}</div><RuntimeRecordPage {...{tenant,object,context}} record={record.data.data} surface="preview"/></div>;
}
