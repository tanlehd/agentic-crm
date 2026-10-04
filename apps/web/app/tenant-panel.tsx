'use client';
import { useEffect, useState } from 'react';
interface Membership {id:string;tenant_id:string;tenant_name:string;seat_code:string}
export function TenantPanel(){
  const [members,setMembers]=useState<Membership[]>([]),[selected,setSelected]=useState(''),[cursor,setCursor]=useState<string|null>(null);
  const [message,setMessage]=useState('Đang tải tổ chức…'),[error,setError]=useState(false),[loading,setLoading]=useState(false);
  async function load(next?:string){
    setLoading(true);setError(false);
    try{
      const response=await fetch(`/api/v1/me/memberships?limit=100${next?'&cursor='+encodeURIComponent(next):''}`,{cache:'no-store'});
      if(!response.ok)throw new Error();const body=await response.json();
      setMembers(previous=>next?[...previous,...body.data]:body.data);setCursor(body.next_cursor);
      if(!next)setMessage(body.data.length?'Chọn tổ chức để làm việc.':'Tài khoản chưa được cấp quyền vào tổ chức nào.');
    }catch{setError(true);setMessage('Không thể tải tổ chức. Vui lòng thử lại.');}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    if(!selected)return;const controller=new AbortController();
    setMessage('Đang kiểm tra quyền truy cập…');
    void fetch('/api/v1/admin/teams?limit=1',{headers:{'X-Tenant-Id':selected},cache:'no-store',signal:controller.signal}).then(async response=>{
      if(response.status===403){setMessage('Tổ chức đã chọn. Bạn chưa có quyền xem danh sách nhóm quản trị.');return;}
      if(!response.ok)throw new Error();
      await response.json();setMessage('Đã kết nối tổ chức. Bạn có quyền xem danh sách nhóm quản trị.');
    }).catch(()=>{if(!controller.signal.aborted)setMessage('Chưa thể xác minh quyền truy cập tổ chức.');});
    return()=>controller.abort();
  },[selected]);
  return <section className="auth-panel" aria-label="Tổ chức">
    <div><h2>Tổ chức</h2>{members.length>0&&<label>Chọn tổ chức <select aria-label="Chọn tổ chức" value={selected} onChange={event=>setSelected(event.target.value)}><option value="">Chọn tổ chức…</option>{members.map(member=><option key={member.id} value={member.tenant_id}>{member.tenant_name} · {member.seat_code}</option>)}</select></label>}<p role="status">{message}</p></div>
    {error&&<button disabled={loading} onClick={()=>void load()}>Tải lại tổ chức</button>}{cursor&&<button disabled={loading} onClick={()=>void load(cursor)}>Tải thêm tổ chức</button>}
  </section>;
}
