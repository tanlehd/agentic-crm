import { CrmUi } from '../src/modules/crm/ui.js';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { CrmRecords } from '../src/modules/crm/records.js';
import { coreDomains,contactReferences } from '../src/modules/crm/core.js';
import { LeadService,leadDomain,leadArchiveGuard,unavailableSessionLeadCreation } from '../src/modules/sales/leads.js';
import { CrmController,CrmRuntime } from '../src/modules/crm/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { migrations } from '../src/kernel/database/migrations.js';
export function crmCoreCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-012 CRM core and Lead',()=>{
  let ds:DataSource,records:CrmRecords,leads:LeadService;
  const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),principal=randomUUID(),role=randomUUID();
  let contact:string,lead:string,second:string,company:string;
  const grants=['schema','contact','company','activity','lead'].flatMap(resource=>['read','create','update','archive','qualify'].map(action=>({resource,action,scope:'all'})));
  const create=(object:string,fields:unknown,key=randomUUID())=>records.mutate(account,tenant,{object,kind:'records'},{fields},key,undefined,'synthetic');
  const patch=(object:string,id:string,fields:unknown,version:string)=>records.mutate(account,tenant,{object,kind:'records',id},{fields},randomUUID(),version,'synthetic');
  const get=(object:string,id:string)=>records.read(account,tenant,{object,kind:'records',id});
  const complete={service_interest:'Synthetic service',need_summary:'Synthetic need',contact_permission:true,preferred_contact_method:'phone',phone:'+84900000001',consent_evidence:{kind:'manual',note:'Synthetic permission evidence'}};
  it('upgrade from v7 preserves custom records and creates guarded M1 subtypes',async()=>{
    ds=await isolated('crm_core_test');await migrate(ds,migrations.slice(0,7));
    for(const id of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    const t=randomUUID(),r=randomUUID();await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,'extension','Extension','custom',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[t,tenant]);
    await ds.query('INSERT INTO crm_record(id,tenant_id,object_type_id,custom_values,created_at,updated_at) VALUES (?,?,?,JSON_OBJECT(),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))',[r,tenant,t]);await ds.query('INSERT INTO custom_record VALUES (?,?)',[tenant,r]);
    const before=await ds.query('SELECT * FROM crm_record');expect(await migrate(ds)).toBe(migrations.length-7);expect(await ds.query('SELECT * FROM crm_record')).toEqual(before);expect(await migrate(ds)).toBe(0);
    await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://core.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    for(const [t,p] of [[tenant,principal],[beta,randomUUID()]]){
      const m=randomUUID(),rid=t===tenant?role:randomUUID();await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,t,account]);
      await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,t,m]);
      await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'core_test','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[rid,t,JSON.stringify(grants)]);await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[t,p,rid]);
      for(const key of ['contact','company','activity','lead','deal'])await ds.query("INSERT INTO object_type(id,tenant_id,`key`,label,kind,created_at,updated_at) VALUES (?,?,?,?,'standard',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[randomUUID(),t,key,key]);
    }
    const domains=coreDomains();domains.set('lead',leadDomain(contactReferences));records=new CrmRecords(ds,'core-secret',domains,undefined,[leadArchiveGuard]);leads=new LeadService(records,contactReferences);
  });
  it('Contact normalization, no implicit merge/customer, Company and Activity references',async()=>{
    const response=await create('contact',{display_name:'Synthetic A',normalized_phone:'+84 (900) 000-001',normalized_email:' TEST@EXAMPLE.INVALID '});contact=String(response.body.data.id);
    expect(response.body.data.fields).toMatchObject({normalized_phone:'+84900000001',normalized_email:'test@example.invalid',lifecycle:'prospect'});
    expect((await create('contact',{display_name:'Synthetic same phone',normalized_phone:'+84900000001'})).body.data.id).not.toBe(contact);
    await expect(create('contact',{display_name:'A',normalized_phone:'0900000001'})).rejects.toThrow('VALIDATION_FAILED');
    await expect(patch('contact',contact,{lifecycle:'customer'},'1')).rejects.toThrow('INVALID_REQUEST');
    company=String((await create('company',{name:'Synthetic Company',domain:'EXAMPLE.INVALID'})).body.data.id);
    const activity=await create('activity',{kind:'note',subject:'Synthetic note',body:'Synthetic body',related_record_id:contact,due_at:'2026-10-05T01:00:00Z'});expect(activity.body.data.fields).toMatchObject({kind:'note',status:'open'});
    await expect(patch('activity',String(activity.body.data.id),{status:'done'},'1')).rejects.toThrow('INVALID_REQUEST');
    await expect(create('activity',{kind:'note',subject:'Bad ref',related_record_id:randomUUID()})).rejects.toThrow('NOT_FOUND');
    expect((await records.read(account,tenant,{object:'contact',kind:'records'},{filter:JSON.stringify([{field:'normalized_phone',op:'eq',value:'+84900000001'}]),sort:JSON.stringify({field:'display_name',direction:'asc'})})).data).toHaveLength(2);
  });
  it('creates multiple Leads per Contact; receipt, draft and reserved session boundary',async()=>{
    const key=randomUUID(),body={contact_id:contact};const one=await leads.create(account,tenant,body,key,'synthetic');expect(await leads.create(account,tenant,body,key,'synthetic')).toEqual(one);lead=String(one.body.data.id);
    second=String((await leads.create(account,tenant,{contact_id:contact,qualification:{service_interest:'Different synthetic need'}},randomUUID(),'synthetic')).body.data.id);
    expect(second).not.toBe(lead);expect((await get('lead',second)).data.fields).toMatchObject({status:'qualifying'});
    await expect(create('lead',{contact_id:contact})).rejects.toThrow('OBJECT_NOT_IMPLEMENTED');await expect(create('deal',{})).rejects.toThrow('OBJECT_NOT_IMPLEMENTED');
    await expect(leads.create(account,tenant,{contact_id:contact,qualification_session_id:randomUUID()},randomUUID(),'synthetic')).rejects.toThrow('FORBIDDEN');
    await expect(leads.create(account,tenant,{contact_id:contact,conversation_id:randomUUID()},randomUUID(),'synthetic')).rejects.toThrow('M2_REFERENCE_NOT_AVAILABLE');
    await expect(ds.query('UPDATE `lead` SET qualification_session_id=? WHERE record_id=?',[randomUUID(),lead])).rejects.toThrow();
    await expect(records.uow.run({tenantId:tenant},s=>unavailableSessionLeadCreation.createFromSession(s,{sessionId:randomUUID(),ownerRevision:'1',contactId:contact,qualification:{}}))).rejects.toThrow('M2_REFERENCE_NOT_AVAILABLE');
    await patch('lead',lead,{qualification:{need_summary:'Draft need'}},'1');expect((await get('lead',lead)).data).toMatchObject({version:'2',fields:{status:'qualifying',qualification:{need_summary:'Draft need'}}});
  });
  it('rejects missing/spoofed consent atomically and stamps valid manual evidence',async()=>{
    const invalid=[{...complete,contact_permission:false},{...complete,consent_evidence:undefined},{...complete,phone:null},{...complete,consent_evidence:{...complete.consent_evidence,recorded_by_principal_id:randomUUID()}}];
    for(const q of invalid)await expect(leads.command(account,tenant,lead,'qualification',{qualification:q},randomUUID(),'2','synthetic')).rejects.toThrow();
    expect((await get('lead',lead)).data).toMatchObject({version:'2',fields:{status:'qualifying'}});
    expect(await ds.query("SELECT id FROM outbox_event WHERE aggregate_id=? AND event_type='lead.qualified'",[lead])).toHaveLength(0);
    const key=randomUUID(),body={qualification:complete};const qualified=await leads.command(account,tenant,lead,'qualification',body,key,'2','synthetic');expect(await leads.command(account,tenant,lead,'qualification',body,key,'2','synthetic')).toEqual(qualified);
    expect(qualified.body.data.fields).toMatchObject({status:'qualified',qualification:{consent_evidence:{kind:'manual',recorded_by_principal_id:principal}}});
    await expect(patch('lead',lead,{qualification:{need_summary:'Cannot edit'}},'3')).rejects.toThrow('INVALID_TRANSITION');
    const events=await ds.query('SELECT event_type,payload FROM outbox_event WHERE aggregate_id=?',[lead]);expect(events).toHaveLength(2);expect(JSON.stringify(events)).not.toContain('84900000001');expect(JSON.stringify(events)).not.toContain('Synthetic permission');
  });
  it('qualification CAS race one winner, disqualify terminal, archive active Contact blocked',async()=>{
    const race=await Promise.allSettled([1,2].map(()=>leads.command(account,tenant,second,'qualification',{qualification:{...complete,preferred_contact_method:'messenger',phone:null}},randomUUID(),'1','synthetic')));expect(race.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    await expect(records.mutate(account,tenant,{object:'contact',kind:'archive',id:contact},{reason:'Synthetic'},randomUUID(),'1','synthetic')).rejects.toThrow('ACTIVE_DEPENDENCY');
    const other=String((await leads.create(account,tenant,{contact_id:contact},randomUUID(),'synthetic')).body.data.id);
    await leads.command(account,tenant,other,'disqualify',{reason:'Synthetic'},randomUUID(),'1','synthetic');
    await expect(leads.command(account,tenant,other,'qualification',{qualification:complete},randomUUID(),'2','synthetic')).rejects.toThrow('INVALID_TRANSITION');
    expect((await leads.read(account,tenant,undefined,{status:'qualified'})).data).toHaveLength(2);
    await records.mutate(account,tenant,{object:'company',kind:'archive',id:company},{reason:'Synthetic'},randomUUID(),'1','synthetic');
    expect((await get('company',company)).data.archived).toBe(true);
  });
  it('two tenant reference isolation and field policy for standard query and Lead draft',async()=>{
    await expect(records.read(account,beta,{object:'contact',kind:'records',id:contact})).rejects.toThrow('NOT_FOUND');
    await expect(leads.create(account,beta,{contact_id:contact},randomUUID(),'synthetic')).rejects.toThrow('NOT_FOUND');
    await expect(ds.query('INSERT INTO `lead`(tenant_id,record_id,contact_id) VALUES (?,?,?)',[beta,randomUUID(),contact])).rejects.toThrow();
    const [t]=await ds.query("SELECT id FROM object_type WHERE tenant_id=? AND `key`='contact'",[tenant]);const policy=randomUUID();
    await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'normalized_phone',JSON_ARRAY('read','write'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,t.id]);
    expect((await get('contact',contact)).data.fields).not.toHaveProperty('normalized_phone');expect((await new CrmUi(records).descriptor(account,tenant,'contact')).standard.some(f=>f.key==='normalized_phone')).toBe(false);await expect(records.read(account,tenant,{object:'contact',kind:'records'},{filter:JSON.stringify([{field:'normalized_phone',op:'eq',value:'+84900000001'}])})).rejects.toThrow('FIELD_FORBIDDEN');await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);
    const draft=String((await leads.create(account,tenant,{contact_id:contact},randomUUID(),'synthetic')).body.data.id);
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.resource!=='lead'||g.action!=='qualify')),role]);await expect(patch('lead',draft,{qualification:{need_summary:'Forbidden'}},'1')).rejects.toThrow('FORBIDDEN');
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.resource!=='lead'||g.action!=='update')),role]);await patch('lead',draft,{qualification:{need_summary:'Qualify grant works'}},'1');await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
  });
  it('HTTP Lead status/ETag, qualification validation and archive bypass rejected',async()=>{
    class TestModule{}Module({controllers:[CrmController],providers:[{provide:CrmRuntime,useValue:{ready:async()=>{},records,leads,ui:new CrmUi(records)}},{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:account}),requireMutation:async()=>({account_id:account})}}}]})(TestModule);
    const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');
    try{const base=await server.getUrl(),headers={'X-Tenant-Id':tenant,'Content-Type':'application/json','Idempotency-Key':randomUUID()};const result=await fetch(`${base}/api/v1/leads`,{method:'POST',headers,body:JSON.stringify({contact_id:contact})});expect(result.status).toBe(201);const created=await result.json() as any;
      const invalid=await fetch(`${base}/api/v1/leads/${created.data.id}/qualification`,{method:'POST',headers:{...headers,'If-Match':'"1"'},body:JSON.stringify({qualification:{}})});expect(invalid.status).toBe(422);
      const archive=await fetch(`${base}/api/v1/objects/lead/records/${created.data.id}/archive`,{method:'POST',headers:{...headers,'If-Match':'"1"'},body:JSON.stringify({reason:'Synthetic'})});expect(archive.status).toBe(422);
      const context=await fetch(`${base}/api/v1/crm/context`,{headers});expect(context.status).toBe(200);expect((await context.json() as any).data.principal_id).toBe(principal);
      const descriptor=await fetch(`${base}/api/v1/objects/contact/descriptor`,{headers});expect(descriptor.status).toBe(200);
      const get=await fetch(`${base}/api/v1/leads/${created.data.id}`,{headers});expect(get.headers.get('etag')).toBe('"1"');
    }finally{await server.close();}
  });
});}
