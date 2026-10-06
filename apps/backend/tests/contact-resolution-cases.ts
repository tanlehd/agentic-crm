import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ChannelsController,ChannelsRuntime } from '../src/modules/channels/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import type { MessengerIntake } from '../src/modules/channels/intake.js';
import { Worker } from '../../../services/crm-connector/src/worker.js';
import type { Claim,Result,Store } from '../../../services/crm-connector/src/store.js';
export function contactResolutionCases(context:()=>{ds:DataSource;app:MessengerIntake;tenant:string;connection:string;token:string;beta:string;betaConnection:string;betaToken:string}){
 it('SRC-030 CRM atomic resolve/replay, both cache layers, HTTP contact-bound ingress and revocation',async()=>{
  const ctx=context(),subject='synthetic-cache-'+randomUUID();
  class Receiver {} Module({controllers:[ChannelsController],providers:[{provide:AuthRuntime,useValue:{service:{}}},{provide:ChannelsRuntime,useValue:{ready:async()=>{},intake:ctx.app}}]})(Receiver);
  const api=await NestFactory.create(Receiver,{logger:false});api.setGlobalPrefix('api/v1');await api.listen(0,'127.0.0.1');
  try{
   const origin=await api.getUrl(),base=origin+'/api/v1/integrations',headers={'content-type':'application/json','x-connection-id':ctx.connection,authorization:'Bearer '+ctx.token};
   const call=(path:string,body:unknown,extra={})=>fetch(base+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
   const lookup=()=>call('/contact-identities/lookup',{external_subject_id:subject});
   expect((await (await lookup()).json() as any).data.mapping).toBeNull();
   const command={external_subject_id:subject,operation_id:randomUUID(),display_label:'Synthetic cache Contact'};
   const r=await call('/contact-identities/resolve',command);expect(r.status).toBe(200);const first=(await r.json() as any).data;expect(first.created).toBe(true);
   expect((await (await call('/contact-identities/resolve',command)).json() as any).data).toEqual(first);
   expect((await call('/contact-identities/resolve',{...command,display_label:'Changed'})).status).toBe(409);
   const raced=await Promise.all(Array.from({length:4},()=>call('/contact-identities/resolve',{...command,operation_id:randomUUID()})));
   for(const response of raced){expect(response.status).toBe(200);expect((await response.json() as any).data).toEqual({...first,created:false});}
   const freshSubject='synthetic-race-'+randomUUID();
   const firstRace=await Promise.all(Array.from({length:4},()=>call('/contact-identities/resolve',{external_subject_id:freshSubject,operation_id:randomUUID()})));
   const raceResults=[];for(const response of firstRace){expect(response.status).toBe(200);raceResults.push((await response.json() as any).data);}
   expect(raceResults.filter(r=>r.created)).toHaveLength(1);expect(new Set(raceResults.map(r=>r.mapping.crm_contact_id)).size).toBe(1);
   expect(await ctx.ds.query('SELECT id FROM contact_identity WHERE tenant_id=? AND connection_id=? AND external_subject_id=?',[ctx.tenant,ctx.connection,subject])).toHaveLength(1);
   expect((await call('/contact-identities/lookup',{external_subject_id:subject},{'x-tenant-id':ctx.beta})).status).toBe(403);
   expect((await (await call('/contact-identities/lookup',{external_subject_id:subject},{'x-connection-id':ctx.betaConnection,authorization:'Bearer '+ctx.betaToken})).json() as any).data.mapping).toBeNull();
   const input=()=>({provider_event_id:randomUUID(),provider_message_id:randomUUID(),external_subject_id:subject,occurred_at:'2026-10-06T00:00:00Z',message:{type:'text',text:'Synthetic contact-bound message'}});
   const v2=(intake=input())=>({crm_contact_id:first.mapping.crm_contact_id,crm_identity_id:first.mapping.crm_identity_id,intake});
   expect((await call('/mock-messenger/deliveries-v2',{intake:input()})).status).toBe(422);
   expect((await call('/mock-messenger/deliveries-v2',{...v2(),crm_contact_id:randomUUID()})).status).toBe(409);
   expect((await call('/contact-identities/lookup',{external_subject_id:'x'.repeat(66000)})).status).toBe(413);
   // Roll back after lookup and ensure a failed ingress cannot warm the Chat cache.
   ctx.app.contactCache.clear();
   const run=ctx.app.uow.run.bind(ctx.app.uow);
   ctx.app.uow.run=((context:any,work:any)=>run(context,async scope=>{await work(scope);throw new Error('synthetic rollback');})) as typeof ctx.app.uow.run;
   try{expect((await call('/mock-messenger/deliveries-v2',v2())).status).toBe(503);expect(ctx.app.contactCache.get(ctx.app.contactCache.key(ctx.tenant,ctx.connection,subject))).toBeNull();}finally{ctx.app.uow.run=run;}
   const original=v2();const received=await call('/mock-messenger/deliveries-v2',original);expect(received.status).toBe(202);const ack=(await received.json() as any).data;
   expect(ctx.app.contactCache.get(ctx.app.contactCache.key(ctx.tenant,ctx.connection,subject))).toEqual(first.mapping);
   for(const c of await ctx.app.claim())await ctx.app.dispatch(c);
   const receipt=await ctx.app.readCredential(ctx.connection,'Bearer '+ctx.token,ack.delivery_id);
   expect(receipt.status).toBe('processed');expect((await ctx.ds.query('SELECT contact_id FROM conversation WHERE tenant_id=? AND record_id=?',[ctx.tenant,receipt.conversation_id]))[0].contact_id).toBe(first.mapping.crm_contact_id);
   // Reused provider message ID cannot attach another customer's delivery to this conversation.
   const crossed=await call('/mock-messenger/deliveries-v2',{crm_contact_id:raceResults[0].mapping.crm_contact_id,crm_identity_id:raceResults[0].mapping.crm_identity_id,intake:{...original.intake,provider_event_id:randomUUID(),external_subject_id:freshSubject}});
   expect(crossed.status).toBe(202);const crossedId=(await crossed.json() as any).data.delivery_id;
   for(const c of await ctx.app.claim())await ctx.app.dispatch(c);
   expect((await ctx.app.readCredential(ctx.connection,'Bearer '+ctx.token,crossedId)).status).toBe('failed');
   const counts={lookup:0,resolve:0};let result:Result|undefined;
   const local={active:async()=>true,finish:async(_claim:Claim,value:Result)=>{result=value;return true;}} as unknown as Store;
   const request:typeof fetch=async(...args)=>{const url=String(args[0]);if(url.endsWith('/lookup'))counts.lookup++;if(url.endsWith('/resolve'))counts.resolve++;return fetch(...args);};
   const worker=new Worker(local,origin,{CONNECTOR_REMOTE_TOKEN_TEST:ctx.token},request,true);
   const claim=():Claim=>({id:randomUUID(),tenant_id:ctx.tenant,connection_id:randomUUID(),token:'1',status:'queued',payload:input(),remote_delivery_id:null,errors:0,remote_connection_id:ctx.connection,remote_token_env:'CONNECTOR_REMOTE_TOKEN_TEST'});
   await worker.dispatch(claim());expect(result?.status).toBe('forwarded');expect(counts).toEqual({lookup:1,resolve:0});
   await worker.dispatch(claim());expect(result?.status).toBe('forwarded');expect(counts).toEqual({lookup:1,resolve:0});
   worker.contactCache.clear();await worker.dispatch(claim());expect(counts).toEqual({lookup:2,resolve:0});
   const missing=claim();missing.payload={...input(),external_subject_id:'synthetic-new-'+randomUUID()};await worker.dispatch(missing);expect(result?.status).toBe('forwarded');expect(counts).toEqual({lookup:3,resolve:1});
   // Failure is never an authoritative miss and must not reach create.
   let creates=0;const failing=new Worker(local,origin,{CONNECTOR_REMOTE_TOKEN_TEST:ctx.token},async(...args)=>{if(String(args[0]).endsWith('/lookup'))return new Response('',{status:503});if(String(args[0]).endsWith('/resolve'))creates++;return fetch(...args);},true);
   await failing.dispatch(claim());expect(result?.status).toBe('queued');expect(creates).toBe(0);
   await ctx.ds.query('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?',[ctx.tenant,first.mapping.crm_contact_id]);
   try{expect((await call('/mock-messenger/deliveries-v2',v2())).status).toBe(409);await worker.dispatch(claim());expect(result?.status).toBe('blocked');}finally{await ctx.ds.query('UPDATE crm_record SET archived_at=NULL WHERE tenant_id=? AND id=?',[ctx.tenant,first.mapping.crm_contact_id]);}
   await ctx.ds.query("UPDATE channel_connection SET status='disabled' WHERE id=?",[ctx.connection]);try{await worker.dispatch(claim());expect(result?.status).toBe('blocked');expect((await lookup()).status).toBe(403);}finally{await ctx.ds.query("UPDATE channel_connection SET status='active' WHERE id=?",[ctx.connection]);}
   for(const c of await ctx.app.claim())await ctx.app.dispatch(c);
  }finally{await api.close();}
 },45000);
}
