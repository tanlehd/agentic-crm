import fs from 'node:fs';
import assert from 'node:assert/strict';
const schemas=JSON.parse(fs.readFileSync('docs/contracts/marketing-authority-v1.schema.json','utf8'));
const profile=JSON.parse(fs.readFileSync('docs/data/marketing-metadata-profile.json','utf8'));
const output='// Generated from reviewed Marketing contracts; do not hand edit.\nexport const authoritySchema = '+JSON.stringify(schemas,null,2)+';\nexport const metadataProfile = '+JSON.stringify(profile,null,2)+';\n';
const file='services/core-baseline/src/modules/channels/marketing-contract.generated.ts';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file,'utf8'),output);else fs.writeFileSync(file,output);
console.log('PASS Marketing runtime contract generation');
