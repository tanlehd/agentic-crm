// Fault fixture: terminate after durable admission/start, forfeiting the live sender continuation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {AttemptStore} from '../../services/crm-connector/dist/attempt-store.js';
import {workloadMaterial,registryConfig,remoteRegistryAuthority,workloadRequest} from '../../packages/workload-transport/dist/index.js';
assert.equal(process.env.APP_ENV,'test');assert.equal(process.env.CONNECTOR_DB_NAME,'native_connector_test');
const chunks=[];for await(const c of process.stdin)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks));
const saved=JSON.parse(await readFile('.local/chat-dispatch-claim-fixture.json','utf8'));
const require=createRequire(new URL('../../services/crm-connector/package.json',import.meta.url));
const pool=require('mysql2/promise').createPool({host:'127.0.0.1',port:13306,database:'native_connector_test',user:'dispatch_connector_test',password:saved.password,timezone:'Z',supportBigNumbers:true,bigNumberStrings:true});
const store=new AttemptStore(pool),material=await workloadMaterial('connector'),authority=remoteRegistryAuthority(material,await registryConfig());
const started=await store.beginAuthorized(input.binding.tenant_id,input);assert.ok(started.live);
const info=store.admissionInfo(started.live);
const consumed=await workloadRequest(material,authority,{url:new URL('/internal/v1/dispatch/identity-consume',process.env.WORKLOAD_IDENTITY_URL),expectedService:'identity',tenant:input.binding.tenant_id,data:{...input,operation:'identity-consume',request_id:randomUUID(),fence_id:info.fence}});assert.equal(consumed.state,'consumed');
await store.startLive(started.live);
// No payload take, provider call or result. process exit abandons the one-use continuation.
process.stdout.write(JSON.stringify({fence:info.fence}));process.exit(0);
