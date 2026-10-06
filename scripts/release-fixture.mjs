// Executed on stdin inside the isolated release migration container only.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { databaseSource } from './dist/kernel/database/data-source.js';
import { fixtureId } from './dist/modules/identity/seed.js';
import { CrmRecords } from './dist/modules/crm/records.js';
import { coreDomains, contactReferences } from './dist/modules/crm/core.js';
import { LeadService, leadDomain } from './dist/modules/sales/leads.js';
assert.equal(process.env.RELEASE_SMOKE,'1');assert.equal(process.env.MYSQL_HOST,'mysql');
const source=databaseSource(true);await source.initialize();
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object'&&!(value instanceof Date))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
try{
 const op=process.env.RELEASE_OPERATION;
 if(op==='m1-records'){
  for(const label of ['alpha','beta']){
   const tenant=fixtureId(`clinic_${label}`),account=fixtureId(`account:${label}_admin`),domains=coreDomains();domains.set('lead',leadDomain(contactReferences));const records=new CrmRecords(source,'synthetic-release',domains);
   const create=async(object,body)=>String((await records.mutate(account,tenant,{object,kind:'records'},body,randomUUID(),undefined,'synthetic-release')).body.data.id);
   const contact=await create('contact',{fields:{display_name:`Synthetic M1 ${label}`}});
   await create('company',{fields:{name:`Synthetic M1 company ${label}`}});
   const appointment=await create('appointment',{custom_values:{title:`Synthetic M1 appointment ${label}`,stage:'planned'}});
   await create('service_offering',{custom_values:{name_label:'Synthetic M1 service',category:'consultation',list_price:'10.000000'}});
   await new LeadService(records,contactReferences).create(account,tenant,{contact_id:contact},randomUUID(),'synthetic-release');
   await source.query('INSERT INTO association(id,tenant_id,association_type_id,source_record_id,target_record_id,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6))',[randomUUID(),tenant,fixtureId(`${label}:association:contact_appointment`),contact,appointment]);
  }
  console.log(JSON.stringify({status:'PASS',fixture:'historical-M1-standard-custom-lead-association'}));
 }else if(op==='snapshot'){
  const tables=await source.query('SELECT table_name name FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name');
  const result={};for(const {name} of tables){assert.match(name,/^[a-z_]+$/);const rows=await source.query(`SELECT * FROM \`${name}\``);const values=rows.map(row=>JSON.stringify(canonical(row))).sort();result[name]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(values)).digest('hex')};}
  const journal=await source.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version');console.log(JSON.stringify({tables:result,journal}));
 }else throw new Error('INVALID_RELEASE_OPERATION');
}finally{await source.destroy();}
