// Browser-only fixture, executed over stdin in local API container; no HTTP route.
import { databaseSource } from './dist/kernel/database/data-source.js';
import { UnitOfWork } from './dist/kernel/tenancy/unit-of-work.js';
import { IdentityAuthorization } from './dist/modules/identity/authorization.js';
import { seedGuard,fixtureId } from './dist/modules/identity/seed.js';
import { RecordRegistry } from './dist/modules/crm/registry.js';
import { conversation,cancelQueued } from './dist/modules/conversation/domain.js';
seedGuard(process.env);
const input=JSON.parse(await new Promise(resolve=>{let value='';process.stdin.on('data',c=>value+=c);process.stdin.on('end',()=>resolve(value));}));
if(!['alpha','beta'].includes(input.label)||typeof input.id!=='string'||![true,false].includes(input.owned))throw new Error('FIXTURE_INPUT');
const source=databaseSource();await source.initialize();
try{
 const tenant=fixtureId(`clinic_${input.label}`),principal=fixtureId(`${input.label}:human:${input.label}_admin`),uow=new UnitOfWork(source);
 await uow.run({tenantId:tenant},async s=>{
   const [m]=await s.query('SELECT m.account_id FROM membership m JOIN principal p ON p.tenant_id=m.tenant_id AND p.membership_id=m.id WHERE p.tenant_id=? AND p.id=?',[tenant,principal]);
   const access=await new IdentityAuthorization(uow).loadHuman(s,m.account_id,undefined,true);
   const {record,row}=await conversation(s,input.id,true);
   // Restrict mutation to synthetic subjects created by this browser harness.
   const [identity]=await s.query('SELECT external_subject_id FROM contact_identity WHERE tenant_id=? AND id=?',[tenant,row.contact_identity_id]);
   if(!identity?.external_subject_id.startsWith('src016-synthetic-'))throw new Error('FIXTURE_RECORD_DENIED');
   const registry=new RecordRegistry(new Map([['conversation',{insert:async()=>{throw new Error('NO_CREATE');},exists:async()=>true,eligible:async()=>{},assigned:async(scope,r)=>cancelQueued(scope,r.id)}]]));
   await registry.assign(s,access,input.id,record.version,input.owned?principal:null,record.teamId,'src016-synthetic-fixture');
 });console.log('{"ok":true}');
}finally{await source.destroy();}
