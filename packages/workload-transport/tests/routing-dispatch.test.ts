import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {routingDispatchBinding} from '../src/routing-dispatch.js';
import type {OwnerCommandRequest} from '../src/owner-routes.js';
const request=():OwnerCommandRequest=>{const actor=randomUUID();return {schema_version:1,request_id:randomUUID(),correlation_id:randomUUID(),tenant_id:randomUUID(),operation:'routing-dispatch',command_id:randomUUID(),actor:{kind:'service',principal_id:actor,delegation_id:actor},payload:{resource:{resource_id:randomUUID(),object_key:'conversation',record_version:'2',owner_revision:'1',control_revision:'1',owner_principal_id:null,team_id:null,shared_team_ids:[],archived:false},session_id:randomUUID(),target:{principal_id:randomUUID(),kind:'human',team_id:randomUUID()},pin:{work_id:randomUUID(),entry_id:randomUUID(),queue_version_id:randomUUID()}}};};
describe('Routing dispatch exact child boundary',()=>{
 it('does not accept public actors, delegated service identities, owned or archived resources',()=>{
  for(const kind of ['human','app','ai'] as const){const r=request();r.actor.kind=kind;expect(()=>routingDispatchBinding(r)).toThrow('FORBIDDEN');}
  const delegated=request();delegated.actor.delegation_id=randomUUID();expect(()=>routingDispatchBinding(delegated)).toThrow('FORBIDDEN');
  for(const change of [{owner_principal_id:randomUUID()},{archived:true},{object_key:'contact'},{record_version:'0'},{control_revision:'18446744073709551616'}]){const r=request();r.payload.resource={...r.payload.resource as object,...change};expect(()=>routingDispatchBinding(r)).toThrow();}
 });
 it('binds work, entry, queue version, actor and resource into the abort reference before sending',()=>{
  const r=request(),initial=routingDispatchBinding(r);expect(initial.request.body.reason).toBe('human_routing');
  expect(routingDispatchBinding({...r,request_id:randomUUID(),correlation_id:randomUUID()}).ref).toEqual(initial.ref);
  for(const key of ['work_id','entry_id','queue_version_id']){const changed=structuredClone(r);changed.payload.pin={...changed.payload.pin as object,[key]:randomUUID()};expect(routingDispatchBinding(changed).ref.binding_digest).not.toBe(initial.ref.binding_digest);}
  const changed=structuredClone(r);changed.payload.resource={...changed.payload.resource as object,shared_team_ids:[randomUUID()]};expect(routingDispatchBinding(changed).ref.binding_digest).not.toBe(initial.ref.binding_digest);
 });
 it('rejects unreviewed payload fields and non-Human dispatch targets',()=>{
  const r=request();r.payload.authorized=true;expect(()=>routingDispatchBinding(r)).toThrow('INVALID_REQUEST');
  const ai=request();ai.payload.target={...ai.payload.target as object,kind:'ai'};expect(()=>routingDispatchBinding(ai)).toThrow('INVALID_REQUEST');
 });
});
