import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {externalOpenApi} from '../apps/backend/dist/modules/external-api/openapi.js';
const file='docs/developer/openapi.json',text=JSON.stringify(externalOpenApi,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(await readFile(file,'utf8'),text,'OpenAPI artifact drift');else await writeFile(file,text);
const ajv=addFormats(new Ajv2020({strict:false,allErrors:true}));
const schemas=JSON.parse(JSON.stringify(externalOpenApi.components.schemas).replaceAll('#/components/schemas/','#/$defs/'));
for(const [name,schema]of Object.entries(schemas))ajv.compile({$defs:schemas,...schema});
const ids=new Set();let operations=0;
for(const [path,methods]of Object.entries(externalOpenApi.paths))for(const [method,op]of Object.entries(methods)){
 assert(!ids.has(op.operationId));ids.add(op.operationId);operations++;
 for(const name of [...path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))assert(op.parameters?.some(p=>p.in==='path'&&p.name===name&&p.required));
 assert(op.security?.length);
 if(op.requestBody)ajv.compile({$defs:schemas,...JSON.parse(JSON.stringify(op.requestBody.content['application/json'].schema).replaceAll('#/components/schemas/','#/$defs/'))});
 for(const r of Object.values(op.responses))if(r.content)ajv.compile({$defs:schemas,...JSON.parse(JSON.stringify(r.content['application/json'].schema).replaceAll('#/components/schemas/','#/$defs/'))});
}
console.log(`PASS External OpenAPI 3.1: ${operations} operations; components, request/response schemas compile; artifact ${process.argv.includes('--check')?'matches':'generated'}.`);
