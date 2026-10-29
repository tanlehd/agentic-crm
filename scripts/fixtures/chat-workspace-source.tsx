// Browser fixture: actual workspace/forms; every owner HTTP request is intercepted by the test.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Customer360} from '../../apps/web/app/crm/customer360';
import {LeadCreate} from '../../apps/web/app/crm/records';
import {DealForm} from '../../apps/web/app/crm/deals';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const cache=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
type Scope={tenant:string;conversation:string;contactId:string;mode:'workspace'|'manual-lead'|'manual-deal'};
const context={principal_id:id(9),capabilities:['read','chat','sales'],objects:[],grants:['lead','deal'].flatMap(resource=>['read','create','qualify','update'].map(action=>({resource,action,scope:'all'})))};
const fixture={
 configure:(_scope:Partial<Scope>)=>{},
 sessions:(tenant:string,conversation:string,rows:unknown[])=>cache.setQueryData([tenant,`/api/v1/conversations/${conversation}/acquisition-sessions`],{pages:[{data:rows,next_before_sequence:null}],pageParams:[null]}),
 saved:[] as unknown[],
};
Object.assign(window,{workspaceSourceFixture:fixture});
function App(){
 const [scope,setScope]=useState<Scope>({tenant:id(1),conversation:id(2),contactId:id(3),mode:'workspace'});
 fixture.configure=next=>setScope(old=>({...old,...next}));
 const saved=(record:unknown)=>{fixture.saved.push(record);};
 return <QueryClientProvider client={cache}>{scope.mode==='workspace'?<Customer360 {...scope} context={context} canEdit/>:scope.mode==='manual-lead'?<LeadCreate tenant={scope.tenant} onCreated={saved}/>:<DealForm tenant={scope.tenant} onSaved={saved}/>}</QueryClientProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
