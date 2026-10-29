'use client';
import {useInboxInterval} from './inbox-polling';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi,useCommand,request,ErrorNotice,can,type Context } from './api';
import { Button } from '../../components/ui/button';
import { LeadCreate } from './records';
import { DealForm } from './deals';
import { Dialog } from './dialog';
import { SessionProgressPanel } from './session-progress';

const label=(r:any)=>r.fields.title??r.fields.qualification?.service_interest??`Lead ${r.id.slice(-8)}`;
const state=(r:any)=>r.fields.status??r.fields.stage;
type CreateContext=Readonly<{kind:'lead'|'deal'|'from-lead';conversation:string;contactId:string;sessionId:string;sequence:string;leadId?:string}>;
export function Customer360({tenant,context,conversation,contactId,canEdit,open}:{tenant:string;context:Context;conversation:string;contactId:string;canEdit:boolean;open?:(kind:'contact'|'lead'|'conversation',id:string)=>void}){
 const sessions=useInfiniteQuery({queryKey:[tenant,`/api/v1/conversations/${conversation}/acquisition-sessions`],initialPageParam:null as string|null,queryFn:({signal,pageParam})=>request(tenant,`/api/v1/conversations/${conversation}/acquisition-sessions?limit=50${pageParam?'&before_sequence='+pageParam:''}`,{signal}),getNextPageParam:page=>page.next_before_sequence??undefined,refetchInterval:useInboxInterval(),refetchIntervalInBackground:false,retry:false});
 if(sessions.isPending)return <p role="status">Đang tải Customer 360…</p>;
 if(sessions.error)return <ErrorNotice error={sessions.error} reload={()=>void sessions.refetch()}/>;
 const rows=sessions.data.pages.flatMap(p=>p.data),active=rows.find((s:any)=>s.status==='active');
 return <><SalesPanel key={`${tenant}:${conversation}:${contactId}`} {...{tenant,context,conversation,contactId,canEdit,open}} session={active}/><SessionProgressPanel key={conversation} {...{tenant,context,conversation}} sessions={rows}/>{sessions.hasNextPage&&<Button variant="outline" disabled={sessions.isFetchingNextPage} onClick={()=>void sessions.fetchNextPage()}>Tải thêm phiên để theo dõi</Button>}</>;
}
function SalesPanel({tenant,context,conversation,contactId,canEdit,session,open}:{tenant:string;context:Context;conversation:string;contactId:string;canEdit:boolean;session?:any;open?:(kind:'contact'|'lead'|'conversation',id:string)=>void}){
 const [kind,setKind]=useState<'lead'|'deal'>('lead'),[history,setHistory]=useState(false),[selected,setSelected]=useState(''),[form,setForm]=useState<CreateContext|null>(null),[merge,setMerge]=useState(false),command=useCommand(tenant);
 // An open create belongs to the selected source episode, even after polling observes close/reopen.
 const startCreate=(kind:CreateContext['kind'],leadId?:string)=>{if(session)setForm({kind,conversation,contactId,sessionId:session.id,sequence:String(session.sequence),...(leadId?{leadId}:{})});};
 const filter=[{field:'contact_id',op:'eq',value:contactId},...(!history?[{field:kind==='lead'?'status':'stage',op:'in',value:kind==='lead'?['new','qualifying','qualified','handed_off','accepted']:['open','qualified','proposal']}]:[])];
 const base=`/api/v1/${kind}s?${new URLSearchParams({limit:'20',filter:JSON.stringify(filter)})}`,readable=can(context,kind,'read');
 const list=useInfiniteQuery({queryKey:[tenant,base],initialPageParam:null as string|null,queryFn:({signal,pageParam})=>request(tenant,base+(pageParam?'&cursor='+encodeURIComponent(pageParam):''),{signal}),getNextPageParam:page=>page.next_cursor??undefined,enabled:readable,retry:false,refetchInterval:useInboxInterval(),refetchIntervalInBackground:false});
 const detail=useApi(tenant,`/api/v1/${kind}s/${selected}`,!!selected&&readable,true),r=detail.error?null:detail.data?.data;
 const rows:any[]=list.error?[]:list.data?.pages.flatMap(p=>p.data)??[];
 const editable=!!session&&canEdit&&r&&!r.archived&&!['disqualified','won','lost'].includes(state(r))&&can(context,kind,kind==='lead'?'qualify':'update',r);
 const created=(value:any,type:'lead'|'deal')=>{setForm(null);setKind(type);setSelected(value.id);};
 return <section className="crm-form" aria-label="Customer 360"><h4>RELATED OBJECTS · HỒ SƠ LIÊN QUAN</h4>
 <p>{session?`Đang xử lý phiên #${session.sequence}`:'Chưa có phiên đang mở. Có thể xem lại hồ sơ.'}</p>
 <div className="crm-actions">{(['lead','deal'] as const).map(k=><Button key={k} variant={kind===k?'default':'outline'} onClick={()=>{setKind(k);setSelected('');setMerge(false);}}>{k==='lead'?'Leads':'Deals'}</Button>)}</div>
 <label className="crm-check"><input type="checkbox" checked={history} onChange={e=>{setHistory(e.target.checked);setSelected('');}}/>Gồm hồ sơ đã kết thúc</label>
 {!readable?<p>Bạn chưa có quyền xem {kind==='lead'?'Lead':'Deal'}.</p>:list.isPending?<p role="status">Đang tải hồ sơ…</p>:list.error?<ErrorNotice error={list.error} reload={()=>void list.refetch()}/>:<>
 {!rows.length&&<p>Không có hồ sơ phù hợp trong phạm vi quyền của bạn.</p>}
 <ul className="record-list">{rows.map(row=><li key={row.id}><button data-record-id={row.id} aria-pressed={selected===row.id} onClick={()=>setSelected(row.id)}><strong>{label(row)}</strong><span>{state(row)??'Ẩn theo quyền'} · {row.fields.source_ad_id?'Ad '+row.fields.source_ad_id:row.fields.source_classification??'—'}</span></button></li>)}</ul>
 {list.hasNextPage&&<Button variant="outline" disabled={list.isFetchingNextPage} onClick={()=>void list.fetchNextPage()}>Tải thêm hồ sơ</Button>}</>}
 <ErrorNotice error={detail.error??command.error} reload={()=>void detail.refetch()}/>
 {r&&<section className="crm-form" aria-label="Hồ sơ đang chọn"><h4>ĐANG CHỌN: {label(r)}</h4><p>{r.id}<br/>Trạng thái: {state(r)??'Ẩn theo quyền'}<br/>Owner: {r.owner_principal_id??'Chưa phân công'}<br/>Nguồn gốc: {r.fields.source_classification??'—'} · Ad: {r.fields.source_ad_id??'—'}</p>
 {editable&&<Button disabled={command.busy} onClick={async()=>{await command.run(`/api/v1/sales/records/${r.id}/session-context`,{conversation_id:conversation,conversation_session_id:session.id},'POST',r.version);}}>Tiếp tục {kind==='lead'?'Lead':'Deal'} này trong phiên</Button>}
 <ContextHistory key={r.id} tenant={tenant} record={r} session={session?.id} open={open}/>
 {kind==='lead'&&<><Button variant="outline" onClick={()=>open?.('lead',r.id)}>Mở hồ sơ Lead</Button>{session&&can(context,'deal','create')&&!r.archived&&state(r)!=='disqualified'&&<Button variant="outline" onClick={()=>startCreate('from-lead',r.id)}>Tạo Deal từ Lead đang chọn</Button>}{!r.archived&&can(context,'lead','archive',r)&&can(context,'lead','qualify',r)&&<Button variant="outline" onClick={()=>setMerge(true)}>Xem xét hợp nhất Lead trùng</Button>}</>}
 {kind==='deal'&&editable&&<DealForm key={r.version} tenant={tenant} record={r} conversation={conversation} acquisitionSession={session.id} onSaved={()=>void detail.refetch()}/>}
 </section>}
 {session&&<><p>Tiếp tục hồ sơ nếu cùng nhu cầu. Tạo mới khi khách có nhu cầu khác.</p><div className="crm-actions">{can(context,'lead','create')&&<Button variant="outline" onClick={()=>startCreate('lead')}>Tạo Lead cho nhu cầu mới</Button>}{can(context,'deal','create')&&<Button variant="outline" onClick={()=>startCreate('deal')}>Tạo Deal trực tiếp</Button>}</div></>}
 {form&&<Dialog key={`${form.kind}:${form.sessionId}:${form.leadId??''}`} title={form.kind==='lead'?'Nhu cầu mới':'Cơ hội mới'} onClose={()=>setForm(null)}><p>Hồ sơ này gắn với phiên #{form.sequence} đã chọn khi mở biểu mẫu.</p>{form.sessionId!==session?.id&&<p>Phiên đã thay đổi. Nguồn của biểu mẫu này vẫn được giữ nguyên.</p>}{form.kind==='lead'?<LeadCreate tenant={tenant} conversation={form.conversation} acquisitionSession={form.sessionId} contactId={form.contactId} onCreated={v=>created(v,'lead')}/>:<DealForm tenant={tenant} contactId={form.contactId} conversation={form.conversation} acquisitionSession={form.sessionId} leadId={form.leadId} onSaved={v=>created(v,'deal')}/>}</Dialog>}
 {merge&&r&&<MergeLead tenant={tenant} source={r} targets={rows.filter(t=>t.id!==r.id&&!t.archived)} onClose={()=>setMerge(false)} onSaved={target=>{setSelected(target);setMerge(false);}}/>}
 </section>;
}
function ContextHistory({tenant,record,session,open}:{tenant:string;record:any;session?:string;open?:(kind:'contact'|'lead'|'conversation',id:string)=>void}){
 const [before,setBefore]=useState(''),base=`/api/v1/sales/records/${record.id}/session-context`,contexts=useApi(tenant,base+(before?'?before_id='+before:''),true,true),merges=useApi(tenant,`/api/v1/leads/${record.id}/merges`,record.object_key==='lead',true);
 return <div><ErrorNotice error={contexts.error??merges.error}/>{!contexts.error&&contexts.data?.data.some((c:any)=>c.session_id===session)&&<p role="status">Hồ sơ đã liên kết với phiên hiện tại.</p>}<details><summary>Lịch sử liên kết phiên / hợp nhất</summary>{!contexts.error&&contexts.data?.data.map((c:any)=><p key={c.id}>{({created:'Tạo hồ sơ',follow_up:'Xử lý tiếp',closing:'Chốt thắng'} as Record<string,string>)[c.kind]} · {new Date(c.recorded_at).toLocaleString('vi-VN')}<br/>Phiên {c.session_id}</p>)}{contexts.data?.next_before_id&&<Button variant="outline" onClick={()=>setBefore(contexts.data.next_before_id)}>Trang liên kết tiếp</Button>}{before&&<Button variant="outline" onClick={()=>setBefore('')}>Trang liên kết đầu</Button>}{!merges.error&&merges.data?.data.map((m:any)=><p key={m.source_id}>Lead trùng {m.source_id} → {m.target_id}<br/><Button variant="outline" onClick={()=>open?.('lead',m.source_id)}>Xem hồ sơ gốc</Button></p>)}{merges.data?.has_more&&<p>Còn lịch sử hợp nhất khác ngoài 50 mục đang hiển thị.</p>}</details></div>;
}
function MergeLead({tenant,source,targets,onClose,onSaved}:{tenant:string;source:any;targets:any[];onClose:()=>void;onSaved:(id:string)=>void}){
 const [target,setTarget]=useState(''),[preview,setPreview]=useState<any>(null),[reason,setReason]=useState(''),command=useCommand(tenant);
 return <Dialog title="Hợp nhất Lead trùng" onClose={onClose}><div className="crm-form"><p>Chỉ dùng khi hai Lead cùng một nhu cầu. Lead giữ lại không bị ghi đè. Lead trùng được lưu trữ; các Deal, nguồn và lịch sử cũ được giữ nguyên.</p><label>Lead giữ lại<select aria-label="Lead giữ lại" value={target} onChange={e=>{setTarget(e.target.value);setPreview(null);}}><option value="">Chọn Lead…</option>{targets.map(t=><option key={t.id} value={t.id}>{label(t)} · {t.id.slice(-8)}</option>)}</select></label><p>Danh sách gồm các Lead đã tải trong panel. Đóng hộp thoại và tải thêm nếu chưa thấy hồ sơ cần chọn.</p><Button disabled={!target||command.busy} onClick={async()=>{setPreview(null);const result=await command.run(`/api/v1/leads/${source.id}/merge-preview`,{target_id:target});if(result)setPreview(result.data);}}>Xem trước hợp nhất</Button>
 {preview&&<><p><strong>Lưu trữ:</strong> {label(preview.source)} ({preview.source.id})<br/><strong>Giữ lại:</strong> {label(preview.target)} ({preview.target.id})</p>{[preview.source,preview.target].map(r=><div key={r.id}><strong>{label(r)}</strong><p>{state(r)} · Owner {r.owner_principal_id??'—'}<br/>Nguồn {r.fields.source_classification??'—'} · Ad {r.fields.source_ad_id??'—'}<br/>{r.fields.qualification?.need_summary??'Chưa có tóm tắt'}</p></div>)}<label>Lý do hợp nhất<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><Button variant="destructive" disabled={command.busy||!reason.trim()} onClick={async()=>{const result=await command.run(`/api/v1/leads/${source.id}/merge`,{target_id:preview.target.id,target_version:preview.target.version,reason},'POST',preview.source.version);if(result)onSaved(result.data.target_id);else setPreview(null);}}>Xác nhận lưu trữ Lead trùng</Button></>}
 <ErrorNotice error={command.error}/></div></Dialog>;
}
