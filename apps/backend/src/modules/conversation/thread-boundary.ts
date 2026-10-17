import type {NestExpressApplication} from '@nestjs/platform-express';
// Deprecated /threads alias only. Canonical routes use /conversations.
const opaque=new Set(['values','values_json','custom_values','fields','qualification','payload','graph','config','context','content','reply_to','attachment','proposal','history']);
export function threadDto(value:any):any{
 if(Array.isArray(value))return value.map(threadDto);if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k==='conversation_id'?'thread_id':k==='conversation_session_id'?'session_id':k,opaque.has(k)?v:k==='status_url'&&typeof v==='string'?v.replace('/api/v1/conversations/','/api/v1/threads/'):threadDto(v)]));
}
export function threadBoundary(app:NestExpressApplication){
 app.use((req:any,res:any,next:()=>void)=>{
  if(!/^\/api\/v1\/threads(?:\/|\?|$)/.test(req.url)){next();return;}
  req.url=req.url.replace('/api/v1/threads','/api/v1/conversations');
  const end=res.end.bind(res);res.end=(body:any,...args:any[])=>{if(typeof body==='string'&&String(res.getHeader('content-type')).startsWith('application/json')){body=JSON.stringify(threadDto(JSON.parse(body)));res.removeHeader('Content-Length');}return end(body,...args);};next();
 });
}
