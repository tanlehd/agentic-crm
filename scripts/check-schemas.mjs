import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { sourceFiles } from './source-files.mjs';

const paths = (await sourceFiles('packages/contracts/schemas')).filter(p => p.endsWith('.json'));
if (!paths.length) throw new Error('No contract schemas found');
const compilers = new Map([
  ['http://json-schema.org/draft-07/schema#', addFormats(new Ajv({ strict: true, allErrors: true }))],
  ['https://json-schema.org/draft/2020-12/schema', addFormats(new Ajv2020({ strict: true, allErrors: true }))],
]);
const ids = new Set();
const schemas = [];
for (const path of paths) {
  const schema = JSON.parse(await readFile(path, 'utf8'));
  const compiler = compilers.get(schema.$schema);
  if (!compiler) throw new Error(`Unsupported/missing schema dialect: ${path}`);
  const id = schema.$id || path;
  if (ids.has(id)) throw new Error(`Duplicate schema id: ${path}`);
  ids.add(id);
  compiler.addSchema(schema, id);
  schemas.push([compiler, id]);
}
for (const [compiler, id] of schemas) compiler.getSchema(id);
console.log(`PASS: ${paths.length} JSON schemas validate and compile with strict Ajv.`);
