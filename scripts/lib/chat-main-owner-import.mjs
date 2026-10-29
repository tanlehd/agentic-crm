import {canonical,sha} from './chat-exact.mjs';
const names=['identity_owner_gate','identity_account_gate','routing_capacity_gate','routing_allocation_head','crm_reference_gate','connector_reference_gate','crm_owner_command'];
const quote=name=>{if(!/^[a-z_]+$/.test(name))throw Error('OWNER_IDENTIFIER');return '`'+name+'`';};
const normalized=row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value===null?null:key.endsWith('_json')?canonical(typeof value==='string'?JSON.parse(value):value):String(value)]));
export function ownerImportScope(snapshot,database){
 if(database==='agentic_crm'){
  const m=snapshot.manifest;
  if(m.purpose!=='fenced-main-cutover'||m.writersFenced!==true||!m.fenceDigest||sha(canonical(m.fence))!==m.fenceDigest||!m.fence.accounts.length||m.fence.accounts.some(a=>!a.locked)||m.fence.activeSourceWriters!==0)throw Error('OWNER_FINAL_FENCE_REQUIRED');
 }else if(!/^test_t09_owner_[a-f0-9]{16}$/.test(database)||snapshot.manifest.purpose!=='diagnostic-only-not-importable')throw Error('OWNER_IMPORT_SCOPE');
}
// Caller verifies current main fence and immutable snapshot before and after.
// Only inserts exact deterministic bootstrap rows; never overwrites live state.
export async function importOwnerPlan(pool,snapshot,plan,database){
 ownerImportScope(snapshot,database);
 if(plan.sourceDigest!==sha(canonical(snapshot.manifest))||plan.digest!==sha(canonical(plan.tables))||canonical(Object.keys(plan.tables).sort())!==canonical([...names].sort()))throw Error('OWNER_PLAN_BINDING');
 const c=await pool.getConnection();
 try{
  const [[identity]]=await c.query('SELECT DATABASE() db');if(identity.db!==database)throw Error('OWNER_DATABASE');
  await c.query("SET time_zone='+00:00'");await c.beginTransaction();
  let inserted=0,replayed=0;
  for(const table of names){
   const expected=plan.tables[table],columns=expected.length?Object.keys(expected[0]):[];
   const [existing]=await c.query('SELECT * FROM '+quote(table)+' FOR UPDATE');
   const hashes=new Set(expected.map(r=>canonical(normalized(r))));
   // Full-table equality rejects unrelated tenants, changed seeds and resumed
   // operations. Bootstrap is available only before native runtime activation.
   for(const r of existing){const value=Object.fromEntries(columns.map(k=>[k,r[k]]));if(!hashes.has(canonical(normalized(value))))throw Error('OWNER_EXISTING_STATE_'+table);}
   const present=new Set(existing.map(r=>canonical(normalized(Object.fromEntries(columns.map(k=>[k,r[k]]))))));
   for(const r of expected){
    const key=canonical(normalized(r));if(present.has(key)){replayed++;continue;}
    await c.execute('INSERT INTO '+quote(table)+' ('+columns.map(quote).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')',columns.map(k=>r[k]));inserted++;
   }
   const [after]=await c.query('SELECT * FROM '+quote(table));
   if(after.length!==expected.length||after.some(r=>!hashes.has(canonical(normalized(Object.fromEntries(columns.map(k=>[k,r[k]])))))))throw Error('OWNER_RECONCILIATION_'+table);
  }
  await c.commit();return {status:'VALIDATED_OWNER_BOOTSTRAP',digest:plan.digest,inserted,replayed,counts:Object.fromEntries(names.map(n=>[n,plan.tables[n].length]))};
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}
