import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { migrate } from '../src/kernel/database/migration-runner.js';
import { migrations } from '../src/kernel/database/migrations.js';
import { CrmRecords,type RecordRoute } from '../src/modules/crm/records.js';
import { CrmPlatform } from '../src/modules/crm/platform.js';
import { CrmController,CrmRuntime } from '../src/modules/crm/http.js';
import { AuthRuntime } from '../src/modules/identity/auth/http.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
export function propertiesCases(isolated:(name:string)=>Promise<DataSource>){describe('SRC-011 properties/custom records',()=>{
  let ds:DataSource,app:CrmRecords,platform:CrmPlatform;
  const tenant=randomUUID(),beta=randomUUID(),account=randomUUID(),principal=randomUUID(),role=randomUUID();
  let typeId:string,recordId:string;
  const grants=['schema','association','appointment','service_offering'].flatMap(resource=>['read','create','update','archive'].map(action=>({resource,action,scope:'all'})));
  const call=(kind:RecordRoute['kind'],body:unknown,id?:string,version?:string,key=randomUUID(),object='appointment')=>app.mutate(account,tenant,{object,kind,...(id?{id}:{})},body,key,version,randomUUID());
  const read=(id?:string,query:Record<string,unknown>={})=>app.read(account,tenant,{object:'appointment',kind:'records',...(id?{id}:{})},query);
  const property=async(key:string,type:string,extra:Record<string,unknown>={})=>{
    const [o]=await ds.query('SELECT version FROM object_type WHERE tenant_id=? AND id=?',[tenant,typeId]);
    return call('properties',{key,label:key,type,required:false,indexed:type!=='text',sensitive:false,...extra},undefined,String(o.version));
  };
  it('v6 upgrade preserves records and journal; v7 typed constraints and custom metadata',async()=>{
    ds=await isolated('properties_test');await migrate(ds,migrations.slice(0,6));
    for(const id of [tenant,beta])await ds.query("INSERT INTO tenant(id,name,status,created_at,updated_at) VALUES (?,'Synthetic','active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[id]);
    const before=await ds.query('SELECT * FROM tenant ORDER BY id'),journal=await ds.query('SELECT version,checksum FROM schema_migration ORDER BY version');
    expect(await migrate(ds)).toBe(migrations.length-6);expect(await migrate(ds)).toBe(0);expect(await ds.query('SELECT * FROM tenant ORDER BY id')).toEqual(before);expect((await ds.query('SELECT version,checksum FROM schema_migration ORDER BY version')).slice(0,6)).toEqual(journal);
    await ds.query("INSERT INTO account(id,issuer,subject,display_name,created_at,updated_at) VALUES (?,'https://properties.invalid',?,'Synthetic',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[account,account]);
    for(const [t,p] of [[tenant,principal],[beta,randomUUID()]]){
      const m=randomUUID();await ds.query("INSERT INTO membership(id,tenant_id,account_id,status,seat_code,created_at,updated_at) VALUES (?,?,?,'active','admin',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[m,t,account]);
      await ds.query("INSERT INTO principal(id,tenant_id,kind,membership_id,status,created_at,updated_at) VALUES (?,?,'human',?,'active',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[p,t,m]);
      const r=t===tenant?role:randomUUID();await ds.query("INSERT INTO `role`(id,tenant_id,`key`,name,permissions,created_at,updated_at) VALUES (?,?,'crm_test','Synthetic',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[r,t,JSON.stringify(grants)]);await ds.query('INSERT INTO principal_role VALUES (?,?,?)',[t,p,r]);
    }
    app=new CrmRecords(ds,'properties-secret');platform=new CrmPlatform(ds,'properties-secret');
    typeId=String((await platform.mutate(account,tenant,'object-types',{key:'appointment',label:'Appointment'},randomUUID(),undefined,'test')).body.data.id);
    await platform.mutate(account,beta,'object-types',{key:'appointment',label:'Appointment'},randomUUID(),undefined,'test');
    await property('category','enum',{required:true,options:['Consultation','Review']});
    await property('amount','decimal');await property('duration','integer');await property('confirmed','boolean',{default_value:false});await property('visit_date','date');await property('starts','datetime');await property('memo','text');await property('label','string');
    await expect(property('body','string')).rejects.toThrow('INVALID_REQUEST');
    await expect(property('bad','text',{indexed:true})).rejects.toThrow('VALIDATION_FAILED');
  });
  it('validates required/default/types, creates atomic subtype/index/history and replay',async()=>{
    await expect(call('records',{custom_values:{}})).rejects.toThrow('VALIDATION_FAILED');
    await expect(call('records',{custom_values:{category:'bad'}})).rejects.toThrow('VALIDATION_FAILED');
    await expect(call('records',{custom_values:{category:'Review',unknown:3}})).rejects.toThrow('VALIDATION_FAILED');
    const key=randomUUID(),body={custom_values:{category:'Consultation',amount:'12.500000',duration:30,visit_date:'2026-10-04',starts:'2026-10-04T03:00:00Z',memo:'Synthetic',label:'Alpha'}};
    const response=await call('records',body,undefined,undefined,key);expect(await call('records',body,undefined,undefined,key)).toEqual(response);recordId=String(response.body.data.id);
    expect(response.body.data.custom_values).toMatchObject({confirmed:false});
    expect((await ds.query('SELECT COUNT(*) n FROM property_index_value WHERE record_id=?',[recordId]))[0].n).toBe('7');
    expect((await ds.query('SELECT COUNT(*) n FROM custom_record WHERE record_id=?',[recordId]))[0].n).toBe('1');
    expect((await ds.query('SELECT COUNT(*) n FROM ownership_history WHERE record_id=?',[recordId]))[0].n).toBe('1');
    await expect(property('late','string',{required:true,default_value:'x'})).rejects.toThrow('REQUIRED_PROPERTY_REQUIRES_EMPTY_OBJECT');
    await expect(call('records',{custom_values:{category:'Review',confirmed:'true'}})).rejects.toThrow('VALIDATION_FAILED');
    await expect(call('records',{custom_values:{category:'Review',visit_date:'2026-02-30'}})).rejects.toThrow('VALIDATION_FAILED');
  });
  it('query indexed types, exact enum case, null/tie keysets and cursor binding',async()=>{
    for(const label of ['Beta','Gamma'])await call('records',{custom_values:{category:'Review',label,amount:'12.5'}});
    await call('records',{custom_values:{category:'Review'}});
    const q={filter:JSON.stringify([{field:'amount',op:'gte',value:'12.5'}]),sort:JSON.stringify({field:'label',direction:'asc'}),limit:'1'};
    const p=await read(undefined,q);expect(p.data).toHaveLength(1);expect(p.next_cursor).toBeTruthy();
    const p2=await read(undefined,{...q,cursor:p.next_cursor});expect(p2.data).toHaveLength(1);expect((p2.data as any[])[0].id).not.toBe((p.data as any[])[0].id);
    await expect(read(undefined,{...q,filter:'[]',cursor:p.next_cursor})).rejects.toThrow('INVALID_CURSOR');
    await expect(read(undefined,{filter:JSON.stringify([{field:'memo',op:'eq',value:'Synthetic'}])})).rejects.toThrow('FIELD_NOT_QUERYABLE');
    expect((await read(undefined,{filter:JSON.stringify([{field:'label',op:'eq',value:'alpha'}])})).data).toHaveLength(0);
    for(const direction of ['asc','desc']){
      const ids:string[]=[];let cursor:unknown=undefined;
      do{const r=await read(undefined,{sort:JSON.stringify({field:'amount',direction}),limit:1,...(cursor?{cursor}:{})});ids.push(...(r.data as any[]).map(r=>r.id));cursor=r.next_cursor;}while(cursor);
      expect(ids).toHaveLength(4);expect(new Set(ids).size).toBe(4);
    }
  });
  it('partial merge/null deletes projection; stale race only one commits',async()=>{
    const responses=await Promise.allSettled([1,2].map(n=>call('records',{custom_values:{duration:n,amount:null}},recordId,'1')));expect(responses.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await read(recordId)).data).toMatchObject({version:'2'});expect((await ds.query('SELECT * FROM property_index_value i JOIN property_definition p ON p.id=i.property_id WHERE i.record_id=? AND p.`key`=?',[recordId,'amount']))).toHaveLength(0);
    await expect(call('records',{custom_values:{category:null}},recordId,'2')).rejects.toThrow('VALIDATION_FAILED');
    await expect(call('records',{fields:{status:'done'}},recordId,'2')).rejects.toThrow('VALIDATION_FAILED');
  });
  it('fault in index write rolls back registry/subtype/history/audit/receipt',async()=>{
    const before=await ds.query('SELECT id,version,custom_values FROM crm_record ORDER BY id');
    await ds.query("CREATE TRIGGER projection_fault BEFORE INSERT ON property_index_value FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_projection_failure'");
    try{await expect(call('records',{custom_values:{category:'Review'}})).rejects.toThrow();await expect(call('records',{custom_values:{duration:50}},recordId,'2')).rejects.toThrow();}finally{await ds.query('DROP TRIGGER projection_fault');}
    expect(await ds.query('SELECT id,version,custom_values FROM crm_record ORDER BY id')).toEqual(before);
    expect((await ds.query('SELECT COUNT(*) n FROM crm_record'))[0].n).toBe((await ds.query('SELECT COUNT(*) n FROM custom_record'))[0].n);
    expect(await ds.query("SELECT id FROM idempotency_record WHERE status='pending'")).toHaveLength(0);
  });
  it('forms/views reference metadata; CAS and query policy, immutable property type',async()=>{
    const form=await call('forms',{fields:['category','starts','memo']},'default');expect(form.status).toBe(201);
    await expect(call('forms',{fields:['unknown']},'default','1')).rejects.toThrow('VALIDATION_FAILED');
    await expect(call('views',{columns:['category']},'incomplete')).rejects.toThrow('INVALID_REQUEST');
    await call('views',{columns:['category','amount'],filter:[{field:'category',op:'eq',value:'Review'}],sort:{field:'amount',direction:'desc'}},'default');
    expect((await app.read(account,tenant,{object:'appointment',kind:'forms',id:'default'})).data).toMatchObject({fields:['category','starts','memo']});
    await expect(call('properties',{type:'text'},'category','1')).rejects.toThrow('INVALID_REQUEST');
    await call('properties',{label:'Category changed'},'category','1');
    await expect(call('properties',{label:'Stale'},'category','1')).rejects.toThrow('VERSION_CONFLICT');
  });
  it('field deny redaction/write/filter/sort/replay and schema read never grants records',async()=>{
    const key=randomUUID(),body={custom_values:{memo:'Synthetic replay'}};
    await call('records',body,recordId,'2',key);
    const policy=randomUUID();await ds.query("INSERT INTO field_policy(id,tenant_id,role_id,object_type_id,property_key,denied_actions,created_at,updated_at) VALUES (?,?,?,?,'memo',JSON_ARRAY('read','write'),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",[policy,tenant,role,typeId]);
    try{
      expect((await read(recordId)).data).toMatchObject({custom_values:{category:'Consultation'}});expect((await read(recordId)).data.custom_values).not.toHaveProperty('memo');
      await expect(call('records',body,recordId,'2',key)).rejects.toThrow('FIELD_FORBIDDEN');
      await expect(call('records',body,recordId,'3')).rejects.toThrow('FIELD_FORBIDDEN');
      await expect(read(undefined,{sort:JSON.stringify({field:'memo',direction:'asc'})})).rejects.toThrow('FIELD_FORBIDDEN');
      expect((await app.read(account,tenant,{object:'appointment',kind:'forms',id:'default'})).data).toMatchObject({fields:['category','starts']});
    }finally{await ds.query('DELETE FROM field_policy WHERE id=?',[policy]);}
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.filter(g=>g.resource==='schema')),role]);
    await expect(read(recordId)).rejects.toThrow('NOT_FOUND');await expect(read()).rejects.toThrow('FORBIDDEN');
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);
  });
  it('cross-tenant references, own scope and viewer write rejection',async()=>{
    await expect(app.read(account,beta,{object:'appointment',kind:'records',id:recordId})).rejects.toThrow('NOT_FOUND');
    await expect(ds.query('INSERT INTO custom_record VALUES (?,?)',[beta,recordId])).rejects.toThrow();
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants.map(g=>g.resource==='appointment'?{...g,scope:'own'}:g)),role]);
    await ds.query('UPDATE crm_record SET owner_principal_id=NULL WHERE id=?',[recordId]);await expect(read(recordId)).rejects.toThrow('NOT_FOUND');
    expect((await read()).data).toHaveLength(3);await ds.query('UPDATE crm_record SET owner_principal_id=? WHERE id=?',[principal,recordId]);
    await ds.query('UPDATE `role` SET permissions=? WHERE id=?',[JSON.stringify(grants),role]);await ds.query("UPDATE membership SET seat_code='viewer' WHERE tenant_id=?",[tenant]);
    await expect(call('records',{custom_values:{category:'Review'}})).rejects.toThrow('FORBIDDEN');await ds.query("UPDATE membership SET seat_code='admin' WHERE tenant_id=?",[tenant]);
  });
  it('ServiceOffering defaults preserve JSON types and link to Appointment',async()=>{
    await platform.mutate(account,tenant,'object-types',{key:'service_offering',label:'ServiceOffering'},randomUUID(),undefined,'test');
    const propertyBody={key:'fee',label:'Fee',type:'decimal',required:false,indexed:true,sensitive:false,default_value:'12.5'};
    await call('properties',propertyBody,undefined,'1',randomUUID(),'service_offering');
    const created=await call('records',{},undefined,undefined,randomUUID(),'service_offering');expect(created.body.data.custom_values).toEqual({fee:'12.5'});
    await platform.mutate(account,tenant,'association-types',{key:'appointment_service',label:'Service',source_type:'appointment',target_type:'service_offering',cardinality:'many_to_one'},randomUUID(),undefined,'test').catch(e=>expect(e.code).toBe('INVALID_REQUEST'));
    await platform.mutate(account,tenant,'association-types',{key:'appointment_service',label:'Service',source_type:'appointment',target_type:'service_offering',cardinality:'many_to_many'},randomUUID(),undefined,'test');
    const r=await call('records',{custom_values:{category:'Review'}});
    await platform.mutate(account,tenant,'associations',{type_key:'appointment_service',source_record_id:r.body.data.id,target_record_id:created.body.data.id},randomUUID(),'1','test');
    expect((await platform.associations(account,tenant,String(r.body.data.id),{})).data).toHaveLength(1);
    await call('archive',{reason:'Synthetic'},String(r.body.data.id),'2');
  });
  it('HTTP contract: properties/records validation, etag, archive and durable status',async()=>{
    class TestModule{} Module({controllers:[CrmController],providers:[{provide:CrmRuntime,useValue:{ready:async()=>{},records:app,platform}},{provide:AuthRuntime,useValue:{service:{session:async()=>({account_id:account}),requireMutation:async()=>({account_id:account})}}}]})(TestModule);
    const server=await NestFactory.create(TestModule,{logger:false});server.setGlobalPrefix('api/v1');await server.listen(0,'127.0.0.1');
    try{
      const base=await server.getUrl(),headers={'X-Tenant-Id':tenant,'Content-Type':'application/json','Idempotency-Key':randomUUID()};
      const get=await fetch(`${base}/api/v1/objects/appointment/records/${recordId}`,{headers});expect(get.status).toBe(200);expect(get.headers.get('etag')).toBe('"3"');
      const invalid=await fetch(`${base}/api/v1/objects/appointment/records`,{method:'POST',headers,body:JSON.stringify({custom_values:{category:'Invalid'}})});expect(invalid.status).toBe(422);expect((await invalid.json() as any).error.fields[0].path).toBe('category');
      const archived=await fetch(`${base}/api/v1/objects/appointment/records/${recordId}/archive`,{method:'POST',headers:{...headers,'If-Match':'"3"'},body:JSON.stringify({reason:'Synthetic test'})});expect(archived.status).toBe(200);expect((await archived.json() as any).data.archived).toBe(true);
      expect((await read()).data).toHaveLength(3);
    }finally{await server.close();}
  });
});}
