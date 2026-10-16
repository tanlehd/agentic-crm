'use client';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useApi,useCommand,ErrorNotice,can,type Context } from './api';
import { Dialog } from './dialog';
import {RuntimeRecordPage} from './record-page-runtime';
const labels:Record<string,string>={open:'Mới',qualified:'Đủ điều kiện',proposal:'Đề xuất',won:'Chốt thắng',lost:'Thất bại'};
export function DealForm({tenant,record,contactId,leadId,conversation,acquisitionSession,onSaved}:{tenant:string;record?:any;contactId?:string;leadId?:string;conversation?:string;acquisitionSession?:string;onSaved:(r:any)=>void}){
 const contacts=useApi(tenant,'/api/v1/objects/contact/records?limit=100',!record&&!contactId),command=useCommand(tenant);
 const [contact,setContact]=useState(contactId??''),[title,setTitle]=useState(record?.fields.title??''),[amount,setAmount]=useState(record?.fields.amount??'0'),[currency,setCurrency]=useState(record?.fields.currency??'VND'),[stage,setStage]=useState(record?.fields.stage??'open');
 return <form className="crm-form" aria-label={record?'Cập nhật Deal':'Tạo Deal'} onSubmit={async e=>{e.preventDefault();const body=record?{title,amount,currency,stage,...(stage==='won'&&conversation&&acquisitionSession?{conversation_id:conversation,conversation_session_id:acquisitionSession}:{})}:{contact_id:contact,...(conversation?{conversation_id:conversation,conversation_session_id:acquisitionSession}:{}),...(leadId?{lead_id:leadId}:{}),title,amount,currency};const r=await command.run('/api/v1/deals'+(record?'/'+record.id:''),body,record?'PATCH':'POST',record?.version);if(r)onSaved(r.data);}}>
 {!record&&!contactId&&<label>Liên hệ<select aria-label="Liên hệ Deal" required value={contact} onChange={e=>setContact(e.target.value)}><option value="">Chọn liên hệ…</option>{contacts.data?.data.map((c:any)=><option key={c.id} value={c.id}>{c.fields.display_name??c.id}</option>)}</select></label>}
 {leadId&&<p>Nguồn hệ thống được kế thừa từ Lead.</p>}
 <label>Tên Deal<input aria-label="Tên Deal" required maxLength={255} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Giá trị Deal<input aria-label="Giá trị Deal" required inputMode="decimal" pattern="(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Tiền tệ<input aria-label="Tiền tệ" required pattern="[A-Z]{3}" maxLength={3} value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}/></label>
 {record&&<label>Giai đoạn<select aria-label="Giai đoạn Deal" value={stage} onChange={e=>setStage(e.target.value)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
 {stage==='won'&&<p>Chốt thắng ghi nhận giá trị Deal. Đây chưa phải số tiền đã thu.</p>}
 <ErrorNotice error={command.error??contacts.error}/><Button type="submit" disabled={command.busy}>{record?'Lưu Deal':'Tạo Deal'}</Button>
 </form>;
}
export function LeadDeal({tenant,context,record}:{tenant:string;context:Context;record:any}){
 const [open,setOpen]=useState(false),[created,setCreated]=useState<any>();
 if(!can(context,'deal','create')||record.fields.status==='disqualified'||!record.fields.contact_id)return null;
 return <section><Button onClick={()=>setOpen(true)}>Tạo Deal từ Lead</Button>{created&&<p role="status">Đã tạo Deal: {created.fields.title}. Mở Deals để cập nhật giai đoạn.</p>}{open&&<Dialog title="Tạo Deal từ Lead" onClose={()=>setOpen(false)}><DealForm tenant={tenant} contactId={record.fields.contact_id} leadId={record.id} onSaved={r=>{setCreated(r);setOpen(false);}}/></Dialog>}</section>;
}
export function Deals({tenant,context,initialId}:{tenant:string;context:Context;initialId?:string}){
 const [id,setId]=useState<string|null>(initialId??null),[creating,setCreating]=useState(false),[cursor,setCursor]=useState<string|null>(null),[stage,setStage]=useState('');
 const params=new URLSearchParams({limit:'25',...(cursor?{cursor}:{}),...(stage?{filter:JSON.stringify([{field:'stage',op:'eq',value:stage}])}:{})}),list=useApi(tenant,'/api/v1/deals?'+params),detail=useApi(tenant,'/api/v1/deals/'+id,!!id);
 const r=detail.data?.data;
 return <div className="crm-record-layout"><section className="crm-card"><div className="crm-toolbar"><h3>Deals</h3>{can(context,'deal','create')&&<Button onClick={()=>{setCreating(true);setId(null);}}>Tạo Deal thủ công</Button>}</div><label>Lọc giai đoạn<select aria-label="Lọc giai đoạn" value={stage} onChange={e=>{setStage(e.target.value);setCursor(null);}}><option value="">Tất cả</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><ErrorNotice error={list.error}/>{list.isPending?<p>Đang tải…</p>:<ul className="record-list">{list.data?.data.map((d:any)=><li key={d.id}><button aria-pressed={id===d.id} onClick={()=>{setId(d.id);setCreating(false);}}><strong>{d.fields.title??'Deal'}</strong><span>{labels[d.fields.stage]??'Ẩn theo quyền'} · {d.fields.amount??'—'} {d.fields.currency??''}</span></button></li>)}</ul>}{list.data?.next_cursor&&<Button onClick={()=>setCursor(list.data.next_cursor)}>Trang tiếp</Button>}{cursor&&<Button onClick={()=>setCursor(null)}>Trang đầu</Button>}</section>
 <section className="crm-card">{creating?<DealForm tenant={tenant} onSaved={d=>{setCreating(false);setId(d.id);}}/>:detail.error?<ErrorNotice error={detail.error}/>:r?<><h3>{r.fields.title}</h3><RuntimeRecordPage tenant={tenant} context={context} object="deal" record={r}/><p>Giai đoạn: {labels[r.fields.stage]??'Ẩn theo quyền'}</p><p>Giá trị: {r.fields.amount??'—'} {r.fields.currency??''}</p><p>Nguồn: {r.fields.source_classification??'—'} · Page: {r.fields.source_page_id??'—'}</p>{can(context,'deal','update',r)&&!['won','lost'].includes(r.fields.stage)&&<DealForm key={r.version} tenant={tenant} record={r} onSaved={()=>void detail.refetch()}/>}</>:<p>Chọn Deal để xem và cập nhật.</p>}</section></div>;
}
