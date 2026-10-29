import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,generateKeyPairSync,randomUUID} from 'node:crypto';
import {composeChat,mergeChatRoutes,scopeChatRoutes} from '../../services/chat/dist/composition.js';
import {runtimeUrls,retainedCursorKeys} from '../../services/chat/dist/runtime-config.js';
import {assertOwnGrants} from '../../services/chat/dist/runtime-checks.js';
import {reviewChatGaps} from '../lib/chat-scope-review.mjs';
import {workloadDeadline} from '../../packages/workload-transport/dist/workload-tls.js';
import {ChatWorker} from '../../services/chat/dist/worker.js';

test('composed ingress budget leaves dispatch and registry fail-closed deadlines unchanged',()=>{
 for(const path of ['/internal/v1/chat-exchange/ingress-accept','/internal/v1/chat-exchange/ingress-read'])assert.equal(workloadDeadline(path),10000);
 for(const path of ['/internal/v1/dispatch/connector-begin','/internal/v1/workloads/admit','/internal/v1/chat-exchange/payload-put','/internal/v1/chat-exchange/connector-cancel','/internal/v1/chat-exchange/ingress-read/'])assert.equal(workloadDeadline(path),2000);
 assert.equal(workloadDeadline('/internal/v1/owners/chat/workspace-conversations'),10000);
});

test('failed scanner does not starve local consumers and stopped worker starts no new work',async()=>{
 const seen=[],runtime={outbound:{tick:async()=>{seen.push('outbound');throw new Error('offline');}},workspace:{tick:async()=>{seen.push('snooze');}},events:{tick:async()=>{seen.push('events');return {acknowledged:2};}}};
 const worker=new ChatWorker(runtime,{tenants:[randomUUID()],workerJobs:['outbound','snooze','events']});
 await worker.tick();assert.deepEqual(seen,['outbound','snooze','events']);assert.equal(worker.metrics.lastSuccess,0);assert.equal(worker.metrics.failures,1);assert.equal(worker.metrics.eventsAcknowledged,2);
 worker.stop();await worker.tick();assert.equal(seen.length,3);
});

test('runtime refuses foreign schema, wildcard, role and privileged grants',()=>{
 assertOwnGrants(['GRANT USAGE ON *.* TO `chat`@`%`','GRANT SELECT, INSERT, UPDATE ON `crm_chat`.`message` TO `chat`@`%`'],'crm_chat');
 for(const grant of ['GRANT SELECT ON *.* TO `chat`@`%`','GRANT SELECT ON `agentic_crm`.* TO `chat`@`%`','GRANT ALL PRIVILEGES ON `crm_chat`.* TO `chat`@`%`','GRANT SELECT ON `crm_chat`.* TO `chat`@`%` WITH GRANT OPTION','GRANT `operator`@`%` TO `chat`@`%`'])assert.throws(()=>assertOwnGrants([grant],'crm_chat'));
});
test('runtime URLs require exact owner and workload protocol with no embedded credential',()=>{
 assert.equal(runtimeUrls({identity:'http://127.0.0.1:1234/'},'http:').identity.port,'1234');
 for(const raw of [null,[],{unknown:'http://localhost/'},{identity:'https://localhost/'},{identity:'http://name:secret@localhost/'},{identity:'http://localhost/path'},{identity:'http://localhost/?secret=1'}])assert.throws(()=>runtimeUrls(raw,'http:'));
});
test('retained cursor configuration never generates missing or malformed keys',()=>{
 const raw=Object.fromEntries(['history','catalog','workspace','activity','external'].map(k=>[k,'ab'.repeat(32)]));assert.equal(retainedCursorKeys(raw).external.toString('hex'),raw.external);
 for(const value of [null,{...raw,external:undefined},{...raw,history:'short'},{...raw,extra:'ab'.repeat(32)}])assert.throws(()=>retainedCursorKeys(value));
});
test('runtime rejects duplicate routes and scopes requests without mutating original handlers',async()=>{
 const tenant=randomUUID(),other=randomUUID(),route={validate:v=>v,callers:['chat'],handle:async()=>({})};
 assert.throws(()=>mergeChatRoutes({'/x':route},{'/x':route}),/DUPLICATE/);
 const scoped=scopeChatRoutes({'/x':route},[tenant]);assert.equal(scoped['/x'].validate({tenant_id:tenant}).tenant_id,tenant);
 await assert.rejects(scoped['/x'].handle({tenant_id:other},{service:'chat'},new AbortController().signal),e=>e.code==='FORBIDDEN');assert.equal(route.validate({tenant_id:other}).tenant_id,other);
});
test('actual composition covers Chat scope without mounting other-owner proposals',async()=>{
 const material={service:'chat',ca:'',cert:'',key:'',localHttp:{chat:randomBytes(32).toString('hex')}},url=new URL('http://127.0.0.1:1234/');
 const {publicKey}=generateKeyPairSync('ed25519'),registry={url:new URL('/internal/v1/workloads/admit',url),keyId:'synthetic',publicKey:publicKey.export({type:'spki',format:'pem'})};
 const config={epoch:'1',tenants:[randomUUID()],owners:Object.fromEntries(['identity','crm','connector','routing'].map(o=>[o,url])),dispatch:{identity:url,connector:url},receivers:{},cursors:Object.fromEntries(['history','catalog','workspace','activity','external'].map(k=>[k,Buffer.alloc(32,1)]))};
 const runtime=composeChat({},material,registry,config),paths=Object.keys(runtime.routes),operations=new Set(paths.map(p=>p.split('/').at(-1)));
 const catalog=JSON.parse(await readFile('docs/architecture/chat-owner-operations.json','utf8'));assert.deepEqual(reviewChatGaps(catalog,operations).boundaryReviewGroups,[]);
 for(const absent of ['recover-need','contribution-apply','snapshot-page','record-batch','conversion-facts'])assert(!operations.has(absent));
 for(const required of ['ingress-accept','ingress-read','chat-claim','chat-claim-proof','connector-result','event-deliver','event-status','external-prepare','runtime-capabilities'])assert(operations.has(required));
 assert.equal(paths.length,88);
});
