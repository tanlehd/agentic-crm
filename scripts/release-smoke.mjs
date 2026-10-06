import { mkdtemp,readFile,writeFile,mkdir,open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { releaseDemo } from './release-demo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'agentic-crm-release-'));
const artifacts=resolve(process.env.RELEASE_ARTIFACT_DIR||join(root,'artifacts/SRC-025'));
await mkdir(artifacts,{recursive:true});const log=await open(join(artifacts,'release-compose.log'),'w');
const backend=process.env.RELEASE_BACKEND_IMAGE||'agentic-crm-src025-backend:local',web=process.env.RELEASE_WEB_IMAGE||'agentic-crm-src025-web:local',baseline=process.env.RELEASE_M1_IMAGE||'agentic-crm-src025-m1:local';
let env,stage='configuration';const projects=[],platforms={};
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{cwd:directory,env,stdio:['ignore',log.fd,log.fd],timeout:360000,...options});if(r.error||r.status!==0)throw new Error(`RELEASE_COMMAND_FAILED:${cmd}:${args[0]}`);return r.stdout;};
const compose=(...args)=>run('docker',['compose',...args]);
async function configure(label,image){
 const project=`agentic-crm-release-${label}-${process.pid}`;projects.push(project);
 const override=join(directory,`${label}.json`),services={};
 for(const name of ['api','worker','migrate','db-grants','db-provision'])services[name]={image,platform:platforms[image],pull_policy:'never'};
 services.web={image:web,platform:platforms[web],pull_policy:'never'};services.gateway={ports:['127.0.0.1:18080:8080']};
 // !override port handling lives in a small checked-in Compose file.
 delete services.gateway;
 await writeFile(override,JSON.stringify({services}));
 env={...process.env,...parseEnv(await readFile(join(directory,'.env'),'utf8')),COMPOSE_PROJECT_NAME:project,COMPOSE_FILE:[join(root,'compose.yaml'),join(root,'compose.release-smoke.yaml'),override].join(':')};
 return override;
}
async function fixture(op){const body=await readFile(join(root,'scripts/release-fixture.mjs'),'utf8');const raw=run('docker',['compose','run','--rm','--no-deps','-T','-e','RELEASE_SMOKE=1','-e',`RELEASE_OPERATION=${op}`,'migrate','node','--input-type=module'],{input:body,stdio:['pipe','pipe',log.fd],encoding:'utf8'});return JSON.parse(raw);}
async function save(name,value){await writeFile(join(artifacts,name),JSON.stringify(value,null,2)+'\n');}
async function runtimeFacts(label){const facts={};for(const service of ['api','worker','web']){facts[service]=JSON.parse(run('docker',['compose','exec','-T',service,'node','-p','JSON.stringify({arch:process.arch,uid:process.getuid(),node:process.versions.node})'],{encoding:'utf8',stdio:['ignore','pipe',log.fd]}));assert.notEqual(facts[service].uid,0);assert.equal(facts[service].arch,platforms[service==='web'?web:backend].endsWith('/amd64')?'x64':'arm64');}await save(`${label}-runtime.json`,facts);}

const seeds=async()=>{for(const script of ['auth-provision.mjs','seed-dev.mjs','seed-registry.mjs','seed-m1.mjs'])run(process.execPath,[join(root,'scripts',script)]);};
try{
 run(process.execPath,[join(root,'scripts/env-init.mjs')]);const path=join(directory,'.env');await writeFile(path,(await readFile(path,'utf8')).replace('http://localhost:8080','http://localhost:18080'),{mode:0o600});
 const metadata=JSON.parse(run('docker',['image','inspect',backend,web,baseline],{encoding:'utf8',stdio:['ignore','pipe',log.fd]}));
 for(const [index,image]of metadata.entries()){platforms[[backend,web,baseline][index]]=`${image.Os}/${image.Architecture}`;assert.notEqual(image.Config.User,'');assert.notEqual(image.Config.User,'root');}
 await save('images.json',metadata.map(i=>({id:i.Id,tags:i.RepoTags,os:i.Os,arch:i.Architecture,user:i.Config.User})));
 stage='M1 historical startup';const override=await configure('upgrade',baseline);
 compose('up','-d','--no-build','--wait','mysql','redis','keycloak','gateway');compose('run','--rm','db-grants');
 stage='M1 provision and fixture';await seeds();await fixture('m1-records');const before=await fixture('snapshot');assert.equal(before.journal.length,8);await save('upgrade-before.json',before);
 stage='M1 to M2 migration';const content=JSON.parse(await readFile(override,'utf8'));for(const name of ['api','worker','migrate','db-grants','db-provision']){content.services[name].image=backend;content.services[name].platform=platforms[backend];}await writeFile(override,JSON.stringify(content));
 compose('run','--rm','db-grants');
 const after=await fixture('snapshot');assert.equal(after.journal.length,19);assert.deepEqual(after.journal.slice(0,8),before.journal);for(const [table,hash]of Object.entries(before.tables))if(table!=='schema_migration')assert.deepEqual(after.tables[table],hash,`Upgrade changed ${table}`);await save('upgrade-after.json',after);
 compose('run','--rm','--no-deps','migrate');assert.deepEqual(await fixture('snapshot'),after);
 stage='upgraded release health';compose('up','-d','--no-build','--wait','--wait-timeout','240');
 await runtimeFacts('upgrade');stage='upgraded browser demo';await releaseDemo({env,artifacts,prefix:'upgrade',run,root});
 // Freeze worker before measuring immutable persisted rows; restart MySQL and apps on same volumes.
 compose('stop','api','worker');const persisted=await fixture('snapshot');await save('restart-before.json',persisted);
 stage='whole stack restart';compose('stop');compose('start','mysql','redis','keycloak');
 // start --wait waits on old completed one-shots too on some Compose versions; use up topology.
 compose('up','-d','--no-build','--wait','--wait-timeout','240','mysql','redis','keycloak');const restarted=await fixture('snapshot');assert.deepEqual(restarted,persisted);await save('restart-after.json',restarted);
 compose('up','-d','--no-build','--wait','--wait-timeout','240');
 await releaseDemo({env,artifacts,prefix:'resume',run,root});
 compose('down');
 stage='cold current release';await configure('cold',backend);compose('up','-d','--no-build','--wait','--wait-timeout','240');await seeds();assert.equal((await fixture('snapshot')).journal.length,19);await runtimeFacts('cold');
 await releaseDemo({env,artifacts,prefix:'cold',run,root});
 await save('release-summary.json',{status:'PASS',historicalM1:'f575a8e',migration:'8->19',existingTablesPreserved:Object.keys(before.tables).length-1,wholeStackRestart:'all table hashes equal before worker resumed',projects,architecture:metadata[0].Architecture,credentialsDirectory:directory,retainedVolumes:projects.flatMap(p=>['mysql_data','redis_data','keycloak_data'].map(v=>`${p}_${v}`))});
 console.log('PASS: release upgrade/cold/OIDC/M2 demo/restart. Evidence: '+artifacts);
}catch(e){const code=e instanceof Error&&/^DEMO_[a-zA-Z0-9 _-]+$/.test(e.message)?e.message:'RELEASE_GATE_FAILED';console.error(`FAIL release gate at ${stage}: ${code}`);process.exitCode=1;await save('release-failure.json',{status:'FAIL',stage,code:'RELEASE_GATE_FAILED',projects,credentialsDirectory:directory});}
finally{if(env){try{compose('down');}catch{process.exitCode=1;console.error('RELEASE_CLEANUP_FAILED');}}await log.close();}
