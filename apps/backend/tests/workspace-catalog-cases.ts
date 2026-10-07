import { it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { WorkspaceCatalogs } from '../src/modules/conversation/workspace-catalogs.js';
import { ChatWorkspace } from '../src/modules/conversation/workspace.js';
import { WorkspaceCatalogController } from '../src/modules/conversation/workspace-catalog-http.js';
import { WorkspaceRuntime } from '../src/modules/conversation/workspace-http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
type Fixture={ds:DataSource;tenant:string;beta:string;account:string;otherAccount:string;principal:string;other:string;role:string;team:string;id:string;grants:unknown[]};
export function workspaceCatalogCases(fixture:()=>Fixture){
 let catalog:WorkspaceCatalogs,ws:ChatWorkspace,inbox:string,tag:string,snippet:string;
 const predicate={scope:'all',status:['closed','open','pending'],snooze:'exclude',unread:'any'},sort='latest_message_desc',extra=[{resource:'chat_inbox',action:'manage',scope:'own'},{resource:'chat_inbox',action:'share',scope:'own'},{resource:'conversation_tag',action:'manage',scope:'all'},{resource:'chat_snippet',action:'read',scope:'all'},{resource:'chat_snippet',action:'manage',scope:'all'}];
 const mutate=(kind:'inboxes'|'tags'|'snippets',op:'create'|'update'|'shares'|'archive',id:string|undefined,body:unknown,version?:string,who?:string,key=randomUUID())=>{const f=fixture();return catalog.mutate(who??f.account,f.tenant,kind,op,id,body,key,version,'catalog-fixture');};
 it('SRC-033 strict catalog create, durable replay, Unicode uniqueness and snippets preserve private content',async()=>{
  const f=fixture();catalog=new WorkspaceCatalogs(f.ds,'catalog');ws=new ChatWorkspace(f.ds,'catalog');await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...f.grants,...extra]),f.tenant,f.role]);
  expect((await catalog.list(f.account,f.tenant,'tags',{})).meta.allowed_actions).toEqual(['create']);
  const key=randomUUID(),body={name:'Synthetic inbox',predicate_schema_version:1,predicate,sort,shares:[{kind:'principal',id:f.other}]};const created=await mutate('inboxes','create',undefined,body,undefined,undefined,key);inbox=String(created.body.data.id);expect(await mutate('inboxes','create',undefined,body,undefined,undefined,key)).toEqual(created);
  const snoozed=await mutate('inboxes','create',undefined,{...body,predicate:{snooze:'only'},shares:[]});expect(snoozed.status).toBe(201);await mutate('inboxes','archive',String(snoozed.body.data.id),{},'1');
  tag=String((await mutate('tags','create',undefined,{name:'ĐẶT LỊCH',color:'blue'})).body.data.id);await expect(mutate('tags','create',undefined,{name:'đặt lịch'.normalize('NFD'),color:'red'})).rejects.toThrow('NAME_CONFLICT');
  snippet=String((await mutate('snippets','create',undefined,{title:'Synthetic greeting',shortcut:'hello',text:'Synthetic reply\n  '})).body.data.id);expect((await catalog.get(f.account,f.tenant,'snippets',snippet)).data).toMatchObject({text:'Synthetic reply\n  '});
  await expect(mutate('snippets','create',undefined,{title:'Synthetic',shortcut:'hello',text:'Other'})).rejects.toThrow('SHORTCUT_CONFLICT');await expect(mutate('snippets','update',snippet,{text:'x'.repeat(4001)},'1')).rejects.toThrow();
  expect(JSON.stringify(await f.ds.query('SELECT payload FROM outbox_event WHERE event_type LIKE ?', ['chat.%.changed']))).not.toContain('Synthetic reply');
 });
 it('SRC-033 shared inbox is read-only, mine evaluates viewer, no Conversation grant gives zero, revoke is immediate',async()=>{
  const f=fixture();const shared=(await catalog.get(f.otherAccount,f.tenant,'inboxes',inbox)).data;expect(shared).toMatchObject({shared:true,allowed_actions:[]});expect(shared).not.toHaveProperty('shares');
  await expect(mutate('inboxes','update',inbox,{name:'Forbidden'},'1',f.otherAccount)).rejects.toThrow('FORBIDDEN');
  expect((await ws.list(f.otherAccount,f.tenant,{inbox_id:inbox})).meta.conversation_count).toBe('1');
  await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify(extra),f.tenant,f.role]);expect((await ws.list(f.otherAccount,f.tenant,{inbox_id:inbox})).meta.conversation_count).toBe('0');await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...f.grants,...extra]),f.tenant,f.role]);
  await mutate('inboxes','update',inbox,{predicate_schema_version:1,predicate:{...predicate,scope:'mine'}},'1');expect((await ws.list(f.account,f.tenant,{inbox_id:inbox})).meta.conversation_count).toBe('1');expect((await ws.list(f.otherAccount,f.tenant,{inbox_id:inbox})).meta.conversation_count).toBe('0');
  await mutate('inboxes','shares',inbox,{shares:[]},'2');await expect(catalog.get(f.otherAccount,f.tenant,'inboxes',inbox)).rejects.toThrow('NOT_FOUND');await expect(ws.list(f.account,f.tenant,{inbox_id:inbox,status:'closed'})).rejects.toThrow('INVALID_REQUEST');
  await expect(mutate('inboxes','shares',inbox,{shares:[{kind:'principal',id:randomUUID()}]},'3')).rejects.toThrow('INVALID_SHARE_TARGET');await expect(catalog.get(f.account,f.beta,'inboxes',inbox)).rejects.toThrow();
 });
 it('SRC-033 team shares track current membership, duplicate creates independent inbox, stale update and transfer authorization',async()=>{
  const f=fixture();await mutate('inboxes','shares',inbox,{shares:[{kind:'team',id:f.team}]},'3');expect((await catalog.get(f.otherAccount,f.tenant,'inboxes',inbox)).data.id).toBe(inbox);
  await f.ds.query('UPDATE team_member SET active=0 WHERE tenant_id=? AND principal_id=?',[f.tenant,f.other]);await expect(catalog.get(f.otherAccount,f.tenant,'inboxes',inbox)).rejects.toThrow('NOT_FOUND');await f.ds.query('UPDATE team_member SET active=1 WHERE tenant_id=? AND principal_id=?',[f.tenant,f.other]);
  const duplicate=await mutate('inboxes','create',undefined,{name:'Synthetic duplicate',predicate_schema_version:1,predicate,sort,shares:[]},undefined,f.otherAccount);expect(duplicate.body.data.id).not.toBe(inbox);
  await expect(mutate('inboxes','update',inbox,{name:'Malformed'},'4"')).rejects.toThrow('INVALID_REQUEST');
  await expect(mutate('inboxes','update',inbox,{name:'Stale'},'1')).rejects.toThrow('VERSION_CONFLICT');await expect(mutate('inboxes','update',inbox,{name:'Missing'})).rejects.toThrow('PRECONDITION_REQUIRED');await expect(mutate('inboxes','update',inbox,{creator_principal_id:f.other},'4')).rejects.toThrow('FORBIDDEN');
  await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...f.grants,...extra,{resource:'chat_inbox',action:'manage',scope:'all'}]),f.tenant,f.role]);await mutate('inboxes','update',inbox,{creator_principal_id:f.other},'4');expect((await catalog.get(f.otherAccount,f.tenant,'inboxes',inbox)).data).toMatchObject({creator_principal_id:f.other,shared:false});
  await f.ds.query('UPDATE `role` SET permissions=? WHERE tenant_id=? AND id=?',[JSON.stringify([...f.grants,...extra]),f.tenant,f.role]);await expect(mutate('inboxes','update',inbox,{name:'Former owner'},'5')).rejects.toThrow('FORBIDDEN');
 });
 it('SRC-033 tags serialize concurrent attach/no-op/detach, filter distinct, preserve closed and owner revision, archived chips survive',async()=>{
  const f=fixture(),[before]=await f.ds.query('SELECT owner_revision,version FROM crm_record WHERE tenant_id=? AND id=?',[f.tenant,f.id]);
  await Promise.all([catalog.tagLink(f.account,f.tenant,f.id,tag,true,randomUUID(),'catalog'),catalog.tagLink(f.account,f.tenant,f.id,tag,true,randomUUID(),'catalog')]);const [after]=await f.ds.query('SELECT owner_revision,version FROM crm_record WHERE tenant_id=? AND id=?',[f.tenant,f.id]);expect(after.owner_revision).toBe(before.owner_revision);expect(BigInt(after.version)).toBe(BigInt(before.version)+1n);
  expect((await ws.list(f.account,f.tenant,{status:'closed',tag_ids:tag})).meta.conversation_count).toBe('1');await mutate('tags','update',tag,{name:'Synthetic renamed'},'1');await mutate('tags','archive',tag,{},'2');expect((await ws.list(f.account,f.tenant,{status:'closed',tag_ids:tag})).data[0]!.tags).toEqual([{id:tag,name:'Synthetic renamed',color:'blue',archived:true}]);
  await catalog.tagLink(f.account,f.tenant,f.id,tag,false,randomUUID(),'catalog');await expect(catalog.tagLink(f.account,f.tenant,f.id,tag,true,randomUUID(),'catalog')).rejects.toThrow('ARCHIVED');expect((await f.ds.query('SELECT status FROM conversation WHERE record_id=?',[f.id]))[0].status).toBe('closed');
 });
 it('SRC-033 max20 links, tag field deny/replay checks and max50 inbox quota are transactional',async()=>{
  const f=fixture(),tags:string[]=[];for(let n=0;n<21;n++)tags.push(String((await mutate('tags','create',undefined,{name:'Synthetic quota '+n,color:'gray'})).body.data.id));
  for(const id of tags.slice(0,20))await catalog.tagLink(f.account,f.tenant,f.id,id,true,randomUUID(),'catalog');await expect(catalog.tagLink(f.account,f.tenant,f.id,tags[20]!,true,randomUUID(),'catalog')).rejects.toThrow('TAG_QUOTA');
  const policy=randomUUID(),[type]=await f.ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='conversation'",[f.tenant]);await f.ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'tags',JSON_ARRAY('read'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,f.tenant,f.role,type.id]);
  await expect(ws.list(f.account,f.tenant,{status:'closed',tag_ids:tags[0]})).rejects.toThrow('FIELD_FORBIDDEN');expect((await ws.list(f.account,f.tenant,{status:'closed'})).data[0]).not.toHaveProperty('tags');await expect(catalog.tagLink(f.account,f.tenant,f.id,tags[0]!,false,randomUUID(),'catalog')).rejects.toThrow('FIELD_FORBIDDEN');await f.ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
  // Fill the quota with persisted definitions; the boundary commands still execute the real service.
  for(let n=0;n<49;n++)await f.ds.query('INSERT INTO chat_inbox(tenant_id,id,creator_principal_id,name,predicate,sort,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[f.tenant,randomUUID(),f.principal,'Synthetic quota',JSON.stringify(predicate),sort]);
  await mutate('inboxes','create',undefined,{name:'Synthetic fiftieth',predicate_schema_version:1,predicate,sort,shares:[]});await expect(mutate('inboxes','create',undefined,{name:'Synthetic over quota',predicate_schema_version:1,predicate,sort,shares:[]})).rejects.toThrow('INBOX_QUOTA');
 },30000);
 it('SRC-033 catalog cursor binding, archive uniqueness and HTTP strict projection schemas',async()=>{
  const f=fixture();const page=await catalog.list(f.account,f.tenant,'tags',{limit:1});expect(page.next_cursor).not.toBeNull();await expect(catalog.list(f.otherAccount,f.tenant,'tags',{limit:1,cursor:page.next_cursor!})).rejects.toThrow('QUERY_CHANGED');expect((await catalog.list(f.account,f.tenant,'tags',{limit:1,cursor:page.next_cursor!})).data[0]!.id).not.toBe(page.data[0]!.id);
  await mutate('snippets','archive',snippet,{},'1');expect((await catalog.list(f.account,f.tenant,'snippets',{q:'hello'})).data).toEqual([]);await expect(mutate('snippets','create',undefined,{title:'Synthetic',shortcut:'hello',text:'Synthetic'})).rejects.toThrow('SHORTCUT_CONFLICT');
  class TestModule{}Module({controllers:[WorkspaceCatalogController],providers:[{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:f.account}),requireMutation:async()=>({account_id:f.account})}}},{provide:'WorkspaceRuntime',useValue:{catalogs:catalog,ready:async()=>{}}}]})(TestModule);
  const app=await NestFactory.create(TestModule,{logger:false});app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');const schema=JSON.parse(await readFile('packages/contracts/schemas/chat-catalogs.json','utf8')),ajv=addFormats(new Ajv({strict:true}));ajv.addSchema(schema);
  try{for(const [path,name] of [['inboxes','inbox'],['tags','tag'],['snippets','snippet']]){const res=await fetch((await app.getUrl())+'/api/v1/chat-workspace/'+path,{headers:{'X-Tenant-Id':f.tenant}});expect(res.status).toBe(200);const validate=ajv.getSchema(schema.$id+'#/definitions/catalog-'+name+'-list')!;expect(validate(await res.json()),JSON.stringify(validate.errors)).toBe(true);}}finally{await app.close();}
 });
}
