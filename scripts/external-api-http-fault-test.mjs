import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {ExternalController,ExternalRuntime} from '../services/core-baseline/dist/modules/external-api/http.js';
import {AuthRuntime} from '../services/core-baseline/dist/modules/identity/auth/http.js';
import {safeJsonBody} from '../services/core-baseline/dist/kernel/http/json-body.js';
const require=createRequire(new URL('../services/core-baseline/package.json',import.meta.url)),{Module}=require('@nestjs/common'),{NestFactory}=require('@nestjs/core');
const sentinel='synthetic-secret-must-not-be-returned';
class FaultModule{}
Module({controllers:[ExternalController],providers:[{provide:AuthRuntime,useValue:{}},{provide:ExternalRuntime,useValue:{ready:async()=>{throw Error('DB unavailable '+sentinel);}}}]})(FaultModule);
const app=await NestFactory.create(FaultModule,{logger:false,bodyParser:false});safeJsonBody(app);app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');const origin=await app.getUrl();
try{
 const res=await fetch(origin+'/api/v1/external/scopes',{headers:{Authorization:'Bearer '+sentinel}});assert.equal(res.status,503);assert.equal(res.headers.get('cache-control'),'no-store');const text=await res.text(),body=JSON.parse(text);assert(!text.includes(sentinel));assert.equal(body.error.code,'TEMPORARILY_UNAVAILABLE');assert.equal(body.error.retryable,true);assert(body.meta.correlation_id);
 const malformed=await fetch(origin+'/api/v1/external-apps',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"secret":"'+sentinel});assert.equal(malformed.status,400);assert(!(await malformed.text()).includes(sentinel));
 const huge=await fetch(origin+'/api/v1/external-apps',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:sentinel,huge:'x'.repeat(110000)})});assert.equal(huge.status,400);assert(!(await huge.text()).includes(sentinel));
 await mkdir('artifacts/external-api',{recursive:true});await writeFile('artifacts/external-api/http-faults.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),groups:3,environment:'isolated ephemeral HTTP server, injected DB initialization failure; no live dependency stopped',checks:['dependency initialization failure returns safe503/correlation/no-store','malformed JSON400 never echoes credential fragments','oversized JSON400 never echoes request data']},null,2));console.log('PASS 3 isolated HTTP fault groups; real HTTP parser/controller, injected dependency failure.');
}finally{await app.close();}
