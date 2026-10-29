// Materialize reviewed, unapplied T02 design into service-owned immutable inputs.
// Existing files are never regenerated silently. No database connection.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='services/chat/migrations';
const manifest=JSON.parse(await readFile('docs/data/chat-extraction/manifest-v1.json','utf8'));
const ddl=(await readFile('docs/data/chat-extraction/chat-v1.sql','utf8')).replaceAll('\r\n','\n');
const creates=ddl.match(/CREATE TABLE [\s\S]*?;\n/g), alters=ddl.match(/ALTER TABLE .*;\n/g);
assert.equal(creates.length,59);assert.equal(alters.length,43);
const files={
 'chat001-owned-storage.sql':creates.join('\n'),
 'chat002-local-constraints.sql':alters.join(''),
 'dictionary.json':JSON.stringify({lineage:manifest.targetLineage,systemTenant:manifest.systemTenant,tables:manifest.tables.filter(t=>t.owner==='chat')},null,2)+'\n'
};
const hashes=Object.fromEntries(Object.entries(files).map(([p,v])=>[p,createHash('sha256').update(v).digest('hex')]));
hashes['mysql84-metadata.json']=createHash('sha256').update((await readFile(`${root}/mysql84-metadata.json`,'utf8')).replaceAll('\r\n','\n')).digest('hex');
files['checksums.json']=JSON.stringify(hashes,null,2)+'\n';
await mkdir(root,{recursive:true});
for(const [file,body] of Object.entries(files)){
 try{assert.equal((await readFile(`${root}/${file}`,'utf8')).replaceAll('\r\n','\n'),body,`IMMUTABLE_MIGRATION_DRIFT ${file}`);}
 catch(e){if(e.code!=='ENOENT')throw e;await writeFile(`${root}/${file}`,body,{flag:'wx'});}
}
console.log('PASS reviewed Chat migration inputs frozen; no database access');
