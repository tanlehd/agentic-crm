import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
// Parse privately: rendered Compose contains secrets, never print it.
for(const override of ['compose.host.yaml','compose.dev.yaml','compose.test.yaml']){
 const result=spawnSync('docker',['compose','-f','compose.yaml','-f',override,'config','--format','json'],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,'Compose config rejected');
 const {services,volumes}=JSON.parse(result.stdout);assert(!services.keycloak);assert(!volumes.keycloak_data);
 for(const name of ['api','db-grants']){assert(services[name].environment.MYSQL_AUTH_USER);assert(services[name].environment.MYSQL_AUTH_PASSWORD);assert(!services[name].environment.OIDC_CLIENT_SECRET);}
 for(const name of ['mysql','worker','web'])assert(!services[name].environment.MYSQL_AUTH_PASSWORD);
}
await writeFile('artifacts/SRC-038/compose.json',JSON.stringify({result:'PASS',overrides:3,providerRemoved:true,authSecretsRestricted:true}));console.log('PASS Compose native topology and auth credential boundaries');
