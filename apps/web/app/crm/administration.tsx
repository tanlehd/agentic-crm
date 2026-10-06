'use client';
import { useEffect,useState } from 'react';
import { Button } from '../../components/ui/button';
import { useApi,useCommand,ErrorNotice,can,type Context } from './api';
import { FacebookSettings } from './facebook-settings';
const routes=[['memberships','Thành viên','membership'],['roles','Vai trò','role'],['teams','Nhóm','team'],['ai-agents','AI Agents','agent'],['channels','Channels','integration']] as const;
export function Administration({tenant,context}:{tenant:string;context:Context}){
  const [route,setRoute]=useState<string>('memberships');
  useEffect(()=>{if(new URLSearchParams(window.location.search).has('facebook'))setRoute('channels');},[]);
  return <div className="crm-card"><h3>Quản trị tổ chức</h3><p>Seat cho phép sử dụng công cụ; role quy định thao tác và phạm vi dữ liệu.</p><div className="crm-tabs">{routes.filter(([, ,resource])=>can(context,resource,'read')).map(([key,label])=><Button key={key} variant={route===key?'default':'outline'} onClick={()=>setRoute(key)}>{label}</Button>)}</div>{route==='channels'?<FacebookSettings tenant={tenant} context={context}/>:<AdminCollection key={route} tenant={tenant} context={context} route={route}/>}</div>;
}
function AdminCollection({tenant,context,route}:{tenant:string;context:Context;route:string}){
  const [cursor,setCursor]=useState<string|null>(null),[selected,setSelected]=useState<any>(null),[creating,setCreating]=useState(false);
  const resource=routes.find(r=>r[0]===route)![2],list=useApi(tenant,`/api/v1/admin/${route}?limit=100${cursor?'&cursor='+encodeURIComponent(cursor):''}`,can(context,resource,'read'));
  const roles=useApi(tenant,'/api/v1/admin/roles?limit=100',can(context,'role','read')),teams=useApi(tenant,'/api/v1/admin/teams?limit=100',can(context,'team','read'));
  const members=useApi(tenant,'/api/v1/admin/memberships?limit=100',route==='teams'&&can(context,'membership','read'));
  if(!can(context,resource,'read'))return <p>Chưa có quyền quản trị mục này.</p>;
  return <><div className="crm-toolbar"><h4>{routes.find(r=>r[0]===route)![1]}</h4>{can(context,resource,'create')&&<Button onClick={()=>{setSelected(null);setCreating(true);}}>Thêm mới</Button>}</div>{list.isPending?<p role="status">Đang tải quản trị…</p>:list.error?<ErrorNotice error={list.error} reload={()=>void list.refetch()}/>:<><div className="crm-table-wrap"><table><thead><tr><th>Thông tin</th><th>Trạng thái / quyền</th><th>Thao tác</th></tr></thead><tbody>{list.data.data.map((r:any)=><tr key={r.id}><td><strong>{r.name??r.account_id}</strong><small>{r.key??r.id}</small>{route==='ai-agents'&&<small>Policy: {r.policy_id} · Runtime: {r.runtime_adapter}</small>}</td><td>{route==='memberships'?<><span className="crm-badge">{r.seat_code} · {r.status}</span><small>Roles: {r.role_ids.map((id:string)=>roles.data?.data.find((x:any)=>x.id===id)?.name??id).join(', ')}</small><small>Nhóm: {r.team_ids.map((id:string)=>teams.data?.data.find((x:any)=>x.id===id)?.name??id).join(', ')}</small></>:route==='roles'?`${r.permissions.length} quyền`:route==='teams'?<>{r.purpose} · {r.active?'Active':'Inactive'}<small>Thành viên: {members.data?.data.filter((m:any)=>m.team_ids.includes(r.id)).map((m:any)=>m.account_id.slice(0,8)).join(', ')||'Chưa có trong trang đã tải'}</small></>:`Tối đa ${r.max_concurrency} lượt đồng thời`}</td><td>{can(context,resource,'update')&&<Button variant="outline" onClick={()=>{setCreating(false);setSelected(r);}}>Sửa</Button>}</td></tr>)}</tbody></table></div>{!list.data.data.length&&<p>Chưa có dữ liệu.</p>}<div className="crm-actions">{cursor&&<Button variant="outline" onClick={()=>setCursor(null)}>Trang đầu</Button>}{list.data.next_cursor&&<Button variant="outline" onClick={()=>setCursor(list.data.next_cursor)}>Trang tiếp</Button>}</div></>}
    {(creating||selected)&&<AdminEditor key={selected?.id+':'+selected?.version} tenant={tenant} route={route} record={selected} roles={roles.data?.data??[]} teams={teams.data?.data??[]} onClose={()=>{setSelected(null);setCreating(false);}}/>}
  </>;
}
function AdminEditor({tenant,route,record,roles,teams,onClose}:{tenant:string;route:string;record:any;roles:any[];teams:any[];onClose:()=>void}){
  const [body,setBody]=useState<any>(record?{...record}:route==='memberships'?{account_id:'',seat_code:'viewer',role_ids:[],team_ids:[]}:route==='roles'?{key:'',name:'',permissions:[]}:route==='teams'?{name:'',purpose:'general'}:{name:'',runtime_adapter:'mock',policy_id:'',max_concurrency:1,role_ids:[],team_ids:[]}),command=useCommand(tenant);
  const set=(key:string,value:any)=>setBody((b:any)=>({...b,[key]:value}));
  const list=(key:string,values:any[])=> <fieldset><legend>{key==='role_ids'?'Vai trò':'Nhóm'}</legend>{values.map(r=><label key={r.id} className="crm-check"><input type="checkbox" checked={body[key]?.includes(r.id)??false} onChange={e=>set(key,e.target.checked?[...(body[key]??[]),r.id]:(body[key]??[]).filter((id:string)=>id!==r.id))}/>{r.name}</label>)}</fieldset>;
  const submit=async(e:React.FormEvent)=>{e.preventDefault();const allowed=route==='memberships'?record?['seat_code','status','role_ids','team_ids']:['account_id','seat_code','role_ids','team_ids']:route==='roles'?record?['name','permissions']:['key','name','permissions']:route==='teams'?record?['name','active']:['name','purpose']:record?['name','policy_id','max_concurrency','role_ids','team_ids']:['name','runtime_adapter','policy_id','max_concurrency','role_ids','team_ids'];const input=Object.fromEntries(allowed.filter(k=>body[k]!==undefined).map(k=>[k,body[k]]));if(await command.run(`/api/v1/admin/${route}${record?'/'+record.id:''}`,input,record?'PATCH':'POST',record?.version))onClose();};
  return <form className="crm-form crm-editor" onSubmit={submit}>
    <h3>{record?'Chỉnh sửa':'Thêm mới'}</h3>
    {route==='memberships' ? <>
      {!record&&<label>Account ID đã tồn tại<input required value={body.account_id} onChange={e=>set('account_id',e.target.value)}/></label>}
      <label>Seat<select aria-label="Seat" value={body.seat_code} onChange={e=>set('seat_code',e.target.value)}>{['viewer','chat','sales','service','admin'].map(v=><option key={v}>{v}</option>)}</select></label>
      {record&&<label>Trạng thái<select aria-label="Trạng thái" value={body.status} onChange={e=>set('status',e.target.value)}>{['active','suspended'].map(v=><option key={v}>{v}</option>)}</select></label>}
      {list('role_ids',roles)}{list('team_ids',teams)}
    </> : <>
      <label>Tên<input required value={body.name} maxLength={255} onChange={e=>set('name',e.target.value)}/></label>
      {route==='roles'&&<>
        {!record&&<label>Key<input required pattern="[a-z][a-z0-9_]*" value={body.key} onChange={e=>set('key',e.target.value)}/></label>}
        <fieldset><legend>Ma trận quyền</legend>
          {body.permissions.map((p:any,i:number)=><div className="permission-row" key={i}>
            {['resource','action'].map(k=><label key={k}>{k}<input aria-label={`${k} ${i+1}`} required value={p[k]} onChange={e=>set('permissions',body.permissions.map((old:any,j:number)=>i===j?{...old,[k]:e.target.value}:old))}/></label>)}
            <label>Phạm vi<select aria-label="Phạm vi" value={p.scope} onChange={e=>set('permissions',body.permissions.map((old:any,j:number)=>i===j?{...old,scope:e.target.value}:old))}>{['own','team','all'].map(scope=><option key={scope}>{scope}</option>)}</select></label>
            <Button variant="outline" onClick={()=>set('permissions',body.permissions.filter((_:any,j:number)=>i!==j))}>Bỏ</Button>
          </div>)}
          <Button variant="outline" onClick={()=>set('permissions',[...body.permissions,{resource:'contact',action:'read',scope:'own'}])}>Thêm quyền</Button>
        </fieldset>
      </>}
      {route==='teams'&&(record?<label className="crm-check"><input type="checkbox" checked={body.active} onChange={e=>set('active',e.target.checked)}/>Nhóm hoạt động</label>:<label>Mục đích<select aria-label="Mục đích" value={body.purpose} onChange={e=>set('purpose',e.target.value)}>{['general','chat','sales','service'].map(v=><option key={v}>{v}</option>)}</select></label>)}
      {route==='ai-agents'&&<>
        <label>Policy ID<input required value={body.policy_id} onChange={e=>set('policy_id',e.target.value)}/></label>
        <label>Giới hạn đồng thời<input required type="number" min={1} value={body.max_concurrency} onChange={e=>set('max_concurrency',Number(e.target.value))}/></label>
        {list('role_ids',roles)}{list('team_ids',teams)}
      </>}
    </>}
    <ErrorNotice error={command.error}/>
    <div className="crm-actions"><Button type="submit" disabled={command.busy}>Lưu cấu hình</Button><Button variant="outline" onClick={onClose}>Đóng</Button></div>
  </form>;
}
