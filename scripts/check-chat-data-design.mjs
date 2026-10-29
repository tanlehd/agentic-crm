// Structural, metadata and source-drift checks only; not a MySQL parser/DB test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {currentSourcePath} from './lib/repository-paths.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const m=await read('docs/data/chat-extraction/manifest-v1.json'),s=await read('docs/data/chat-extraction/source-v42.json');
const sha=x=>createHash('sha256').update(x).digest('hex');
const ownership=await read('docs/architecture/chat-storage-review.json');
assert.equal(m.applied,false);assert.equal(m.designOnly,true);assert.equal(m.sourceVersion,42);
assert.deepEqual(m.tables.filter(t=>t.legacy).map(t=>t.name).sort(),[...ownership.owners.chat,...ownership.owners.partition].sort());
assert.equal(new Set(m.tables.map(t=>t.schema+'.'+t.name)).size,m.tables.length);
assert.equal(m.tables.filter(t=>t.owner==='chat').length,59);assert.equal(m.tables.filter(t=>t.owner!=='chat').length,58);
const template=await readFile('docs/data/chat-extraction-tables.md','utf8');
assert.equal((template.match(/^## crm_/gm)||[]).length,m.tables.length);
for(const t of m.tables){
 const label=t.schema+'.'+t.name,columns=new Map(t.columns.map(c=>[c.name,c]));
 assert.equal(columns.size,t.columns.length,label);const tenant=columns.get('tenant_id');
 assert(tenant&&!tenant.nullable&&tenant.default==null,label+' tenant');assert.match(tenant.type,/char\(36\).*ascii_bin/i);
 assert(t.checks.some(c=>c.includes('tenant_id')),label+' explicit scope');
 for(const k of t.keys){assert(k.name.length<=64);for(const c of k.columns)assert(columns.has(c.name),label+' index column '+c.name);}
 const pk=t.keys.find(k=>k.name==='PRIMARY');assert(pk,label+' primary key');
 if(!t.legacy)assert.equal(pk.columns[0].name,'tenant_id',label+' tenant primary');
 else {
  const old=s.tables.find(x=>x.name===t.name);assert.equal(t.columns.length,old.columns.length,label+' no dropped columns');
  for(const c of old.columns){const d=columns.get(c.name);assert(d);assert.equal(d.nullable,c.nullable==='YES');assert.equal(d.default,c.default_value);assert(d.type.toLowerCase().startsWith(c.type));assert.equal(d.generated,c.generation_expression.replaceAll("\\'","'"));}
 }
 for(const f of t.foreignKeys){
  const parent=m.tables.find(x=>x.schema===t.schema&&x.name===f.target_table);assert(parent,label+' local FK');assert.equal(parent.owner,t.owner,label+' no cross-owner FK');
  assert.equal(f.columns[0].source_column,'tenant_id');assert.equal(f.columns[0].target_column,'tenant_id');
  for(const c of f.columns){assert(columns.has(c.source_column));assert(parent.columns.some(x=>x.name===c.target_column));}
  assert(parent.keys.some(k=>k.unique&&k.columns.map(c=>c.name).join()===f.columns.map(c=>c.target_column).join()),label+' FK references exact unique key');
 }
 for(const r of ['api','worker'])assert(!t.grants[r].some(x=>['CREATE','ALTER','DROP','TRUNCATE','REFERENCES'].includes(x)),label+' runtime DDL');
 if(t.name==='schema_migration'||t.name==='chat_writer_gate')assert.deepEqual(t.grants.api,['SELECT']);
}
assert.equal(m.foreignKeys.length,75);
assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(m.foreignKeys,x=>x.disposition)).map(([k,v])=>[k,v.length])),{
 'detach-incoming-before-cutover':13,'retain-non-chat-subtype-in-baseline':6,'replace-outgoing-with-owner-reference':19,'local-after-row-partition-validation':36,'replace-inbox-producer-fk':1
});
assert.equal(m.tables.find(t=>t.name==='consumer_inbox').foreignKeys.length,0);
for(const t of m.tables.filter(t=>t.name.endsWith('_event_stream'))){const pk=t.keys[0].columns.map(c=>c.name);assert(pk.includes('aggregate_type')&&pk.includes('aggregate_id'));}
for(const [file,digest] of Object.entries(m.artifacts)){
 const text=(await readFile('docs/data/chat-extraction/'+file,'utf8')).replaceAll('\r\n','\n');assert.equal(sha(text),digest,file+' checksum');
 assert(!/FOREIGN_KEY_CHECKS|DROP TABLE|TRUNCATE TABLE|CREATE DATABASE|GRANT ALL|GRANT OPTION/i.test(text.replace(/^--.*$/gm,'')),file+' unsafe blanket operation');
 // Lexical balance catches malformed generated clauses, but is not native SQL validation.
 let depth=0,quoted=false,identifier=false;
 for(let i=0;i<text.length;i++){
  if(!quoted&&!identifier&&text.slice(i,i+2)==='--'){i=text.indexOf('\n',i);if(i<0)break;continue;}
  const c=text[i];if(c==="'"&&!identifier){if(quoted&&text[i+1]==="'"){i++;continue;}quoted=!quoted;}
  else if(c==='`'&&!quoted)identifier=!identifier;
  else if(!quoted&&!identifier){if(c==='(')depth++;if(c===')')depth--;assert(depth>=0,file+' parentheses');}
 }assert.equal(depth,0,file);assert(!quoted&&!identifier,file+' literal');
}
for(const [file,digest] of Object.entries(s.sourceHashes))assert.equal(sha(await readFile(currentSourcePath(file))),digest,'Audited source changed: '+file);
console.log(`PASS static design: ${m.tables.length} table templates,59Chat/58owner additions,75FK dispositions,${Object.keys(s.sourceHashes).length} source hashes, scope/keys/grants/DDL lexical checks. MySQL parser/application/EXPLAIN NOT_RUN.`);
