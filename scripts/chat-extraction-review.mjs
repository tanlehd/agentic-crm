// Read-only review of the captured metadata. This does not certify migration readiness.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {currentSourcePath} from './lib/repository-paths.mjs';

const root='services/core-baseline/src/';
const inventory=JSON.parse(await readFile('artifacts/chat-extraction/inventory.json','utf8'));
const review=JSON.parse(await readFile('docs/architecture/chat-storage-review.json','utf8'));
assert.equal(review.version,1);
assert.equal(inventory.readOnly,true);
assert.equal(Number(inventory.mainSchema),review.baselineSchema,'Refresh/review metadata after schema changes');
const owners=new Map();
for(const [owner,tables] of Object.entries(review.owners))for(const table of tables){
 assert(!owners.has(table),`Duplicate owner: ${table}`);owners.set(table,owner);
}
assert.deepEqual([...owners.keys()].sort(),inventory.schema.map(t=>t.name).sort(),'Every physical table needs explicit disposition');
for(const table of inventory.schema){
 const tenant=table.columns.find(c=>c.name==='tenant_id');
 assert(tenant&&tenant.nullable==='NO',`Missing tenant NOT NULL: ${table.name}`);
}
// Source hashes make this a review of the actual inspected tree, not a stale line-number list.
for(const [file,hash] of Object.entries(inventory.source.hashes)){
 assert.equal(createHash('sha256').update(await readFile(currentSourcePath(file))).digest('hex'),hash,`Stale source inventory: ${file}`);
}
const dynamicKey=d=>`${currentSourcePath(d.file)}:${d.line}`;
assert.equal(new Set(review.dynamicSql.map(dynamicKey)).size,review.dynamicSql.length,'Duplicate dynamic review');
assert.deepEqual(review.dynamicSql.map(dynamicKey).sort(),inventory.dynamicSqlLocations.map(dynamicKey).sort(),'Unreviewed dynamic SQL');
for(const actual of inventory.dynamicSqlLocations){
 const accepted=review.dynamicSql.find(d=>dynamicKey(d)===dynamicKey(actual));
 assert.equal(actual.sha256,accepted.sha256,`Dynamic expression changed: ${dynamicKey(actual)}`);
 assert(accepted.reason&&accepted.tables.length);
 for(const table of accepted.tables)assert(owners.has(table),`Unknown dynamic table: ${table}`);
}
assert.deepEqual(Object.keys(review.partitions).sort(),review.owners.partition.toSorted());
const portCandidates=[];
for(const port of review.ports){
 assert(Object.keys(inventory.source.hashes).some(file=>currentSourcePath(file)===root+port.file),`Missing reviewed port: ${port.file}`);
 portCandidates.push({...port,tables:[...new Set(inventory.source.sqlReferences.filter(r=>currentSourcePath(r.file)===root+port.file).map(r=>r.table))].sort()});
}
const local=t=>['chat','partition'].includes(owners.get(t));
const constraints=inventory.foreignKeys.filter(f=>local(f.source_table)||f.columns.some(c=>local(c.target_table))).map(f=>{
 assert(f.columns.length,`Missing FK columns: ${f.constraint_name}`);
 const target=f.columns[0].target_table;
 assert(f.columns.every(c=>c.target_table===target));
 const sourceLocal=local(f.source_table),targetLocal=local(target);
 const override=review.constraintOverrides[`${f.source_table}.${f.constraint_name}`];
 const disposition=override?.disposition??(sourceLocal&&targetLocal?'local-after-row-partition-validation':sourceLocal?'replace-outgoing-with-owner-reference':'detach-incoming-before-cutover');
 return {...f,target_table:target,source_owner:owners.get(f.source_table),target_owner:owners.get(target),disposition,...(override?{reason:override.reason}:{})};
});
for(const key of Object.keys(review.constraintOverrides))assert(constraints.some(f=>`${f.source_table}.${f.constraint_name}`===key),`Stale constraint review: ${key}`);
const counts={};for(const f of constraints)counts[f.disposition]=(counts[f.disposition]??0)+1;
const tableRows=inventory.schema.filter(t=>local(t.name)||owners.get(t.name)==='journal').map(t=>({
 table:t.name,owner:owners.get(t.name),columns:t.columns.length,indexes:new Set(t.indexes.map(i=>i.name)).size,
 rule:review.partitions[t.name]?.rule??(owners.get(t.name)==='journal'?'New lineage; baseline journal never copied':'All tenant-bound rows, including history/archived'),
 status:review.partitions[t.name]?.status??(owners.get(t.name)==='journal'?'new-lineage-design-required':'source-owner-reviewed'),
}));
const unresolved=Object.entries(review.partitions).filter(([,p])=>p.status==='pending').map(([table])=>table);
const report={at:new Date().toISOString(),sourceInventoryAt:inventory.at,readOnly:true,migrationReady:false,
 physicalTables:owners.size,physicalColumns:inventory.schema.reduce((n,t)=>n+t.columns.length,0),
 chatSourceTables:review.owners.chat.length,partitionTables:review.owners.partition.length,dynamicReviewed:review.dynamicSql.length,
 constraints:counts,tableRows,foreignKeys:constraints,portCandidates,unresolvedPartitions:unresolved,
 remaining:['Exact reliability row predicates and compatibility receipts','Owner API/event/saga schemas and complete consumer mapping','Target table templates, grants and migration/backfill/rollback design'],
};
const lines=['# Chat source storage review — schema42','',
 'Metadata/source review only; not target DDL, migration authorization or runtime extraction proof. Full columns/indexes/CHECKs are in inventory.json. All actual FK constraints below require row-level reconciliation before cutover.','',
 '| Table | Disposition | Columns | Indexes | Row rule |','|---|---|---:|---:|---|',
 ...tableRows.map(t=>`| ${t.table} | ${t.owner} | ${t.columns} | ${t.indexes} | ${t.rule} |`),'',
 '## Incoming and outgoing constraints','',
 '| Constraint | Source columns | Target columns | Decision |','|---|---|---|---|',
 ...constraints.map(f=>`| ${f.constraint_name} | ${f.source_table}(${f.columns.map(c=>c.source_column).join(',')}) | ${f.target_table}(${f.columns.map(c=>c.target_column).join(',')}) | ${f.disposition}${f.reason?': '+f.reason:''} |`),'',
 '## Reviewed application-port boundaries','',
 '| File | Static candidate tables (not complete method write-set) | Required replacement |','|---|---|---|',
 ...portCandidates.map(p=>`| ${p.file} | ${p.tables.join(', ')} | ${p.boundary} |`),'',
 '## Remaining gates','',...report.remaining.map(r=>`- ${r}`),'',
 'Import closure is an over-approximation, not proof that every imported method executes. Dynamic review is pinned to source hashes; no schema or data writes performed.',''];
await mkdir('artifacts/chat-extraction',{recursive:true});
await writeFile('artifacts/chat-extraction/review.json',JSON.stringify(report,null,2)+'\n');
await writeFile('artifacts/chat-extraction/review.md',lines.join('\n'));
console.log(JSON.stringify({physicalTables:report.physicalTables,physicalColumns:report.physicalColumns,chatSourceTables:report.chatSourceTables,partitionTables:report.partitionTables,dynamicReviewed:report.dynamicReviewed,constraints:counts,unresolvedPartitions:unresolved,migrationReady:false}));
