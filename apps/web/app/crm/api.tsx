'use client';
import { useRef,useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
export interface ApiError extends Error {code?:string;status?:number;fields?:{path:string;code:string}[]}
export async function request(tenant:string,path:string,init:RequestInit={}){
  const response=await fetch(path,{...init,cache:'no-store',headers:{'X-Tenant-Id':tenant,...init.headers}});
  const body=await response.json();if(!response.ok)throw Object.assign(new Error(body.error?.message??'Không thể kết nối.'),{status:response.status,code:body.error?.code,fields:body.error?.fields});return body;
}
export function useApi(tenant:string,path:string,enabled=true){return useQuery({queryKey:[tenant,path],queryFn:({signal})=>request(tenant,path,{signal}),enabled,retry:false,refetchOnWindowFocus:false});}
export function useCommand(tenant:string){
  const [busy,setBusy]=useState(false),[error,setError]=useState<ApiError|null>(null),keys=useRef(new Map<string,string>()),cache=useQueryClient();
  async function run(path:string,body:unknown,method='POST',version?:string){
    setBusy(true);setError(null);const signature=JSON.stringify([path,body,method,version]);let key=keys.current.get(signature);if(!key){key=crypto.randomUUID();keys.current.set(signature,key);}
    try{const csrf=await fetch('/auth/csrf',{cache:'no-store'});if(!csrf.ok)throw Object.assign(new Error('Phiên đăng nhập đã hết hạn.'),{status:401});
      const result=await request(tenant,path,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':(await csrf.json()).data.csrf_token,'Idempotency-Key':key,...(version?{'If-Match':`"${version}"`}:{})},body:JSON.stringify(body)});
      keys.current.delete(signature);await cache.invalidateQueries({queryKey:[tenant]});return result;
    }catch(e){setError(e as ApiError);return null;}finally{setBusy(false);}
  }
  return {run,busy,error,setError};
}
export function ErrorNotice({error,reload}:{error:ApiError|null|undefined;reload?:()=>void}){
  if(!error)return null;const code=error.code;return <div className="crm-error" role="alert"><strong>{error.status===401?'Phiên đăng nhập đã hết hạn.':error.status===403?'Bạn chưa có quyền thực hiện thao tác này.':error.status===404?'Record không còn tồn tại hoặc nằm ngoài quyền truy cập.':code==='VERSION_CONFLICT'?'Record đã thay đổi. Tải bản mới trước khi lưu lại.':code==='ACTIVE_DEPENDENCY'?'Không thể lưu trữ: liên hệ còn Lead đang hoạt động.':error.status===422?'Kiểm tra dữ liệu đã nhập.':'Không thể hoàn tất yêu cầu.'}</strong>{code&&<small>Mã: {code}</small>}{error.fields?.map(f=><div key={f.path}>{f.path}: dữ liệu không hợp lệ hoặc không được phép.</div>)}{error.status===401?<a href="/auth/login">Đăng nhập lại</a>:reload&&<button type="button" onClick={reload}>Tải lại</button>}</div>;
}
export interface Context {principal_id:string;capabilities:string[];grants:{resource:string;action:string;scope:string}[];objects:{id:string;key:string;label:string;kind:string;version:string}[]}
export function can(context:Context,resource:string,action:string,record?:any){
  const capable=resource==='schema'||['membership','role','team','agent'].includes(resource)?context.capabilities.includes('configure'):action==='read'?context.capabilities.includes('read'):context.capabilities.some(c=>['chat','sales','service'].includes(c));
  return capable&&context.grants.some(g=>g.resource===resource&&g.action===action&&(g.scope==='all'||!record||g.scope==='own'&&record.owner_principal_id===context.principal_id||g.scope==='team'));
}
