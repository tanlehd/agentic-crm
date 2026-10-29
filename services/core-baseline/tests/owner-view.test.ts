import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {ownerDigest} from '@agentic-crm/workload-transport';
import {NativeRoutingView} from '../src/modules/agents/owner-view.js';
import type {NativeRoutingViewStorage} from '../src/modules/agents/owner-view-storage.js';

function fixture(){
 const tenant=randomUUID(),id=randomUUID(),actor={kind:'human' as const,principal_id:randomUUID(),delegation_id:randomUUID()},ref={command_id:randomUUID(),binding_digest:'a'.repeat(64)},selection={mine:true,profile_ids:[],conversation_ids:[id],session_ids:[],from:'2026-01-01T00:00:00.000Z'},policy={principal_id:actor.principal_id,auth_revision:'1',selection,read:{all:true,own:true,team_ids:[]},allowed_fields:['owner_principal_id','team_id']};
 let committed=0,aborted=0,settled=0;
 const storage={prepare:async()=>({ref,binding:{routing_view:selection},snapshot:{data:{profiles:[],work:[]}}}),admit:async()=>{},commit:async()=>{committed++;},proof:async()=>{aborted++;}} as unknown as NativeRoutingViewStorage;
 const peers={admit:async()=>({admission_id:randomUUID(),command_id:ref.command_id,binding_digest:ref.binding_digest,state:'admitted' as const,auth_revision:'1',allowed_fields:[]}),settle:async()=>{settled++;},policy:async()=>policy,directory:async()=>({policy_digest:ownerDigest(policy),available:[] as {principal_id:string;available:boolean}[],principals:[],teams:[]}),chat:async()=>({policy_digest:ownerDigest(policy),visible_ids:[] as string[],replies:[] as {principal_id:string;submitted_replies:number}[],snapshot_digest:'b'.repeat(64)}),connections:async()=>{throw Error('MINE_MUST_NOT_FETCH_CONNECTIONS');}};
 return {tenant,id,actor,policy,peers,view:new NativeRoutingView(storage,peers),counts:()=>({committed,aborted,settled})};
}
describe('Native Routing view boundary assembly',()=>{
 it('rejects foreign visibility and unselected profiles before committing the root',async()=>{
  for(const kind of ['visibility','profiles']){
   const f=fixture();if(kind==='visibility')f.peers.chat=async()=>({policy_digest:ownerDigest(f.policy),visible_ids:[randomUUID()],replies:[],snapshot_digest:'b'.repeat(64)});
   else f.peers.directory=async()=>({policy_digest:ownerDigest(f.policy),available:[{principal_id:randomUUID(),available:true}],principals:[],teams:[]});
   await expect(f.view.read(f.tenant,f.actor,true)).rejects.toThrow('FORBIDDEN');expect(f.counts()).toEqual({committed:0,aborted:1,settled:1});
  }
 });
 it('rejects stale policy digest and unexpected report data on mine',async()=>{
  for(const kind of ['digest','replies']){
   const f=fixture();f.peers.chat=async()=>({policy_digest:kind==='digest'?'c'.repeat(64):ownerDigest(f.policy),visible_ids:[],replies:kind==='replies'?[{principal_id:f.actor.principal_id,submitted_replies:1}]:[],snapshot_digest:'b'.repeat(64)});
   await expect(f.view.read(f.tenant,f.actor,true)).rejects.toThrow('FORBIDDEN');expect(f.counts().committed).toBe(0);
  }
 });
 it('settles a valid mine result without calling the administrative Channels source',async()=>{
  const f=fixture();expect(await f.view.read(f.tenant,f.actor,true)).toEqual({data:{profiles:[],work:[]}});expect(f.counts()).toEqual({committed:1,aborted:0,settled:1});
 });
});
