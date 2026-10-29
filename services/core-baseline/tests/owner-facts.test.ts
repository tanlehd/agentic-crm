import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {ownerDigest,validateOwnerValue,type OwnerCommandRequest} from '@agentic-crm/workload-transport';
import {NativeRoutingReplySource} from '../src/modules/agents/owner-facts.js';

const tenant=randomUUID(),session=randomUUID(),actor={kind:'human' as const,principal_id:randomUUID(),delegation_id:randomUUID()},from='2026-01-01T00:00:00.000Z';
const fact=()=>({id:randomUUID(),session_id:session,actor_id:randomUUID(),team_id:randomUUID(),recorded_at:'2026-01-02T00:00:00.123456Z'});
const result=(facts:unknown[],replies:unknown[]=[])=>({facts,replies,snapshot_digest:ownerDigest({facts,replies})});
describe('Routing remote reply source boundary',()=>{
 it('accepts the reviewed5000fact payload without widening request limits',()=>{
  const facts=Array.from({length:5000},fact),reply=result(facts);expect(JSON.stringify(reply).length).toBeGreaterThan(262144);
  expect(validateOwnerValue<{facts:unknown[]}>('OwnerRoutingReplySnapshot',reply).facts).toHaveLength(5000);
  expect(()=>validateOwnerValue('OwnerRoutingReplySnapshot',result([...facts,fact()]))).toThrow('INVALID_REQUEST');
 });
 it('rejects validly hashed foreign, duplicate and pre-window source facts',async()=>{
  const first=fact();for(const facts of [[{...first,session_id:randomUUID()}],[first,first],[{...first,recorded_at:'2025-12-31T23:59:59.999999Z'}]]){
   const source=new NativeRoutingReplySource(async()=>result(facts));await expect(source.replyFacts(tenant,actor,[session],from)).rejects.toThrow('FORBIDDEN');
  }
 });
 it('rejects digest mismatch, swapped mode and facts for empty selection',async()=>{
  const f=fact();for(const reply of [{...result([f]),snapshot_digest:'0'.repeat(64)},result([], [{principal_id:actor.principal_id,submitted_replies:1}])])await expect(new NativeRoutingReplySource(async()=>reply).replyFacts(tenant,actor,[session],from)).rejects.toThrow('FORBIDDEN');
  await expect(new NativeRoutingReplySource(async()=>result([f])).replies(tenant,actor,[session],from)).rejects.toThrow('FORBIDDEN');
  await expect(new NativeRoutingReplySource(async()=>result([], [{principal_id:actor.principal_id,submitted_replies:1}])).replies(tenant,actor,[],from)).rejects.toThrow('FORBIDDEN');
 });
 it('rejects repeated actors and invalid selection before sending',async()=>{
  const row={principal_id:actor.principal_id,submitted_replies:1};await expect(new NativeRoutingReplySource(async()=>result([],[row,row])).replies(tenant,actor,[session],from)).rejects.toThrow('FORBIDDEN');
  let called=false;await expect(new NativeRoutingReplySource(async()=>{called=true;return result([]);}).replyFacts(tenant,actor,[session,session],from)).rejects.toThrow('INVALID_REQUEST');expect(called).toBe(false);
 });
 it('preserves the historical DTO and transmits the delegated Human and UTC lower bound',async()=>{
  const f=fact();let request:OwnerCommandRequest|undefined;
  const source=new NativeRoutingReplySource(async r=>{request=r;return result([f]);});expect(await source.replyFacts(tenant,actor,[session],from)).toEqual([f]);
  expect(request?.actor).toEqual(actor);expect(request?.payload).toEqual({session_ids:[session],from,mode:'facts'});expect(request?.tenant_id).toBe(tenant);
 });
});
