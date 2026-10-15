import {request} from './api';
export async function dashboardRequest(tenant:string,path:string,body?:unknown,options:{method?:string;revision?:string;key?:string;signal?:AbortSignal}={}){
 if(body===undefined)return (await request(tenant,'/api/v1/reporting/'+path,{signal:options.signal})).data;
 const response=await fetch('/auth/csrf',{cache:'no-store',signal:options.signal});if(!response.ok)throw Object.assign(new Error('Session expired'),{status:401});const csrf=(await response.json()).data.csrf_token;
 return (await request(tenant,'/api/v1/reporting/'+path,{method:options.method??'POST',signal:options.signal,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':options.key??crypto.randomUUID(),...(options.revision?{'If-Match':`"${options.revision}"`}:{})},body:JSON.stringify(body)})).data;
}
