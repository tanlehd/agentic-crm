import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory='docs/references/meta/2026-10-07-marketing';
const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const documents=new Map();
for(const source of manifest.sources){
 assert.equal(source.status,'DOWNLOADED');assert.equal(new URL(source.url).hostname,'developers.facebook.com');
 const bytes=await readFile(directory+'/'+source.file),raw=await readFile(directory+'/'+source.raw_file);
 assert.equal(bytes.length,source.bytes);assert.equal(hash(bytes),source.sha256);
 assert.equal(raw.length,source.raw_bytes);assert.equal(hash(raw),source.raw_sha256);
 const body=raw.toString('utf8').match(/<pre[^>]*data-testid="developer-docs-markdown-page"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
 assert(body,'official Markdown envelope');
 const decoded=body.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,e)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e.toLowerCase()]));
 assert.equal(decoded,bytes.toString('utf8'));assert(decoded.startsWith('# '));
 documents.set(source.file,decoded.split('\n'));
}
const selection=JSON.parse(await readFile('docs/data/marketing-field-selection.json','utf8'));
const keys=new Set();
for(const field of selection.fields){
 const key=field.entity+'.'+field.crm_field;assert(!keys.has(key));keys.add(key);
 assert(documents.get(field.source_file)?.[field.source_line-1]?.startsWith('| `'+field.provider_field+'`'),key);
 assert(field.provider_type);assert.equal(field.verification,'official-documentation-only; live field coverage NOT_RUN');
}
console.log(`PASS ${documents.size} official Markdown/raw checksum and extraction pairs; ${keys.size} unique selected field traces`);
