import { it,expect } from 'vitest';
import { randomUUID,randomBytes,createHmac } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createPool,type Pool } from 'mysql2/promise';
import type { DataSource } from 'typeorm';
import { createApi } from '../../../services/crm-connector/src/http.js';
import { Store } from '../../../services/crm-connector/src/store.js';
import { MessengerStore } from '../../../services/crm-connector/src/messenger-store.js';
import { migrate,ready,statements,checksum,migrations } from '../../../services/crm-connector/src/schema.js';
import { grantRuntime } from '../../../services/crm-connector/src/grants.js';
export function messengerIngressCases(isolated:(name:string)=>Promise<DataSource>){
 it('SRC-029 signed HTTP batch capture, schema1 upgrade, private grants, replay/restart/revocation',async()=>{
  const ds=await isolated('messenger_ingress_test');
  const admin=createPool({host:process.env.MYSQL_HOST,user:process.env.MYSQL_MIGRATION_USER,password:process.env.MYSQL_MIGRATION_PASSWORD,database:'messenger_ingress_test',timezone:'Z'});
  let runtime:Pool|undefined,api:Awaited<ReturnType<typeof createApi>>|undefined;
  try{
   // Build immutable schema1 with an existing bridge delivery, then upgrade in place.
   await ds.query("CREATE TABLE connector_schema_migration(version INT PRIMARY KEY,name VARCHAR(128),checksum CHAR(64),state ENUM('applying','applied'))");
   for(const sql of statements)await ds.query(sql);await ds.query("INSERT INTO connector_schema_migration VALUES(1,'durable_ingress',?,'applied')",[checksum]);
   const tenant=randomUUID(),oldId=randomUUID(),oldToken=randomBytes(32).toString('hex');
   await new Store(admin).provision({id:oldId,tenant_id:tenant,token:oldToken,remote_connection_id:randomUUID(),remote_token_env:'CONNECTOR_REMOTE_TOKEN_TEST'});
   const original=await new Store(admin).accept(oldId,'Bearer '+oldToken,{provider_event_id:'old',provider_message_id:'old',external_subject_id:'old',occurred_at:'2026-10-06T00:00:00Z',message:{type:'text',text:'Synthetic old history'}});
   await expect(ready(admin)).rejects.toThrow('CONNECTOR_SCHEMA_MISMATCH');expect(await migrate(admin)).toBe(1);expect(await migrate(admin)).toBe(0);await ready(admin);
   expect((await new Store(admin).read(oldId,'Bearer '+oldToken,original.delivery_id)).status).toBe('queued');
   await ds.query("UPDATE connector_schema_migration SET checksum=REPEAT('0',64) WHERE version=2");await expect(migrate(admin)).rejects.toThrow('CONNECTOR_SCHEMA_MISMATCH');await ds.query('UPDATE connector_schema_migration SET checksum=? WHERE version=2',[migrations[1]!.checksum]);
   const password=randomBytes(32).toString('hex');await grantRuntime(admin,'messenger_ingress_test','messenger_runtime',password);
   runtime=createPool({host:process.env.MYSQL_HOST,user:'messenger_runtime',password,database:'messenger_ingress_test',timezone:'Z'});
   await expect(runtime.query('SELECT * FROM intake_test.message')).rejects.toThrow();await expect(runtime.query("UPDATE connector_meta_page SET status='disabled'")).rejects.toThrow();await expect(runtime.query('CREATE TABLE forbidden(id INT)')).rejects.toThrow();
   const provision=new MessengerStore(admin),binding={id:randomUUID(),tenant_id:tenant,app_id:'100',page_id:'300'},other={id:randomUUID(),tenant_id:randomUUID(),app_id:'100',page_id:'400'};
   await provision.provision(binding);await provision.provision(binding);await provision.provision(other);await expect(provision.provision({...binding,tenant_id:other.tenant_id})).rejects.toThrow('IMMUTABLE_BINDING');
   const env={CONNECTOR_META_APPS:JSON.stringify([{id:'100',secret_env:'CONNECTOR_META_SECRET',verify_env:'CONNECTOR_META_VERIFY'}]),CONNECTOR_META_SECRET:randomBytes(32).toString('hex'),CONNECTOR_META_VERIFY:randomBytes(32).toString('hex')};
   const start=async()=>{api=await createApi(new Store(runtime!),env);await api.listen(0,'127.0.0.1');return (await api.getUrl())+'/connector/v1/messenger/100/webhook';};
   let url=await start();
   const event=(mid:string,page='300',extra={})=>({sender:{id:'200'},recipient:{id:page},timestamp:1791244800000,message:{mid,text:'Synthetic tiếng Việt 👋',...extra}});
   const body=(entries:unknown[])=>JSON.stringify({object:'page',entry:entries});
   const entry=(events:unknown[],page='300',stream='messaging')=>({id:page,time:1791244800000,[stream]:events});
   const signature=(raw:string|Buffer)=>'sha256='+createHmac('sha256',env.CONNECTOR_META_SECRET).update(raw).digest('hex');
   const post=(raw:string,headers:Record<string,string>={})=>fetch(url,{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature(raw),...headers},body:raw});
   const count=async()=>Number((await ds.query('SELECT COUNT(*) n FROM connector_meta_event'))[0].n);
   const challenge=new URLSearchParams({'hub.mode':'subscribe','hub.verify_token':env.CONNECTOR_META_VERIFY,'hub.challenge':'001234'});
   expect(await (await fetch(url+'?'+challenge)).text()).toBe('001234');expect((await fetch(url.replace('/100/','/101/')+'?'+challenge)).status).toBe(403);
   const raw=' '+body([entry([event('one')])])+'\n';
   expect((await post(raw,{'x-hub-signature-256':'sha256='+'0'.repeat(64)})).status).toBe(403);expect(await count()).toBe(0);
   expect((await post(raw,{'x-tenant-id':tenant})).status).toBe(403);
   expect((await post(raw,{'x-hub-signature-256':signature(raw.trim())})).status).toBe(403);
   expect((await post('{')).status).toBe(400);expect((await post(' '.repeat(65537))).status).toBe(400);
   const compressed=gzipSync(raw);expect((await fetch(url,{method:'POST',headers:{'content-type':'application/json','content-encoding':'gzip','x-hub-signature-256':signature(compressed)},body:compressed})).status).toBe(400);
   expect((await post(body([entry([event('rollback')]),entry([event('unknown','999')],'999')]))).status).toBe(403);expect(await count()).toBe(0);
   const replies=await Promise.all(Array.from({length:5},()=>post(raw)));expect(replies.map(r=>r.status)).toEqual([200,200,200,200,200]);expect(await count()).toBe(1);
   expect((await post(body([entry([event('atomic-new'),event('one','300',{text:'Different'})])]))).status).toBe(409);expect(await count()).toBe(1);
   const batch=[entry([event('two')]),entry([event('other','400')],'400')];expect((await post(body(batch))).status).toBe(200);expect((await post(body([...batch].reverse()))).status).toBe(200);expect(await count()).toBe(3);
   expect((await ds.query('SELECT tenant_id FROM connector_meta_event WHERE binding_id=?',[other.id]))[0].tenant_id).toBe(other.tenant_id);
   const echo={...event('echo','300',{is_echo:true}),sender:{id:'300'},recipient:{id:'200'}};
   expect((await post(body([entry([echo]),entry([event('standby')],'300','standby'),entry([{sender:{id:'200'},recipient:{id:'300'},timestamp:1,read:{watermark:1}}])]))).status).toBe(200);
   expect(Number((await ds.query("SELECT COUNT(*) n FROM connector_meta_event WHERE status='attention'"))[0].n)).toBe(3);
   expect(Number((await ds.query('SELECT COUNT(*) n FROM connector_delivery'))[0].n)).toBe(1); // Never forwards real events into mock bridge.
   await ds.query("UPDATE connector_meta_page SET status='disabled' WHERE id=?",[binding.id]);expect((await post(body([entry([event('revoked')])]))).status).toBe(403);await ds.query("UPDATE connector_meta_page SET status='active' WHERE id=?",[binding.id]);
   const oldSignature=signature(raw);env.CONNECTOR_META_SECRET=randomBytes(32).toString('hex');expect((await post(raw,{'x-hub-signature-256':oldSignature})).status).toBe(403);
   await api!.close();url=await start();expect((await post(raw)).status).toBe(200);expect(await count()).toBe(6);
   const [saved]=await ds.query('SELECT id FROM connector_meta_event WHERE binding_id=? LIMIT 1',[binding.id]);await expect(runtime.query("INSERT INTO connector_meta_audit(id,tenant_id,binding_id,event_id,action) VALUES (?,?,?,?,'spoof')",[randomUUID(),other.tenant_id,other.id,saved.id])).rejects.toThrow();
   const audits=JSON.stringify(await ds.query('SELECT * FROM connector_meta_audit'));for(const secret of [env.CONNECTOR_META_SECRET,env.CONNECTOR_META_VERIFY,'Synthetic tiếng'])expect(audits).not.toContain(secret);
   expect(Number((await ds.query('SELECT COUNT(*) n FROM connector_meta_audit'))[0].n)).toBe(6);
  }finally{await api?.close();await runtime?.end();await admin.end();}
 },45000);
}
