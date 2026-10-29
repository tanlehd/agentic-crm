'use client';
import {INBOX_POLL_INTERVAL_MS} from './inbox-polling';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { useApi,ErrorNotice,can,type Context } from './api';
import { ReportsWorkspace } from './reports-workspace';
import { DashboardWorkspace } from './dashboard-workspace';
import { Workflows } from './workflows';
import { OrganicReport } from './organic-report';
import { Deals } from './deals';
import { Sales } from './sales';
import {SettingsWorkspace,settingsItems} from './settings-workspace';
import { Inbox } from './inbox';
import { Records,CreateRecord,RecordDetailPage } from './records';


import type { WorkspaceObject } from '@agentic-crm/contracts';
import { Icon } from './ui-icon';
import { Dialog } from './dialog';
function workspaceParams(){
 const url=new URL(window.location.href);
 if(url.searchParams.get('screen')==='operations'){
  url.searchParams.set('screen','workflows');
  url.searchParams.delete('record');
  history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 }
 const legacy=url.searchParams.get('screen');
 const destination=url.searchParams.has('facebook')?'channels':legacy==='admin'?'users':legacy==='schema'?'objects':legacy==='routing'?'routing':null;
 if(destination){url.searchParams.set('screen','settings');url.searchParams.set('setting',destination);history.replaceState(history.state,'',url.pathname+url.search+url.hash);}
 return url.searchParams;
}
interface Props {tenant:string;tenantSelector:ReactNode;userName:string;onLogout:()=>void;logoutBusy:boolean;moreTenants?:ReactNode}
export function CrmWorkspace(props:Props){
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,staleTime:0}}}));
 useEffect(()=>()=>{void client.cancelQueries();client.clear();},[client]);
 return <QueryClientProvider client={client}><Workspace {...props}/></QueryClientProvider>;
}
function Workspace({tenant,tenantSelector,userName,onLogout,logoutBusy,moreTenants}:Props){
 const [screen,setScreen]=useState('chat'),[setting,setSetting]=useState(''),[returnScreen,setReturnScreen]=useState('chat');
 const query=useApi(tenant,'/api/v1/crm/context',true,screen==='chat'?INBOX_POLL_INTERVAL_MS:true),[menu,setMenu]=useState<string|null>(null),[search,setSearch]=useState(''),[record,setRecord]=useState<{object:string;id:string}|null>(null),[create,setCreate]=useState<string|null>(null),[dirty,setDirty]=useState(false),[navigationVersion,setNavigationVersion]=useState(0),[initialId,setInitialId]=useState<string>(),[dealId,setDealId]=useState<string>();
 const workspaceQuery=useApi(tenant,'/api/v1/crm/workspace-objects',true,screen==='chat'?INBOX_POLL_INTERVAL_MS:true);
 const dirtyState=useRef(false),lastUrl=useRef('');dirtyState.current=dirty;useEffect(()=>{lastUrl.current=location.pathname+location.search;});
 useEffect(()=>{const params=workspaceParams(),requested=params.get('screen');setSetting(params.get('setting')??'');if(requested)setScreen(requested);const target=new URLSearchParams(window.location.search).get('record');if(target&&/^[a-f0-9-]{36}$/.test(target)){if(requested==='chat')setInitialId(target);else if(requested==='deals')setDealId(target);else if(requested==='lead')setRecord({object:'lead',id:target});}if(new URLSearchParams(window.location.search).has('dashboards'))setScreen('dashboards');if(new URLSearchParams(window.location.search).has('reporting'))setScreen('reporting');if(new URLSearchParams(window.location.search).has('workflows'))setScreen('workflows');const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setMenu('search');}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 useEffect(()=>{const pop=(event:PopStateEvent)=>{const p=workspaceParams(),next=p.has('dashboards')?'dashboards':p.has('reporting')?'reporting':p.has('workflows')?'workflows':p.get('screen')??'chat',previous=new URLSearchParams(lastUrl.current.split('?')[1]??''),prior=previous.has('dashboards')?'dashboards':previous.has('reporting')?'reporting':previous.has('workflows')?'workflows':previous.get('screen')??'chat';if((next!==prior||p.get('setting')!==previous.get('setting'))&&dirtyState.current){if(!confirm('Bỏ thay đổi chưa lưu và chuyển màn hình?')){history.pushState(null,'',lastUrl.current);event.stopImmediatePropagation();return;}setDirty(false);}setSetting(p.get('setting')??'');setScreen(p.has('dashboards')?'dashboards':p.has('reporting')?'reporting':p.has('workflows')?'workflows':p.get('screen')??'chat');};window.addEventListener('popstate',pop,true);return()=>window.removeEventListener('popstate',pop,true);},[]);
 if(query.isPending)return <div className="ui-entry" role="status">Đang tải workspace…</div>;
 if(query.error)return <div className="ui-entry"><ErrorNotice error={query.error} reload={()=>void query.refetch()}/><button onClick={onLogout}>Đăng xuất</button></div>;
 const data=query.data.data as Context,chat=data.capabilities.includes('chat')&&can(data,'conversation','read');
 const customItems=(workspaceQuery.data?.data??[]) as WorkspaceObject[];
 const customObject=customItems.find(o=>'object:'+o.key===screen);
 const items=[...customItems.map(o=>({id:'object:'+o.key,label:o.label,icon:'contact',group:'CRM'})),{id:'dashboards',label:'Dashboard',icon:'flag',group:'PHÂN TÍCH'},{id:'reporting',label:'Reports',icon:'flag',group:'PHÂN TÍCH'},...(chat?[{id:'chat',label:'Inbox',icon:'inbox',group:'CRM'}]:[]),...(can(data,'contact','read')?[{id:'contact',label:'Contacts',icon:'contact',group:'CRM'}]:[]),...(data.capabilities.includes('sales')&&can(data,'report','read')?[{id:'organic-report',label:'Doanh thu organic',icon:'flag',group:'CRM'}]:[]),...(can(data,'deal','read')?[{id:'deals',label:'Deals',icon:'flag',group:'CRM'}]:[]),...(can(data,'lead','read')?[{id:'lead',label:'Leads',icon:'flag',group:'CRM'}]:[]),{id:'workflows',label:'Workflows',icon:'flow',group:'AUTOMATION'},{id:'crm',label:'More',icon:'dots',group:'CÔNG CỤ'}];
 const allowedSettings=settingsItems.filter(i=>i.allowed(data)),settingsVisible=allowedSettings.length>0;
 const active=screen==='settings'?'settings':items.some(i=>i.id===screen)?screen:items[0]!.id;
 const selectedSetting=setting||allowedSettings[0]?.id||'users';
 function navigate(id:string,section?:string){if(id==='settings'&&active==='settings'&&(section??allowedSettings[0]?.id??'users')===selectedSetting){setMenu(null);return;}if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu và chuyển màn hình?'))return;setDirty(false);if(id==='settings'&&active!=='settings')setReturnScreen(active);setScreen(id);setSetting(section??'');setMenu(null);setNavigationVersion(v=>v+1);history.pushState(null,'',id==='settings'?'/?screen=settings&setting='+encodeURIComponent(section??allowedSettings[0]?.id??'users'):id==='dashboards'?'/?dashboards=1':id==='reporting'?'/?reporting=1':id==='chat'?'/':'/?screen='+encodeURIComponent(id));}

 function open(kind:'contact'|'lead'|'conversation',id:string){if(kind==='conversation'){setInitialId(id);navigate('chat');}else setRecord({object:kind,id});}
 function closeEditor(){if(dirty&&!window.confirm('Bỏ thay đổi chưa lưu và đóng?'))return;setDirty(false);setRecord(null);setCreate(null);}
 const nav=<>{['CRM','PHÂN TÍCH','AUTOMATION','CÔNG CỤ','QUẢN TRỊ'].map(group=>{const rows=items.filter(i=>i.group===group);return rows.length?<div className="ui-nav-group" key={group}><div className="ui-nav-label">{group}</div>{rows.map(i=><button title={i.label} key={i.id} aria-current={active===i.id?'page':undefined} onClick={()=>navigate(i.id)}><Icon name={i.icon}/><span>{i.label}</span></button>)}</div>:null;})}</>;
 return <div className="app-frame crm-workspace" data-unsaved={dirty||undefined}><a className="ui-skip" href="#workspace-main">Đến nội dung chính</a><header className="app-header"><button className="ui-icon-button ui-mobile-nav" aria-label="Mở menu ứng dụng" onClick={()=>setMenu('nav')}><Icon name="menu"/></button><a className="app-brand" href="/" aria-label="Agentic CRM"><span>a</span><b>agentic</b></a>{tenantSelector}<button className="app-search" onClick={()=>setMenu('search')} aria-label="Tìm công cụ"><Icon name="search"/><span>Tìm công cụ…</span><kbd>Ctrl K</kbd></button><div className="app-header-right">{['contact','lead'].some(k=>can(data,k,'create'))&&<button className="ui-primary" onClick={()=>setMenu('create')} aria-label="Tạo mới"><Icon name="plus"/><span>Tạo mới</span></button>}{settingsVisible&&<button className="ui-icon-button ui-settings" aria-label="Settings" title="Settings" aria-current={active==='settings'?'page':undefined} onClick={()=>navigate('settings')}><Icon name="settings"/><span>Settings</span></button>}<button className="app-profile" onClick={()=>setMenu('profile')} aria-label={`Tài khoản ${userName}`}><span className="ui-avatar">{userName.slice(0,2).toUpperCase()}</span><span>{userName}</span></button></div></header><div className={'app-body'+(active==='settings'?' is-settings':'')}><nav className="app-nav" aria-label="Menu ứng dụng">{nav}</nav><main className="app-main" id="workspace-main">
 {chat&&<div className="app-inbox-host" hidden={active!=='chat'}><Inbox tenant={tenant} context={data} initialId={initialId} active={active==='chat'} open={open}/></div>}
 {active==='settings'&&<SettingsWorkspace key={tenant} tenant={tenant} context={data} section={selectedSetting} onNavigate={section=>navigate('settings',section)} onBack={()=>navigate(returnScreen)} onDirty={setDirty} onOpen={key=>navigate('object:'+key)} onConversation={id=>open('conversation',id)}/>}
 {active!=='chat'&&active!=='settings'&&<div className="app-feature" onChangeCapture={e=>{if((e.target as HTMLElement).closest('form'))setDirty(true);}}>{active!=='schema'&&<div className="app-feature-heading"><h1>{items.find(i=>i.id===active)?.label}</h1></div>}{active==='workflows'?<Workflows key={tenant} tenant={tenant} context={data} onDirty={setDirty}/>:active==='dashboards'?<DashboardWorkspace key={tenant+navigationVersion} tenant={tenant} context={data} onDirty={setDirty}/>:active==='reporting'?<ReportsWorkspace key={tenant+navigationVersion} tenant={tenant} context={data} onDirty={setDirty}/>:active==='organic-report'?<OrganicReport tenant={tenant} openDeal={id=>{setDealId(id);navigate('deals');}}/>:active==='deals'?<Deals key={dealId??'deals'} tenant={tenant} context={data} initialId={dealId}/>:active==='lead'?<><Sales tenant={tenant} context={data} open={open}/><Records key="lead" tenant={tenant} context={data} initial={{object:'lead',id:''}}/></>:<Records key={active} tenant={tenant} context={data} fixedObject={customObject?.key} displayProperty={customObject?.display_property_key??undefined} initial={customObject?{object:customObject.key,id:''}:active==='contact'?{object:'contact',id:''}:undefined}/>}</div>}
 </main></div>
 {menu&&<Dialog title={menu==='search'?'Tìm công cụ':menu==='create'?'Tạo mới':menu==='nav'?'Menu ứng dụng':'Tài khoản'} onClose={()=>setMenu(null)}>{menu==='profile'?<><h3>{userName}</h3><p>Workspace hiện tại và quyền được quản lý theo tổ chức.</p>{moreTenants}<button disabled={logoutBusy} className="ui-primary" onClick={()=>{if(document.querySelector('[data-unsaved="true"]')&&!window.confirm('Bỏ bản nháp chưa lưu và đăng xuất?'))return;onLogout();}}>Đăng xuất</button></>:menu==='create'?<div className="ui-menu-list">{['contact','lead'].filter(k=>can(data,k,'create')).map(k=><button key={k} onClick={()=>{setCreate(k);setMenu(null);}}><Icon name={k==='contact'?'contact':'flag'}/>{k==='contact'?'Contact':'Lead'}</button>)}</div>:menu==='nav'?<nav className="ui-mobile-menu">{nav}</nav>:<><label>Tìm công cụ<input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Inbox, Contacts, Leads…"/></label><div className="ui-menu-list">{[...items,...(settingsVisible?[{id:'settings',label:'Settings',icon:'settings',group:'QUẢN TRỊ'}]:[])].filter(i=>i.label.toLowerCase().includes(search.toLowerCase())).map(i=><button key={i.id} onClick={()=>navigate(i.id)}><Icon name={i.icon}/>{i.label}</button>)}</div><p>Chỉ tìm công cụ bạn có quyền truy cập.</p></>}</Dialog>}
 {(record||create)&&<Dialog wide title={create?`Tạo ${create==='contact'?'Contact':'Lead'}`:'Thông tin CRM'} onClose={closeEditor}><div onChangeCapture={()=>setDirty(true)}>{create?<CreateRecord tenant={tenant} context={data} object={create} onSaved={()=>{setDirty(false);setCreate(null);}}/>:<RecordDetailPage key={record!.id} tenant={tenant} context={data} object={record!.object} id={record!.id}/>}</div></Dialog>}
 </div>;
}
