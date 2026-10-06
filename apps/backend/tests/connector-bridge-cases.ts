import { spawn } from 'node:child_process';
import { grantRuntime } from '../../../services/crm-connector/src/grants.js';
import { it,expect } from 'vitest';
import { randomUUID,randomBytes } from 'node:crypto';
import { createPool,type Pool } from 'mysql2/promise';
import type { DataSource } from 'typeorm';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ChannelsController,ChannelsRuntime } from '../src/modules/channels/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import type { MessengerIntake } from '../src/modules/channels/intake.js';
import { Store } from '../../../services/crm-connector/src/store.js';
import { migrate,ready,checksum } from '../../../services/crm-connector/src/schema.js';
import { Worker } from '../../../services/crm-connector/src/worker.js';
import { createApi } from '../../../services/crm-connector/src/http.js';
export function connectorBridgeCases(isolated:(name:string)=>Promise<DataSource>,context:()=>{ds:DataSource;app:MessengerIntake;tenant:string;connection:string;token:string;beta:string;betaConnection:string;betaToken:string}){
 it('SRC-028 own MySQL migration, HTTP rich roundtrip, durable recovery, isolation and fences',async()=>{
  const ctx=context(),own=await isolated('connector_bridge_test');
  const admin=createPool({host:process.env.MYSQL_HOST,user:process.env.MYSQL_MIGRATION_USER,password:process.env.MYSQL_MIGRATION_PASSWORD,database:'connector_bridge_test',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});
  let runtime:Pool|undefined,local:Awaited<ReturnType<typeof createApi>>|undefined,remote:Awaited<ReturnType<typeof NestFactory.create>>|undefined;
  try{
   expect(await migrate(admin)).toBe(2);expect(await migrate(admin)).toBe(0);await ready(admin);
   await own.query("UPDATE connector_schema_migration SET state='applying' WHERE version=1");await expect(migrate(admin)).rejects.toThrow('CONNECTOR_SCHEMA_MISMATCH');
   await own.query("UPDATE connector_schema_migration SET state='applied',checksum=REPEAT('0',64) WHERE version=1");await expect(migrate(admin)).rejects.toThrow('CONNECTOR_SCHEMA_MISMATCH');
   await own.query('UPDATE connector_schema_migration SET checksum=? WHERE version=1',[checksum]);await ready(admin);
   const password=randomBytes(32).toString('hex');await grantRuntime(admin,'connector_bridge_test','connector_runtime',password);await grantRuntime(admin,'connector_bridge_test','connector_runtime',password);
   runtime=createPool({host:process.env.MYSQL_HOST,user:'connector_runtime',password,database:'connector_bridge_test',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});
   await expect(runtime.query('SELECT * FROM intake_test.message')).rejects.toThrow();await expect(runtime.query('CREATE TABLE forbidden(id INT)')).rejects.toThrow();await ready(runtime);
   const localId=randomUUID(),otherId=randomUUID(),localToken=randomBytes(32).toString('hex'),otherToken=randomBytes(32).toString('hex');
   const provision=new Store(admin),binding={id:localId,tenant_id:ctx.tenant,token:localToken,remote_connection_id:ctx.connection,remote_token_env:'CONNECTOR_REMOTE_TOKEN_TEST'};
   await provision.provision(binding);await provision.provision(binding);await expect(provision.provision({...binding,tenant_id:ctx.beta})).rejects.toThrow('IMMUTABLE_BINDING');
   await provision.provision({id:otherId,tenant_id:ctx.beta,token:otherToken,remote_connection_id:ctx.betaConnection,remote_token_env:'CONNECTOR_REMOTE_TOKEN_BETA'});
   const store=new Store(runtime);
   class Receiver {} Module({controllers:[ChannelsController],providers:[{provide:AuthRuntime,useValue:{service:{}}},{provide:ChannelsRuntime,useValue:{ready:async()=>{},intake:ctx.app}}]})(Receiver);
   remote=await NestFactory.create(Receiver,{logger:false});remote.setGlobalPrefix('api/v1');await remote.listen(0,'127.0.0.1');const origin=await remote.getUrl();
   local=await createApi(store);await local.listen(0,'127.0.0.1');const url=(await local.getUrl())+'/connector/v1';
   const headers={'x-connection-id':localId,authorization:`Bearer ${localToken}`,'content-type':'application/json'};
   const make=()=>({provider_event_id:randomUUID(),provider_message_id:randomUUID(),external_subject_id:'synthetic-bridge',occurred_at:'2026-10-06T00:00:00Z',message:{type:'rich',content:{version:1,message_type:'media',text:'Synthetic extracted preview',text_source:'extracted',reply_to:null,attachment:{version:1,kind:'media',items:[{media_type:'image',external_media_id:'synthetic-image',name:null}]}}}});
   const post=(body:unknown,extra={})=>fetch(url+'/deliveries',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
   const status=async(id:string)=>(await (await fetch(url+'/deliveries/'+id,{headers})).json() as any).data;
   const due=()=>own.query('UPDATE connector_delivery SET next_attempt_at=UTC_TIMESTAMP(6),lease_until=NULL');
   const env={CONNECTOR_REMOTE_TOKEN_TEST:ctx.token,CONNECTOR_REMOTE_TOKEN_BETA:ctx.betaToken};
   const worker=new Worker(store,origin,env,fetch,true);
   expect((await fetch(url+'/health/ready')).status).toBe(200);
   expect((await fetch(origin+'/api/v1/integrations/mock-messenger/binding')).status).toBe(401);
   for(const extra of [{'x-tenant-id':ctx.beta},{cookie:'invalid'},{origin:'https://invalid'}])expect((await post(make(),extra)).status).toBe(403);
   expect((await post(make(),{authorization:'Bearer invalid'})).status).toBe(401);
   expect((await post({...make(),tenant_id:ctx.beta})).status).toBe(422);
   expect((await fetch(url+'/deliveries',{method:'POST',headers,body:'{"broken"'})).status).toBe(400);
   expect((await post({...make(),message:{type:'text',text:'x'.repeat(70000)}})).status).toBe(400);
   const input=make(),response=await post(input);expect(response.status).toBe(202);const ack=(await response.json() as any).data,id=ack.delivery_id;
   expect((await (await post(input)).json() as any).data.delivery_id).toBe(id);expect((await post({...input,external_subject_id:'changed'})).status).toBe(409);
   const concurrent=await Promise.all([post(input),post({...input,occurred_at:'2026-10-06T00:00:00.000Z'}),post(input)]);for(const r of concurrent)expect((await r.json() as any).data.delivery_id).toBe(id);
   await expect(runtime.query("INSERT INTO connector_audit(id,tenant_id,connection_id,delivery_id,action,status) VALUES (?,?,?,?,'forbidden','queued')",[randomUUID(),ctx.beta,otherId,id])).rejects.toThrow();
   expect((await fetch(url+'/deliveries/'+id+'?tenant=spoof',{headers})).status).toBe(400);
   expect((await fetch(url+'/deliveries/'+id,{headers:{'x-connection-id':otherId,authorization:`Bearer ${otherToken}`}})).status).toBe(404);
   const claimed=(await store.claim())!;expect(claimed).toBeDefined();
   // Real receiver commits, then the client loses the ACK before local persistence.
   const lost=new Worker(store,origin,env,async(...args:Parameters<typeof fetch>)=>{const r=await fetch(...args);if(String(args[0]).endsWith('/deliveries-v2')){await r.arrayBuffer();throw new Error('SYNTHETIC_ACK_LOST');}return r;},true);
   await lost.dispatch(claimed);expect((await status(id)).status).toBe('queued');
   expect(await ctx.ds.query('SELECT id FROM inbound_delivery WHERE provider_event_id=?',[input.provider_event_id])).toHaveLength(1);
   await due();const expired=(await store.claim())!;await own.query('UPDATE connector_delivery SET lease_until=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(6)) WHERE id=?',[id]);
   const restarted=new Store(runtime),newClaim=(await restarted.claim())!;expect(BigInt(newClaim.token)).toBeGreaterThan(BigInt(expired.token));expect(await store.finish(expired,{status:'completed',errors:0,delay:0})).toBe(false);
   await new Worker(restarted,origin,env,fetch,true).dispatch(newClaim);expect((await status(id)).status).toBe('forwarded');
   // Successful pending receipts reset the retry budget, even after many polls.
   for(let i=0;i<11;i++){await due();await worker.tick();}expect((await status(id)).status).toBe('forwarded');
   for(const c of await ctx.app.claim())await ctx.app.dispatch(c);
   await due();await worker.tick();const done=await status(id);expect(done.status).toBe('completed');
   const receipt=await ctx.app.readCredential(ctx.connection,`Bearer ${ctx.token}`,done.remote_delivery_id);
   expect(await ctx.ds.query('SELECT id FROM inbound_delivery WHERE provider_event_id=?',[input.provider_event_id])).toHaveLength(1);
   expect(await ctx.ds.query('SELECT id FROM message WHERE id=?',[receipt.message_id])).toHaveLength(1);
   const [content]=await ctx.ds.query('SELECT content FROM message_content WHERE message_id=?',[receipt.message_id]);expect(typeof content.content==='string'?JSON.parse(content.content):content.content).toEqual(input.message.content);
   expect(JSON.stringify(done)).not.toContain('Synthetic extracted');
   // Durable network failure and recovery use the same queue row.
   const outageInput=make(),outage=(await (await post(outageInput)).json() as any).data.delivery_id;
   await new Worker(store,origin,env,async()=>{throw new Error('SYNTHETIC_OFFLINE');},true).tick();expect((await status(outage)).status).toBe('queued');expect((await status(outage)).error_code).toBe('REMOTE_UNAVAILABLE');
   await due();
   const child=spawn(process.execPath,['services/crm-connector/dist/main.js','worker'],{env:{...process.env,CONNECTOR_DB_HOST:process.env.MYSQL_HOST,CONNECTOR_DB_NAME:'connector_bridge_test',CONNECTOR_DB_USER:'connector_runtime',CONNECTOR_DB_PASSWORD:password,CONNECTOR_REMOTE_ORIGIN:origin,CONNECTOR_ALLOW_HTTP:'true',...env},stdio:'ignore'});
   try{await expect.poll(async()=>(await status(outage)).status,{timeout:10000}).toBe('forwarded');}finally{child.kill('SIGTERM');await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('WORKER_SHUTDOWN_TIMEOUT'));},15000);child.once('exit',code=>{clearTimeout(timer);if(code===0)resolve();else reject(new Error('WORKER_EXIT_FAILED'));});});}

   for(const c of await ctx.app.claim())await ctx.app.dispatch(c);await due();await worker.tick();expect((await status(outage)).status).toBe('completed');
   // Valid credential bound to another tenant cannot receive content.
   const mismatchId=randomUUID(),mismatchToken=randomBytes(32).toString('hex');await provision.provision({...binding,id:mismatchId,token:mismatchToken,tenant_id:ctx.beta});
   const mismatchInput=make(),mismatch=await store.accept(mismatchId,`Bearer ${mismatchToken}`,mismatchInput);await worker.tick();expect((await store.read(mismatchId,`Bearer ${mismatchToken}`,mismatch.delivery_id)).status).toBe('blocked');expect(await ctx.ds.query('SELECT id FROM inbound_delivery WHERE provider_event_id=?',[mismatchInput.provider_event_id])).toHaveLength(0);
   const inactiveInput=make(),inactive=await store.accept(localId,`Bearer ${localToken}`,inactiveInput),inactiveClaim=(await store.claim())!;
   await own.query("UPDATE connector_connection SET status='disabled' WHERE id=?",[localId]);expect(await worker.dispatch(inactiveClaim)).toBe(false);expect(await store.finish(inactiveClaim,{status:'completed',errors:0,delay:0})).toBe(false);expect(await store.claim()).toBeUndefined();expect((await post(make())).status).toBe(403);
   await own.query("UPDATE connector_connection SET status='active' WHERE id=?",[localId]);await due();await ctx.ds.query("UPDATE channel_connection SET status='disabled' WHERE id=?",[ctx.connection]);
   try{await worker.tick();expect((await status(inactive.delivery_id)).status).toBe('blocked');expect(await ctx.ds.query('SELECT id FROM inbound_delivery WHERE provider_event_id=?',[inactiveInput.provider_event_id])).toHaveLength(0);}finally{await ctx.ds.query("UPDATE channel_connection SET status='active' WHERE id=?",[ctx.connection]);}
   const terminal=(await (await post(make())).json() as any).data.delivery_id;
   const offline=new Worker(store,origin,env,async()=>{throw new Error('offline');},true);for(let i=0;i<10;i++){await due();await offline.tick();}expect((await status(terminal)).status).toBe('attention');
   const audits=JSON.stringify(await own.query('SELECT * FROM connector_audit'));for(const secret of [localToken,ctx.token,'Synthetic extracted preview'])expect(audits).not.toContain(secret);
  }finally{await local?.close();await remote?.close();await runtime?.end();await admin.end();}
 },45000);
}
