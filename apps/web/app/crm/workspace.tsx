'use client';
import { useEffect,useState,type ReactNode } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { useApi,ErrorNotice,can,type Context } from './api';
import { Sales } from './sales';
import { Operations } from './operations';
import { Inbox } from './inbox';
import { Records,CreateRecord } from './records';
import { Administration } from './administration';
import { Metadata } from './metadata';
import { Icon } from './ui-icon';
import { Dialog } from './dialog';
interface Props {tenant:string;tenantSelector:ReactNode;userName:string;onLogout:()=>void;logoutBusy:boolean;moreTenants?:ReactNode}
export function CrmWorkspace(props:Props){
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,staleTime:0}}}));
 useEffect(()=>()=>{void client.cancelQueries();client.clear();},[client]);
 return <QueryClientProvider client={client}><Workspace {...props}/></QueryClientProvider>;
}
function Workspace({tenant,tenantSelector,userName,onLogout,logoutBusy,moreTenants}:Props){
 const query=useApi(tenant,'/api/v1/crm/context',true,true),[screen,setScreen]=useState('chat'),[menu,setMenu]=useState<string|null>(null),[search,setSearch]=useState(''),[record,setRecord]=useState<{object:string;id:string}|null>(null),[create,setCreate]=useState<string|null>(null),[dirty,setDirty]=useState(false),[initialId,setInitialId]=useState<string>();
 useEffect(()=>{if(new URLSearchParams(window.location.search).has('facebook'))setScreen('admin');const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setMenu('search');}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 if(query.isPending)return <div className="ui-entry" role="status">Đang tải workspace…</div>;
 if(query.error)return <div className="ui-entry"><ErrorNotice error={query.error} reload={()=>void query.refetch()}/><button onClick={onLogout}>Đăng xuất</button></div>;
 const data=query.data.data as Context,chat=data.capabilities.includes('chat')&&can(data,'conversation','read');
 const items=[...(chat?[{id:'chat',label:'Inbox',icon:'inbox',group:'CRM'}]:[]),...(can(data,'contact','read')?[{id:'contact',label:'Contacts',icon:'contact',group:'CRM'}]:[]),...(can(data,'lead','read')?[{id:'lead',label:'Leads',icon:'flag',group:'CRM'}]:[]),...(can(data,'automation','read')||can(data,'automation','design')?[{id:'operations',label:'Workflow',icon:'flow',group:'AUTOMATION'}]:[]),{id:'crm',label:'More',icon:'dots',group:'CÔNG CỤ'},...(data.capabilities.includes('configure')?[{id:'admin',label:'Cài đặt workspace',icon:'settings',group:'QUẢN TRỊ'}]:[]),...(can(data,'schema','read')?[{id:'schema',label:'Cấu hình dữ liệu',icon:'settings',group:'QUẢN TRỊ'}]:[])];
 const active=items.some(i=>i.id===screen)?screen:items[0]!.id;
 function navigate(id:string){if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu và chuyển màn hình?'))return;setDirty(false);setScreen(id);setMenu(null);}
 function open(kind:'contact'|'lead'|'conversation',id:string){if(kind==='conversation'){setInitialId(id);setScreen('chat');}else setRecord({object:kind,id});}
 function closeEditor(){if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu và đóng?'))return;setDirty(false);setRecord(null);setCreate(null);}
 const nav=<>{['CRM','AUTOMATION','CÔNG CỤ','QUẢN TRỊ'].map(group=>{const rows=items.filter(i=>i.group===group);return rows.length?<div className="ui-nav-group" key={group}><div className="ui-nav-label">{group}</div>{rows.map(i=><button title={i.label} key={i.id} aria-current={active===i.id?'page':undefined} onClick={()=>navigate(i.id)}><Icon name={i.icon}/><span>{i.label}</span></button>)}</div>:null;})}</>;
 return <div className="app-frame crm-workspace" data-unsaved={dirty||undefined}><a className="ui-skip" href="#workspace-main">Đến nội dung chính</a><header className="app-header"><button className="ui-icon-button ui-mobile-nav" aria-label="Mở menu ứng dụng" onClick={()=>setMenu('nav')}><Icon name="menu"/></button><a className="app-brand" href="/" aria-label="Agentic CRM"><span>a</span><b>agentic</b></a>{tenantSelector}<button className="app-search" onClick={()=>setMenu('search')} aria-label="Tìm công cụ"><Icon name="search"/><span>Tìm công cụ…</span><kbd>Ctrl K</kbd></button><div className="app-header-right">{['contact','lead'].some(k=>can(data,k,'create'))&&<button className="ui-primary" onClick={()=>setMenu('create')} aria-label="Tạo mới"><Icon name="plus"/><span>Tạo mới</span></button>}{data.capabilities.includes('configure')&&<button className="ui-icon-button ui-settings" aria-label="Cài đặt workspace" onClick={()=>navigate('admin')}><Icon name="settings"/></button>}<button className="app-profile" onClick={()=>setMenu('profile')} aria-label={`Tài khoản ${userName}`}><span className="ui-avatar">{userName.slice(0,2).toUpperCase()}</span><span>{userName}</span></button></div></header><div className="app-body"><nav className="app-nav" aria-label="Menu ứng dụng">{nav}</nav><main className="app-main" id="workspace-main">
 {chat&&<div className="app-inbox-host" hidden={active!=='chat'}><Inbox tenant={tenant} context={data} initialId={initialId} active={active==='chat'} open={open}/></div>}
 {active!=='chat'&&<div className="app-feature" onChangeCapture={e=>{if((e.target as HTMLElement).closest('form'))setDirty(true);}}><div className="app-feature-heading"><h1>{items.find(i=>i.id===active)?.label}</h1></div>{active==='lead'?<><Sales tenant={tenant} context={data} open={open}/><Records key="lead" tenant={tenant} context={data} initial={{object:'lead',id:''}}/></>:active==='operations'?<Operations tenant={tenant} context={data}/>:active==='admin'?<Administration tenant={tenant} context={data}/>:active==='schema'?<Metadata tenant={tenant} context={data}/>:<Records key={active} tenant={tenant} context={data} initial={active==='contact'?{object:'contact',id:''}:undefined}/>}</div>}
 </main></div>
 {menu&&<Dialog title={menu==='search'?'Tìm công cụ':menu==='create'?'Tạo mới':menu==='nav'?'Menu ứng dụng':'Tài khoản'} onClose={()=>setMenu(null)}>{menu==='profile'?<><h3>{userName}</h3><p>Workspace hiện tại và quyền được quản lý theo tổ chức.</p>{moreTenants}<button disabled={logoutBusy} className="ui-primary" onClick={()=>{if(document.querySelector('[data-unsaved="true"]')&&!window.confirm('Bỏ bản nháp chưa lưu và đăng xuất?'))return;onLogout();}}>Đăng xuất</button></>:menu==='create'?<div className="ui-menu-list">{['contact','lead'].filter(k=>can(data,k,'create')).map(k=><button key={k} onClick={()=>{setCreate(k);setMenu(null);}}><Icon name={k==='contact'?'contact':'flag'}/>{k==='contact'?'Contact':'Lead'}</button>)}</div>:menu==='nav'?<nav className="ui-mobile-menu">{nav}</nav>:<><label>Tìm công cụ<input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Inbox, Contacts, Leads…"/></label><div className="ui-menu-list">{items.filter(i=>i.label.toLowerCase().includes(search.toLowerCase())).map(i=><button key={i.id} onClick={()=>navigate(i.id)}><Icon name={i.icon}/>{i.label}</button>)}</div><p>Chỉ tìm công cụ bạn có quyền truy cập.</p></>}</Dialog>}
 {(record||create)&&<Dialog wide title={create?`Tạo ${create==='contact'?'Contact':'Lead'}`:'Thông tin CRM'} onClose={closeEditor}><div onChangeCapture={()=>setDirty(true)}>{create?<CreateRecord tenant={tenant} context={data} object={create} onSaved={()=>{setDirty(false);setCreate(null);}}/>:<Records key={record!.id} tenant={tenant} context={data} initial={record!}/>}</div></Dialog>}
 </div>;
}
