'use client';
import { useState } from 'react';
import { useQuery,useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { request,useCommand,ErrorNotice } from './api';
const fieldLabels:Record<string,string>={service_interest:'Dịch vụ quan tâm',need_summary:'Nhu cầu',preferred_contact_method:'Cách liên hệ',phone:'Số điện thoại',contact_permission:'Đồng ý liên hệ'};
const labels:Record<string,string>={running:'AI đang xử lý',waiting_message:'Đang chờ trả lời',paused_human:'Chờ nhân viên hoàn tất',completed:'Đã hoàn tất',cancelled:'Đã hủy',failed:'Cần kiểm tra'};
export function Qualification({tenant,conversation}:{tenant:string;conversation:string}){
 const query=useQuery({queryKey:[tenant,'chatflow',conversation],queryFn:({signal})=>request(tenant,`/api/v1/conversations/${conversation}/chatflow-session`,{signal}),refetchInterval:3000,retry:false});
 if(query.isPending)return <p role="status">Đang tải thông tin nhu cầu…</p>;
 if(query.error)return <details><summary>Thông tin nhu cầu</summary><ErrorNotice error={query.error} reload={()=>void query.refetch()}/></details>;
 const r=query.data.data;if(!r)return null;
 return <section className="crm-card"><h3>Thông tin nhu cầu</h3><p role="status">{labels[r.status]??r.status}</p>{r.outcome&&<p>{r.outcome==='qualified'?'Đã xác nhận nhu cầu và đồng ý liên hệ.':r.outcome==='disqualified'?'Khách không đồng ý liên hệ.':'Cần nhân viên hỗ trợ.'}</p>}
   {r.lead_id&&<p>Lead: <span>{r.lead_id}</span></p>}
   <details><summary>Dữ liệu đã thu thập</summary>{Object.entries(r.variables).map(([key,value])=><p key={key}>{fieldLabels[key]??key}: {String(value??'')} · {r.provenance[key]?.kind==='message'?'Khách xác nhận':'Nhân viên ghi nhận'}</p>)}{Object.entries(r.draft).map(([key,value])=><p key={key}>{fieldLabels[key]??key}: {String(value)} · AI đề xuất, cần kiểm tra</p>)}</details>
   {r.can_complete?<Form key={r.id} tenant={tenant} conversation={conversation} session={r} reload={()=>void query.refetch()}/>:r.status==='paused_human'&&<p>Owner hiện tại cần quyền đọc và xác nhận Lead để hoàn tất nhu cầu.</p>}
 </section>;
}
function Form({tenant,conversation,session:r,reload}:{tenant:string;conversation:string;session:any;reload:()=>void}){
 const initial={...r.draft,...r.variables},[values,setValues]=useState<Record<string,string>>({service_interest:String(initial.service_interest??''),need_summary:String(initial.need_summary??''),preferred_contact_method:String(initial.preferred_contact_method??'messenger'),phone:String(initial.phone??'')}),[evidence,setEvidence]=useState(''),[consent,setConsent]=useState(false),[reviewed,setReviewed]=useState({version:r.version,owner:r.owner_revision});
 const command=useCommand(tenant),stale=reviewed.version!==r.version||reviewed.owner!==r.owner_revision;
 const messages=useInfiniteQuery({queryKey:[tenant,'consent-evidence',conversation],initialPageParam:null as string|null,queryFn:({pageParam,signal})=>request(tenant,`/api/v1/conversations/${conversation}/messages?limit=100${pageParam?'&cursor='+encodeURIComponent(pageParam):''}`,{signal}),getNextPageParam:last=>last.next_cursor??undefined,refetchInterval:3000,retry:false});
 const candidates=messages.data?.pages.flatMap(p=>p.data).filter((m:any)=>m.direction==='inbound'&&typeof m.text==='string'&&['yes','true','đồng ý'].includes(m.text.normalize('NFC').trim().toLowerCase()))??[];
 return <form className="crm-form" onSubmit={async e=>{e.preventDefault();if(stale||!consent||!evidence||command.busy||messages.error)return;const qualification={service_interest:values.service_interest,need_summary:values.need_summary,preferred_contact_method:values.preferred_contact_method,...(values.preferred_contact_method==='phone'?{phone:values.phone}:{}),contact_permission:true};await command.run(`/api/v1/chatflow-sessions/${r.id}/complete-qualification`,{qualification,consent_message_id:evidence,owner_revision:reviewed.owner},'POST',reviewed.version);reload();}}>
  <label>Dịch vụ quan tâm<input required maxLength={255} value={values.service_interest} onChange={e=>setValues({...values,service_interest:e.target.value})}/></label>
  <label>Nhu cầu của khách<textarea required maxLength={4000} value={values.need_summary} onChange={e=>setValues({...values,need_summary:e.target.value})}/></label>
  <label>Cách liên hệ<select value={values.preferred_contact_method} onChange={e=>setValues({...values,preferred_contact_method:e.target.value})}><option value="messenger">Messenger</option><option value="phone">Điện thoại</option></select></label>
  {values.preferred_contact_method==='phone'&&<label>Số điện thoại<input required maxLength={32} value={values.phone} onChange={e=>setValues({...values,phone:e.target.value})}/></label>}
  <label>Tin nhắn đồng ý liên hệ<select required value={evidence} onChange={e=>setEvidence(e.target.value)}><option value="">Chọn tin nhắn xác nhận của khách…</option>{candidates.map((m:any)=><option key={m.id} value={m.id}>{m.text} — {new Date(m.received_at).toLocaleString('vi-VN')}</option>)}</select></label>
  {!candidates.length&&!messages.isPending&&<p>Chưa có tin nhắn xác nhận rõ ràng. Hãy hỏi khách đồng ý liên hệ và chờ câu trả lời.</p>}
  {messages.hasNextPage&&<Button type="button" variant="outline" disabled={messages.isFetching} onClick={()=>void messages.fetchNextPage()}>Tải thêm tin nhắn xác nhận</Button>}
  <ErrorNotice error={messages.error}/><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Tôi đã kiểm tra tin nhắn trên xác nhận khách đồng ý liên hệ về nhu cầu này.</label>
  {stale&&<div role="alert">Phân công hoặc dữ liệu đã thay đổi. Bản nhập được giữ lại.<Button type="button" variant="outline" onClick={()=>{setReviewed({version:r.version,owner:r.owner_revision});command.setError(null);}}>Đã kiểm tra dữ liệu mới</Button></div>}
  <ErrorNotice error={command.error}/><Button type="submit" disabled={stale||command.busy||!consent||!evidence||!!messages.error}>Hoàn tất nhu cầu</Button>
 </form>;
}
