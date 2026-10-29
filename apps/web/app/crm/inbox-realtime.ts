'use client';
import {useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {INBOX_POLL_INTERVAL_MS} from './inbox-polling';
export function inboxQuery(path:unknown):boolean {
 return typeof path==='string'&&/^\/api\/v1\/(chat-workspace\/|conversations(?:\/|\?|$)|conversation-channels|human-routing\/mine|records\/[^/]+\/(ownership-history|assignment)|contacts\/[^/]+\/(needs|sessions))/.test(path);
}
export function useInboxRealtime(tenant:string,active:boolean){
 const cache=useQueryClient(),[accessDenied,setAccessDenied]=useState(false);
 useEffect(()=>{
  if(!active||process.env.NEXT_PUBLIC_INBOX_REALTIME_ENABLED!=='true')return;
  setAccessDenied(false);
  let socket:WebSocket|undefined,retry:ReturnType<typeof setTimeout>|undefined,refresh:ReturnType<typeof setTimeout>|undefined,stopped=false,denied=false,attempt=0;
  const reconcile=()=>{if(refresh)return;refresh=setTimeout(()=>{refresh=undefined;void cache.invalidateQueries({predicate:q=>q.queryKey[0]===tenant&&inboxQuery(q.queryKey[1]),refetchType:'active'});},250);};
  function connect(){
   if(stopped||denied||document.visibilityState!=='visible'||socket)return;
   const url=new URL('/api/v1/inbox-realtime',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('tenant_id',tenant);
   const current=new WebSocket(url,'crm.inbox.v1');socket=current;
   current.onmessage=e=>{try{const v=JSON.parse(e.data);if(v.version!==1||!['ready','invalidate'].includes(v.type)||Object.keys(v).length!==2)return;if(v.type==='ready')attempt=0;reconcile();}catch{/* Ignore unrecognized frames; APIs remain authoritative. */}};
   current.onclose=e=>{if(socket!==current)return;socket=undefined;if(stopped)return;
    if(e.code===4401||e.code===4403){denied=true;setAccessDenied(true);void cache.cancelQueries({queryKey:[tenant]}).then(()=>cache.resetQueries({queryKey:[tenant]}));return;}
    if(document.visibilityState==='visible'){const wait=attempt<5?Math.min(30000,1000*2**attempt++)+Math.floor(Math.random()*500):INBOX_POLL_INTERVAL_MS;retry=setTimeout(connect,wait);}
   };
   current.onerror=()=>current.close();
  }
  const visibility=()=>{clearTimeout(retry);if(document.visibilityState==='visible'){connect();}else{const old=socket;socket=undefined;old?.close();clearTimeout(refresh);refresh=undefined;}};
  document.addEventListener('visibilitychange',visibility);connect();
  return()=>{stopped=true;clearTimeout(retry);clearTimeout(refresh);document.removeEventListener('visibilitychange',visibility);socket?.close();};
 },[tenant,active,cache]);
 return accessDenied;
}
