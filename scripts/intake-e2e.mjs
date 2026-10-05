import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID,createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory='artifacts/SRC-015';
const fixtureId=alias=>{const h=createHash('sha256').update(`agentic-crm:identity-fixture:v1:${alias}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
try{
  const env=parseEnv(await readFile('.env','utf8')),origin=new URL(env.APP_ORIGIN);
  if(env.APP_ENV!=='development'||env.MYSQL_DATABASE!=='agentic_crm'||origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname)||origin.username||origin.password)throw new Error('Local only');
  const request=async(label,path,body,extra={})=>{
    const res=await fetch(`${origin.origin}/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Connection-Id':fixtureId(`${label}:mock_connection`),Authorization:`Bearer ${env[`MOCK_${label.toUpperCase()}_TOKEN`]}`,...extra},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
    return {status:res.status,body:await res.json()};
  };
  const wait=async(label,id)=>{for(let i=0;i<60;i++){const r=await request(label,`integrations/deliveries/${id}`);assert.equal(r.status,200);if(r.body.data.status==='failed')throw new Error('Delivery failed');if(r.body.data.status==='processed')return r.body.data;await new Promise(r=>setTimeout(r,250));}throw new Error('Worker timeout');};
  const tag=randomUUID(),body={provider_event_id:`synthetic-e2e-${tag}`,provider_message_id:`synthetic-message-${tag}`,external_subject_id:`synthetic-subject-${tag}`,display_label:'SRC015 Synthetic demo',occurred_at:new Date().toISOString(),message:{type:'text',text:'Synthetic Messenger intake demo'},referral:{source:'ctm',ad_id:'synthetic-ad',campaign_id:'synthetic-campaign'}};
  const ack=await request('alpha','integrations/mock-messenger/deliveries',body);assert.equal(ack.status,202);assert.equal(ack.body.data.status,'received');const first=await wait('alpha',ack.body.data.delivery_id);assert.equal(first.attribution,'ctm');assert.equal(first.duplicate,false);
  const replay=await request('alpha','integrations/mock-messenger/deliveries',body);assert.equal(replay.status,202);assert.deepEqual(replay.body.data,ack.body.data);
  const conflict=await request('alpha','integrations/mock-messenger/deliveries',{...body,message:{type:'text',text:'Synthetic conflicting payload'}});assert.equal(conflict.status,409);
  const duplicate=await request('alpha','integrations/mock-messenger/deliveries',{...body,provider_event_id:`duplicate-${tag}`,external_subject_id:`other-${tag}`});assert.equal(duplicate.status,202);const duplicateResult=await wait('alpha',duplicate.body.data.delivery_id);assert.equal(duplicateResult.duplicate,true);assert.equal(duplicateResult.message_id,first.message_id);assert.equal(duplicateResult.conversation_id,first.conversation_id);
  const {referral,...missingReferral}=body;const next=await request('alpha','integrations/mock-messenger/deliveries',{...missingReferral,provider_event_id:`plain-${tag}`,provider_message_id:`plain-message-${tag}`});assert.equal(next.status,202);const plain=await wait('alpha',next.body.data.delivery_id);assert.equal(plain.attribution,'unknown');assert.equal(plain.conversation_id,first.conversation_id);assert.notEqual(plain.message_id,first.message_id);
  const beta=await request('beta','integrations/mock-messenger/deliveries',body);assert.equal(beta.status,202);const betaResult=await wait('beta',beta.body.data.delivery_id);assert.notEqual(betaResult.conversation_id,first.conversation_id);
  assert.equal((await request('beta',`integrations/deliveries/${first.id}`)).status,404);
  assert.equal((await request('alpha','integrations/mock-messenger/deliveries',body,{'X-Tenant-Id':fixtureId('clinic_beta')})).status,403);
  assert.equal((await request('alpha','integrations/mock-messenger/deliveries',body,{'X-Connection-Id':fixtureId('beta:mock_connection')})).status,401);
  const facts={status:'PASS',checks:['durable ACK','real worker processed','event replay','payload conflict','message dedup','missing referral','tenant namespace','cross-tenant denial','credential binding'],deliveries:{alpha:first.id,duplicate:duplicateResult.id,plain:plain.id,beta:betaResult.id},conversations:{alpha:first.conversation_id,beta:betaResult.conversation_id},synthetic_records_retained:true};
  await mkdir(directory,{recursive:true});await writeFile(`${directory}/e2e-facts.json`,JSON.stringify(facts,null,2)+'\n');console.log('PASS mock intake HTTP → real worker, replay/conflict/dedup/referral/tenant checks. Synthetic records retained.');
}catch{console.error('INTAKE_E2E_FAILED: inspect local service status and sanitized delivery state.');process.exitCode=1;}
