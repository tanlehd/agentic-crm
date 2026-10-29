import {writeFile} from 'node:fs/promises';
import {loadMainPreflight,mainFacts} from './lib/chat-main-preflight.mjs';
import {partition} from './lib/chat-data-partition.mjs';
import {eventCodec} from './lib/chat-events.mjs';
import {mainAudit} from './lib/chat-main-audits.mjs';
const snapshot=await loadMainPreflight(),facts=mainFacts(snapshot),codec=await eventCodec(),groups=new Map();
for(const table of ['audit_entry','idempotency_record','outbox_event','consumer_inbox'])for(const row of snapshot.rows[table]){
 let result=partition(table,table==='outbox_event'?{...row,payload:JSON.parse(row.payload)}:row,facts);
 if(table==='audit_entry'&&result.disposition==='NO_GO')result=mainAudit(row,facts)??result;
 let validation=result.disposition==='NO_GO'?'unclassified':'valid';
 if(table==='outbox_event'&&validation==='valid')try{codec.validate(row,result.owner);}catch{validation='event-schema-invalid';}
 const family=table==='audit_entry'?row.resource_type+':'+row.action:table==='outbox_event'?row.event_type+':v'+row.schema_version:table==='consumer_inbox'?row.consumer_name:row.route_key.replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/gi,'{id}');
 const key=JSON.stringify([table,family,row.status??row.outcome,result.owner,result.disposition,result.reason,validation]);
 const group=groups.get(key)??{table,family,state:row.status??row.outcome,owner:result.owner,disposition:result.disposition,reason:result.reason,validation,count:0};group.count++;groups.set(key,group);
}
const families=[...groups.values()],report={purpose:'diagnostic-only',sourceVersion:43,passed:families.every(g=>g.validation==='valid'),classified:families.filter(g=>g.validation==='valid').reduce((n,g)=>n+g.count,0),unresolved:families.filter(g=>g.validation!=='valid').reduce((n,g)=>n+g.count,0),families};
await writeFile('artifacts/chat-extraction/t09-20261026/main-partition-review.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,classified:report.classified,unresolved:report.unresolved,unresolvedFamilies:families.filter(g=>g.validation!=='valid')},null,2));
