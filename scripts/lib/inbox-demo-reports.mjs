import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inboxDemoDashboards} from '../../services/reporting/dist/inbox-demo.js';
export async function saveInboxDashboards({url,headers,binding,generation,ids={},persist=async()=>{}}){
 const call=async(path,method='GET',body,extra={})=>{const r=await fetch(url+'/api/v1/reporting/'+path,{method,headers:{...headers,'content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b.data;};
 const results=[];
 for(const [i,document]of inboxDemoDashboards(binding,generation).entries()){
  let saved;if(ids[i]){const existing=await call('definitions/'+ids[i]);assert.deepEqual(existing.definition.kind,'dashboard');saved=JSON.stringify(existing.definition)===JSON.stringify(document.definition)&&existing.name===document.name?existing:await call('definitions/'+ids[i],'PATCH',document,{'Idempotency-Key':randomUUID(),'If-Match':`"${existing.revision}"`});}
  else {saved=await call('definitions','POST',document,{'Idempotency-Key':binding.slice(0,-1)+i});ids[i]=saved.id;await persist(ids);}
  const reopened=await call('definitions/'+saved.id);assert.deepEqual(reopened.definition,document.definition);
  const widgets=[];for(const widget of document.definition.widgets){const result=await call('query','POST',{definition:widget.definition,generation:widget.generation});assert.equal(result.snapshotId,generation);assert.deepEqual(result.warnings,[]);widgets.push({id:widget.id,totals:result.totals,rows:result.rows});}
  results.push({id:saved.id,revision:saved.revision,...document,widgets});
 }
 assert.equal(results[0].widgets[0].totals.ops_received,'50');assert.equal(results[0].widgets[0].totals.ops_accepted,'30');assert.equal(results[0].widgets[0].totals.ops_queued,'20');
 assert.equal(results[1].widgets[0].totals.adq_lead_rate,'20.000000');assert.equal(results[1].widgets.at(-1).totals.adq_cpl,'170000.000000');
 return results;
}
