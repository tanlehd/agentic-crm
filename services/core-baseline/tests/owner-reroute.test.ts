import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import type {OwnerCommandBinding} from '@agentic-crm/contracts';
import {ownerBindingDigest,ownerDigest,routingRerouteBinding,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import {lockedRerouteJob,rerouteJob,rerouteRoute} from '../src/modules/agents/owner-reroute-journal.js';
import {rerouteCommand} from '../src/modules/agents/owner-reroute.js';

function fixture(){
 const tenant=randomUUID(),command=randomUUID(),work=randomUUID(),actor={kind:'human' as const,principal_id:randomUUID(),delegation_id:randomUUID()},queue=randomUUID();
 const input:OwnerCommandRequest={schema_version:1,tenant_id:tenant,command_id:command,request_id:randomUUID(),correlation_id:randomUUID(),operation:'routing-reroute',actor,payload:{resource:{resource_id:randomUUID(),object_key:'conversation',record_version:'5',owner_revision:'3',control_revision:'4',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:{principal_id:actor.principal_id,kind:'human',team_id:randomUUID()},session_id:randomUUID(),pin:{work_id:work,work_version:'7',queue_version_id:randomUUID()}}};
 const saved={child:input,body:{work_id:work,queue_id:queue,owner_principal_id:actor.principal_id},version:'7',correlation:input.correlation_id};
 const parent:OwnerCommandBinding={tenant_id:tenant,command_id:command,owner:'routing',operation:'human-routing-reroute',actor,resource:{resource_id:work,object_key:'routing_work',record_version:'7',owner_revision:'0',control_revision:'0',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},target:null,session_id:null,fields:[],payload_digest:ownerDigest(saved),legacy_receipt_key:command,graph:null,dependencies:[]};
 const row={command_id:command,operation:'reroute',binding_digest:ownerBindingDigest(parent),binding_json:parent,request_json:saved,legacy_request_hash:ownerDigest({body:saved.body,version:saved.version})} as unknown as RowDataPacket;
 return {tenant,input,row,saved,binding:routingRerouteBinding(input).binding};
}
describe('Native reroute immutable child and receipt journal',()=>{
 it('accepts terminal dependency receipts while retaining the immutable child pin',async()=>{
  const f=fixture(),c={execute:async()=>[[f.row]]} as unknown as PoolConnection;
  const terminal={...f.binding,dependencies:[{owner:'routing' as const,receipt_id:randomUUID(),binding_digest:ownerBindingDigest(f.binding)}]};
  expect(await lockedRerouteJob(c,f.tenant,terminal)).toBe(f.row);
  await expect(lockedRerouteJob(c,f.tenant,{...terminal,routing_reroute:{...f.binding.routing_reroute!,queue_version_id:randomUUID()}})).rejects.toThrow('FORBIDDEN');
 });
 it('rejects changed target, version or actor in a saved child',()=>{
  for(const field of ['version','actor','target']){
   const f=fixture();if(field==='version')f.saved.version='8';else if(field==='actor')f.saved.child.actor.principal_id=randomUUID();else (f.saved.child.payload.target as {principal_id:string}).principal_id=randomUUID();
   expect(()=>rerouteJob(f.tenant,f.row)).toThrow('CONFLICT');
  }
 });
 it('cannot turn the internal endpoint into an arbitrary service or AI assignment',()=>{
  const f=fixture();expect(()=>routingRerouteBinding({...f.input,actor:{...f.input.actor,kind:'service'}})).toThrow('FORBIDDEN');
  expect(()=>routingRerouteBinding({...f.input,payload:{...f.input.payload,target:{principal_id:randomUUID(),kind:'ai',team_id:randomUUID()}}})).toThrow('INVALID_REQUEST');
 });
 it('scopes deterministic public keys by tenant and Human',()=>{
  const f=fixture(),key='repeat';expect(rerouteCommand(f.tenant,f.input.actor.principal_id,key)).toBe(rerouteCommand(f.tenant,f.input.actor.principal_id,key));
  expect(rerouteCommand(randomUUID(),f.input.actor.principal_id,key)).not.toBe(rerouteCommand(f.tenant,f.input.actor.principal_id,key));
  expect(rerouteCommand(f.tenant,randomUUID(),key)).not.toBe(rerouteCommand(f.tenant,f.input.actor.principal_id,key));expect(rerouteRoute).toBe('POST /api/v1/human-routing/reroute');
 });
});
