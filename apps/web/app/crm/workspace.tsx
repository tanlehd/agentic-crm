'use client';
import { useEffect,useState } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { useApi,ErrorNotice,can,type Context } from './api';
import { Inbox } from './inbox';
import { Records } from './records';
import { Administration } from './administration';
import { Metadata } from './metadata';
export function CrmWorkspace({tenant}:{tenant:string}){
  const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false,staleTime:0},mutations:{retry:false}}}));
  useEffect(()=>()=>{void client.cancelQueries();client.clear();},[client]);
  return <QueryClientProvider client={client}><Workspace tenant={tenant}/></QueryClientProvider>;
}
function Workspace({tenant}:{tenant:string}){
  const context=useApi(tenant,'/api/v1/crm/context'),[tab,setTab]=useState('crm');
  if(context.isPending)return <section className="crm-card" role="status">Đang tải workspace…</section>;
  if(context.error)return <ErrorNotice error={context.error} reload={()=>void context.refetch()}/>;
  const data=context.data.data as Context;
  return <section className="crm-workspace" aria-label="CRM workspace"><div className="crm-toolbar"><div><div className="eyebrow">WORKSPACE</div><h2>Dữ liệu & cộng tác</h2></div><div className="crm-tabs"><Button variant={tab==='chat'?'default':'outline'} onClick={()=>setTab('chat')}>Chat</Button><Button variant={tab==='crm'?'default':'outline'} onClick={()=>setTab('crm')}>CRM</Button>{data.capabilities.includes('configure')&&<Button variant={tab==='admin'?'default':'outline'} onClick={()=>setTab('admin')}>Quản trị</Button>}{can(data,'schema','read')&&<Button variant={tab==='schema'?'default':'outline'} onClick={()=>setTab('schema')}>Cấu hình dữ liệu</Button>}</div></div>
    {tab==='chat'?<Inbox tenant={tenant} context={data}/>:tab==='crm'?<Records tenant={tenant} context={data}/>:tab==='admin'?<Administration tenant={tenant} context={data}/>:<Metadata tenant={tenant} context={data}/>}
  </section>;
}
