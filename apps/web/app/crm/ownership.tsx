'use client';
import { useRef,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { request,useCommand,ErrorNotice } from './api';
import type { ConversationEntity as Conversation } from '../../../../packages/contracts/src/generated/conversation-entity';
import type { RoutingTarget } from '../../../../packages/contracts/src/generated/routing-target';
import type { RoutingHistoryEntry } from '../../../../packages/contracts/src/generated/routing-history-entry';
const reasons:Record<string,string>={unavailable:'Không sẵn sàng',team:'Không thuộc nhóm',capability:'Seat không phù hợp',role:'Thiếu quyền',field:'Hạn chế quyền trường',policy:'Policy chưa cho phép',capacity:'Đã hết capacity'};
type Pending={path:string;body:Record<string,unknown>;version:string};
export function Ownership({tenant,record:r,reload,expanded=false}:{tenant:string;record:Conversation;reload:()=>void;expanded?:boolean}){
  const keys=useRef(new Map<string,string>()),command=useCommand(tenant,keys.current),[selected,setSelected]=useState(r.owner_principal_id??''),[version,setVersion]=useState(r.version),[pending,setPending]=useState<Pending|null>(null),[notice,setNotice]=useState('');
  const targets=useQuery({queryKey:[tenant,`/api/v1/records/${r.id}/assignment-targets`],queryFn:({signal})=>request(tenant,`/api/v1/records/${r.id}/assignment-targets`,{signal}),retry:false,refetchInterval:5000});
  const history=useQuery({queryKey:[tenant,`/api/v1/records/${r.id}/ownership-history`],queryFn:({signal})=>request(tenant,`/api/v1/records/${r.id}/ownership-history`,{signal}),retry:false,refetchInterval:5000});
  const stale=version!==r.version,canAssign=r.allowed_actions?.includes('assign'),canTakeover=r.allowed_actions?.includes('takeover');
  async function submit(input:Pending){setPending(input);setNotice('');const result=await command.run(input.path,input.body,'POST',input.version);if(result){setPending(null);setVersion(result.data.version);setSelected(result.data.owner_principal_id??'');setNotice('Đã cập nhật phân công.');}else if(command.failure.current?.status&&command.failure.current.status<500)setPending(null);reload();}
  const blocked=command.busy||!!pending||stale||targets.isPending||!!targets.error;
  return <details className="chat-note" open={expanded}><summary>Phân công & lịch sử</summary><p>Nhóm hiện tại: {r.team_id??'Chưa có nhóm'} · Capability: Chat</p>
    {targets.isPending?<p role="status">Đang kiểm tra người đủ điều kiện…</p>:targets.error?<ErrorNotice error={targets.error} reload={()=>void targets.refetch()}/>:<>
      {canAssign&&<form onSubmit={e=>{e.preventDefault();if(!blocked)void submit({path:`/api/v1/records/${r.id}/assignment`,body:{owner_principal_id:selected||null,reason:'manual'},version});}}><label>Owner mới<select aria-label="Owner mới" value={selected} disabled={blocked} onChange={e=>setSelected(e.target.value)}><option value="">Chưa phân công — giữ trong hàng chờ</option>{(targets.data.data as RoutingTarget[]).map(p=><option key={p.id} value={p.id} disabled={!p.eligible}>{p.kind==='human'?'Human':'AI'} · {p.id}{p.reason?` · ${reasons[p.reason]}`:''}</option>)}</select></label><Button type="submit" disabled={blocked||!!selected&&!(targets.data.data as RoutingTarget[]).some(p=>p.id===selected&&p.eligible)}>Lưu phân công</Button></form>}
      {canTakeover&&<Button type="button" variant="outline" disabled={blocked} onClick={()=>void submit({path:`/api/v1/conversations/${r.id}/takeover`,body:{reason:'human_takeover'},version})}>Tiếp quản hội thoại</Button>}
    </>}
    {stale&&!pending&&<p role="alert">Hội thoại đã thay đổi. <Button variant="outline" onClick={()=>{setVersion(r.version);setSelected(r.owner_principal_id??'');command.setError(null);}}>Xem lại phân công hiện tại</Button></p>}
    {pending&&!command.busy&&<p role="status">Chưa xác định kết quả. <Button variant="outline" onClick={()=>void submit(pending)}>Kiểm tra lại phân công</Button></p>}
    <ErrorNotice error={command.error}/>{notice&&<p role="status">{notice}</p>}
    <h4>Lịch sử phân công</h4>{history.error?<ErrorNotice error={history.error}/>:history.isPending?<p>Đang tải lịch sử…</p>:<ol>{(history.data.data as RoutingHistoryEntry[]).map(h=><li key={h.owner_revision}>#{h.owner_revision} · {h.to_owner_id??'Hàng chờ'} · {h.reason}</li>)}</ol>}
  </details>;
}
