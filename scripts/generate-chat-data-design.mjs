// Offline T02 DDL/dictionary generation. This script cannot migrate or connect.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {source,additions,purposes,grants,systemTenant,owners} from './lib/chat-data-design.mjs';
import {receiptRules,chatEvents,remoteEvents,chatConsumers,retainedConsumers,chatAudits} from './lib/chat-data-partition.mjs';
const root='docs/data/chat-extraction',check=process.argv.includes('--check');
const hash=s=>createHash('sha256').update(s).digest('hex');
const q=s=>'`'+s+'`',literal=s=>"'"+String(s).replaceAll("'","''")+"'";
const unescape=s=>s.replaceAll("\\'","'");
const groups=rows=>Object.values(Object.groupBy(rows,x=>x.name)).map(xs=>({name:xs[0].name,unique:!xs[0].non_unique,columns:xs.sort((a,b)=>a.position-b.position).map(x=>({name:x.column_name,prefix:x.prefix_length,expression:x.expression}))}));
const old=source.tables.map(t=>({
 owner:'chat',schema:'crm_chat',name:t.name,scope:'business',purpose:purposes[t.name],legacy:true,kind:['audit_entry','ownership_history','need_assessment_revision','session_stage_event','session_milestone_event','session_contribution','session_process_version','session_touchpoint'].includes(t.name)?'immutable ledger':['property_index_value','conversation_workspace'].includes(t.name)?'retained projection':'source of truth',
 columns:t.columns.map(c=>({name:c.name,type:c.type+(c.collation_name?` CHARACTER SET ${c.collation_name.split('_')[0]} COLLATE ${c.collation_name}`:''),nullable:c.nullable==='YES',default:c.default_value,extra:c.extra,generated:unescape(c.generation_expression),meaning:c.comment||`Preserved baseline ${t.name}.${c.name}; see source dictionary and normative lifecycle`})),
 keys:groups(t.indexes),checks:t.checks.map(c=>unescape(c.clause)),
 fks:source.foreignKeys.filter(f=>f.source_table===t.name&&f.disposition==='local-after-row-partition-validation'),
 remote:source.foreignKeys.filter(f=>f.source_table===t.name&&f.disposition!=='local-after-row-partition-validation')
}));
// No type, existing key, generated expression, default or CHECK silently changes.
// Physical target gains explicit scope constraints; legacy PK(id)+tenant unique stays.
for(const t of old)t.checks.push(`tenant_id <> '${systemTenant}' AND tenant_id <> '' AND tenant_id <> '00000000-0000-0000-0000-000000000000'`);
const tables=[...old,...additions.map(t=>({...t,keys:[{name:'PRIMARY',unique:true,columns:t.pk.map(name=>({name}))},...t.unique.map((xs,n)=>({name:`uq_${t.name}_${n+1}`,unique:true,columns:xs.map(name=>({name}))})),...t.indexes.map((xs,n)=>({name:`ix_${t.name}_${n+1}`,unique:false,columns:xs.map(name=>({name}))}))],fks:[],remote:[]}))];
// New local relationships are restrictive; cleanup never cascades through receipts.
for(const t of tables.filter(t=>!t.legacy)){
 const link=(columns,target,targetColumns=columns)=>t.fks.push({constraint_name:`fk_${t.name}_${t.fks.length+1}`,target_table:target,columns:columns.map((source_column,n)=>({source_column,target_column:targetColumns[n]})),update_rule:'RESTRICT',delete_rule:'RESTRICT'});
 const prefix=t.name.replace(/_(?:owner_dependency|owner_selection)$/,'');
 if(/_(owner_dependency|owner_selection)$/.test(t.name))link(['tenant_id','command_id'],`${prefix}_owner_command`);
 if(t.name==='chat_report_page')link(['tenant_id','snapshot_id'],'chat_report_snapshot');
 if(t.name==='chat_report_snapshot')link(['tenant_id','command_id'],'chat_owner_command');
 if(t.name==='chat_control_head')link(['tenant_id','conversation_id'],'conversation',['tenant_id','record_id']);
 if(t.name==='chat_migration_chunk')link(['tenant_id','run_id'],'chat_migration_run');
 if(t.name.endsWith('_event_delivery'))link(['tenant_id','consumer_name','aggregate_type','aggregate_id'],t.name.replace('_event_delivery','_event_stream'));
 if(t.name.endsWith('_reference_reservation'))link(['tenant_id','resource_kind','resource_id'],t.name.replace('_reference_reservation','_reference_gate'));
}
const keySQL=k=>(k.name==='PRIMARY'?'PRIMARY KEY':`${k.unique?'UNIQUE ':''}KEY ${q(k.name)}`)+` (${k.columns.map(c=>c.expression?`(${unescape(c.expression)})`:q(c.name)+(c.prefix?`(${c.prefix})`:'')).join(',')})`;
function columnSQL(c){
 let out=`${q(c.name)} ${c.type}`;
 if(c.generated)return out+` GENERATED ALWAYS AS (${c.generated}) ${c.extra.includes('STORED')?'STORED':'VIRTUAL'}`;
 out+=c.nullable?' NULL':' NOT NULL';
 if(c.default!==undefined&&c.default!==null)out+=' DEFAULT '+(c.extra?.includes('DEFAULT_GENERATED')?`(${unescape(c.default)})`:/^(?:bigint|int|smallint|tinyint|decimal)/i.test(c.type)?c.default:literal(c.default));
 return out;
}
function createSQL(t){return `CREATE TABLE ${q(t.schema)}.${q(t.name)} (\n  ${[...t.columns.map(columnSQL),...t.keys.map(keySQL),...t.checks.map((c,n)=>`CONSTRAINT ${q(`ck_${t.name}_${n+1}`)} CHECK (${c})`)].join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs COMMENT=${literal(`${t.owner}; ${t.scope}; ${t.purpose}`)};\n`;}
function fkSQL(t,f){return `ALTER TABLE ${q(t.schema)}.${q(t.name)} ADD CONSTRAINT ${q(f.constraint_name)} FOREIGN KEY (${f.columns.map(c=>q(c.source_column))}) REFERENCES ${q(t.schema)}.${q(f.target_table)} (${f.columns.map(c=>q(c.target_column))}) ON UPDATE ${f.update_rule} ON DELETE ${f.delete_rule};`;}
const heading='-- T02 design v1, UNAPPLIED. No runtime invocation. Do not run against main.\n-- MySQL 8.4; explicit operator schema/identity preflight required.\n';
const chat=tables.filter(t=>t.owner==='chat'),remote=tables.filter(t=>t.owner!=='chat');
const files=new Map();
files.set('chat-v1.sql',heading+chat.map(createSQL).join('\n')+'\n-- Add only after retained rows and references validate.\n'+chat.flatMap(t=>t.fks.map(f=>fkSQL(t,f))).join('\n')+'\n');
files.set('owner-additions-v1.sql',heading+'-- Logical target schemas only. Baseline physical mapping is in manifest; do not provision other services here.\n'+remote.map(createSQL).join('\n')+'\n'+remote.flatMap(t=>t.fks.map(f=>fkSQL(t,f))).join('\n')+'\n');
files.set('baseline-reference-detach-v1.sql',heading+'-- Future baseline044, only after adapter/row-reference validation; six subtype FKs deliberately retained.\n'+source.foreignKeys.filter(f=>['detach-incoming-before-cutover','replace-inbox-producer-fk'].includes(f.disposition)).map(f=>`ALTER TABLE agentic_crm.${q(f.source_table)} DROP FOREIGN KEY ${q(f.constraint_name)};`).join('\n')+'\n');
const review=JSON.parse(await readFile('docs/architecture/chat-storage-review.json','utf8'));
files.set('source-export-grants-v1.sql',heading+"-- Separate operator only; source account never used by Chat API/worker.\nCREATE ROLE IF NOT EXISTS 'chat_source_export';\n"+Object.values(review.owners).flat().sort().map(name=>`GRANT SELECT ON agentic_crm.${q(name)} TO 'chat_source_export';`).join('\n')+'\n');
let grantSQL=heading+'-- Provision these roles separately; no passwords or GRANT OPTION.\n';
for(const [owner,schema] of Object.entries(owners)){
 const p=owner.replaceAll('-','_');
 for(const role of ['api','worker','migrator'])grantSQL+=`CREATE ROLE IF NOT EXISTS '${p}_${role}';\n`;
 grantSQL+=`GRANT CREATE, ALTER, INDEX, REFERENCES ON ${q(schema)}.* TO '${p}_migrator';\n`;
 for(const t of tables.filter(t=>t.owner===owner))for(const [role,permissions] of Object.entries(grants(t)))grantSQL+=`GRANT ${permissions.join(', ')} ON ${q(schema)}.${q(t.name)} TO '${p}_${role}';\n`;
}
files.set('grants-v1.sql',grantSQL);
const templateRows=t=>[
 ['Task / requirement / acceptance','SRC-109/T02, D3-01; [CD-01…12](../../quality/chat-data-acceptance.md); native execution NOT_RUN'],
 ['Tên table / schema đích',`${t.schema}.${t.name}; owner ${t.owner}`],['Physical current',t.legacy?'agentic_crm42; unchanged source retained until T09':`Not created. ${t.owner==='chat'?'New Chat lineage1':'Owner-local additive migration; see physical map in manifest'}`],
 ['Service writer / aggregate',`${t.owner} only; ${t.purpose}; local transaction and audit/outbox/receipt, never remote SQL`],['Ý nghĩa / không thuộc phạm vi',`${t.purpose}; no replica authorization or remote business authority`],['Loại dữ liệu',t.kind],
 ['Scope',t.scope==='system'?`Registered deployment system tenant ${systemTenant}; operator/native account gate only; no default`:'Authenticated business TenantContext, reject system/empty/zero/foreign tenant; all queries tenant-bound'],
 ['Cột','Exact types/null/default/generated expression below; source columns retain meaning in [baseline dictionary](../dictionary.md) and source-v42.json; new meanings are explicit'],
 ['Keys / constraints',`${t.keys.map(keySQL).join('; ')}. CHECKs and FKs are exact in DDL. No cascade deletion.`],
 ['Remote references',t.remote.length?t.remote.map(f=>`${f.columns.map(c=>c.source_column).join('+')} → ${f.target_table}: owner API reserve/admit/proof; see75-FK manifest`).join('; '):'Any actor, delegation, remote command/event/source ID is a logical T01 owner reference. Local FKs listed below. Missing/forbidden/unavailable remain distinct; reconcile historical retired refs without recreating them.'],
 ['Query patterns / indexes',`${t.keys.filter(k=>k.name!=='PRIMARY').map(keySQL).join('; ')||'Exact tenant+primary-key lookup'}. Equality prefix then keyset order, max100. Scheduler indexes with status/state first are bounded cross-tenant discovery only. Native EXPLAIN required CD-07; NOT_RUN.`],
 ['Quyền',`Owner ${t.owner} workload allowlist plus exact operation policy from [16 capability rows](../../architecture/chat-owner-consumers.md); read rights re-admitted, own/team/all and field deny before page/aggregate. Recovery proofs minimized; no transcript via operator endpoints.`],
 ['Concurrent writes',t.kind==='immutable ledger'?'Insert-once same key+digest; conflict quarantines, no UPDATE of history. Local parent/aggregate locks; terminal keys never regenerated.':'Lock tenant gate → command → resource IDs sorted → counters/receipt. CAS version/revision/state; leases schedule work only. No SQL transaction across RPC; retry same binding.'],
 ['Audit / outbox','Business change + local receipt + minimized audit + event/delivery allocation in one owner transaction. Audit/transport/checkpoint writes do not recursively emit themselves. T01 state/proof sequencing is normative.'],
 ['PII / secret / retention','Encrypted DB/backup/export at rest, no tokens/passwords; message/command/snapshot payload may contain PII. No automatic local purge except settled temporary report pages. Seven-day public receipt response expiry preserves permanent effect dedup; restore/replay horizon retains digests and tombstones.'],
 ['DB grants',Object.entries(grants(t)).map(([r,p])=>`${t.owner}_${r}: ${p.join('/')}`).join('; ')+'; DDL only separate migrator; no foreign schema grants'],
 ['Migration',t.legacy?'Copy exact selected rows from immutable fenced export, preserve all scalar/JSON/history/IDs; generated columns omitted from INSERT and compared after readback. Chunk receipt commits with rows.':t.name==='schema_migration'?'Bootstrap system journal; record real Chat001/002 checksums only, never baseline42 entries.':'Initialize under disabled writer gate using explicit initialization map in migration design; no source rows invented.'],
 ['Compatibility / rollback','Old baseline binary never points here. Before destination business effects: abandon activation and revalidate source. After effects: freeze, reconcile downstream and forward recover; no bare routing rollback. [Protocol](../../architecture/chat-data-migration.md).'],
 ['Test fixtures','Retained Alpha/Beta business tenants+existing principals; archived and active objects, same logical keys across tenants, old completed/pending receipts; synthetic payloads only. New run IDs, no reset. CD-01…12.'],
 ['Evidence','Offline generation/static design check artifacts/chat-extraction/t02; MySQL DDL application, native constraints/grants/EXPLAIN/copy NOT_RUN.']
];
let dictionary='# Chat extraction exact table templates — v1\n\nSRC-109/T02, design-only. Generated from [source metadata](chat-extraction/source-v42.json) and scripts/lib/chat-data-design.mjs; reviewed semantics, partition and initialization rules are in [migration design](../architecture/chat-data-migration.md). No applied migration.\n\n';
// This file lives one directory above the SQL/manifest directory.
for(const t of tables){
 dictionary+=`## ${t.schema}.${t.name}\n\n| Mục bắt buộc | Nội dung |\n|---|---|\n`+templateRows(t).map(([k,v])=>`| ${k} | ${v.replaceAll('|','/').replaceAll('../../','../').replaceAll('(../dictionary.md)','(dictionary.md)')} |`).join('\n')+'\n\n| Column | SQL type | Null / default / generated | Meaning |\n|---|---|---|---|\n'+t.columns.map(c=>`| ${c.name} | ${c.type} | ${c.nullable?'NULL':'NOT NULL'}; ${c.generated?'GENERATED '+c.generated:c.default==null?'no default':`DEFAULT ${c.default}`} | ${c.meaning} |`).join('\n')+'\n\n';
 dictionary+=`CHECK: ${t.checks.map(c=>'`'+c+'`').join('; ')}.\n\n`;
 if(t.fks.length)dictionary+='Local FK: '+t.fks.map(f=>`${f.constraint_name}: (${f.columns.map(c=>c.source_column)}) → ${f.target_table}(${f.columns.map(c=>c.target_column)})`).join('; ')+'.\n\n';
}
const foreignKeys=source.foreignKeys.map(f=>({...f,rowRule:f.disposition==='local-after-row-partition-validation'?'For every selected child, same-tenant parent in selected target set; nullable FK uses MySQL null semantics':f.disposition==='retain-non-chat-subtype-in-baseline'?'Subtype must be disjoint from validated Conversation set; retain actual constraint in baseline':f.disposition==='replace-inbox-producer-fk'?'Consumer owns receipt; original producer owns envelope; authenticated logical event ref':f.disposition==='detach-incoming-before-cutover'?'For every Chat-target reference validate same tenant and owner API; detach full physical FK in forward baseline migration, preserve non-Chat rows and replace mixed-row validation at application boundary':'Preserve exact reference value; validate owner protocol before activation; inactive historical refs retain tombstones',replacement:f.target_owner==='identity'?'identity.admit/directory; account links via original native Identity delegation':f.target_owner==='core'?'crm.reference-reserve/metadata-read/contact-lookup':f.target_owner==='connector'?'connector.reference-reserve/channel-batch':'chat.record-batch/session-source/command-proof and existing dispatch/exchange; producer event-read for inbox'}));
const manifest={version:1,task:'SRC-109/T02',designOnly:true,applied:false,sourceSchema:'agentic_crm',sourceVersion:42,sourceInventorySha256:source.inventorySha256,targetSchema:'crm_chat',targetLineage:'chat-owner-v1',targetSchemaVersion:2,systemTenant,counts:{legacyChat:36,partitions:8,chatTables:chat.length,chatAddedBeyond44:chat.length-44,otherOwnerAdditions:remote.length,reviewedFKs:foreignKeys.length},
 migrations:[{name:'chat001-owned-storage.sql',status:'PLANNED_NOT_APPLIED',content:'chat-v1.sql CREATE blocks including journal bootstrap'},{name:'chat002-local-constraints.sql',status:'PLANNED_NOT_APPLIED',content:'chat-v1.sql ALTER blocks after copy/validation'},{name:'baseline044-chat-owner-additions',status:'PLANNED_NOT_APPLIED',content:'Owner-prefixed new tables in baseline for Identity/Core/Sales/Routing/AI/Workflow; skip Reporting/Connector which own separate databases'},{name:'baseline045-chat-reference-detach',status:'PLANNED_NOT_APPLIED',content:'13incoming constraints and shared inbox producer FK only; six non-Chat subtype constraints retained; T09 after new adapters ready'},{name:'connector006-owner-protocol',status:'PLANNED_NOT_APPLIED',content:'Connector subset of owner-additions-v1.sql in current Connector database'},{name:'reporting008-owner-protocol',status:'PLANNED_NOT_APPLIED',content:'Reporting subset in current Reporting database'}],
 physicalOwnerMap:Object.fromEntries(Object.keys(owners).map(o=>[o,{target:owners[o],deliveryPhysical:o==='chat'?'crm_chat':o==='connector'?'existing Connector private schema':o==='reporting'?'crm_reporting':'agentic_crm',note:'Same-owner transaction only; no extraction of other owners is implied; versions must still match preflight'}])),
 tables:tables.map(t=>({owner:t.owner,schema:t.schema,name:t.name,legacy:!!t.legacy,scope:t.scope,columns:t.columns,keys:t.keys,checks:t.checks,foreignKeys:t.fks,grants:grants(t)})),foreignKeys,
 partitions:{receiptRules,chatEvents,remoteEvents,chatConsumers,retainedConsumers,chatAudits,unknown:'NO_GO; only immutable audit may use signed per-row archive approval; no executable default owner'},
 artifacts:Object.fromEntries([...files].map(([p,s])=>[p,hash(s)]))};
files.set('manifest-v1.json',JSON.stringify(manifest,null,2)+'\n');
files.set('../chat-extraction-tables.md',dictionary);
for(const [file,content] of files){const path=`${root}/${file}`;if(check)assert.equal((await readFile(path,'utf8')).replaceAll('\r\n','\n'),content,`Drift: ${path}`);else{await mkdir(root,{recursive:true});await writeFile(path,content);}}
console.log(`PASS ${check?'drift':'generated'}: ${chat.length} Chat tables (${chat.length-44} beyond44 sources), ${remote.length} owner additions, ${foreignKeys.length} FK dispositions; DDL NOT_APPLIED`);
