import {describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {ChatHistory,historyOperations} from '../src/history.js';

describe('rich timeline batched storage',()=>{
 function fixture(allowed=true){
  const tenant=randomUUID(),conversation=randomUUID(),connection=randomUUID(),account=randomUUID();
  const rows=Array.from({length:51},(_,i)=>({id:randomUUID(),conversation_id:conversation,direction:'inbound',status:'received',provider_message_id:'synthetic-'+i,outbound_intent_id:null,occurred_at:'2026-10-27 00:00:00',received_at:'2026-10-27 00:00:00',position_time:'2026-10-27 00:00:00.000000',...(allowed?{text:'synthetic'}:{})}));
  const content=(i:number)=>({version:1,message_type:'text',text:'synthetic',reply_to:{external_msg_id:i===1?'synthetic-1':i===2?'outside-conversation':'synthetic-0'},attachment:null});
  const execute=vi.fn(async(sql:string,values:unknown[])=>{
   expect(values[0]).toBe(tenant);
   if(sql.includes('FROM message_content')){expect(values).toEqual([tenant,...rows.slice(0,50).map(r=>r.id)]);return [rows.slice(0,50).map((r,i)=>({message_id:r.id,content:JSON.stringify(content(i))}))];}
   if(sql.includes('provider_message_id IN')){expect(values.slice(0,3)).toEqual([tenant,connection,conversation]);return [rows.slice(0,2).map(r=>({id:r.id,provider_message_id:r.provider_message_id}))];}
   expect(values.slice(0,2)).toEqual([tenant,conversation]);return [rows];
  });
  // Exercise the storage projection separately from the unchanged admission coordinator.
  const history=new ChatHistory({} as never,{} as never,'k'.repeat(32));
  const run=()=> (history as any).timeline({execute},tenant,conversation,connection,{operation:historyOperations.rich,payload:{limit:50}},account,undefined,allowed,'mock_messenger');
  return {execute,run,rows};
 }
 it('loads fifty rich messages in three scoped queries and preserves cursor/reply semantics',async()=>{
  const f=fixture(),r=await f.run();expect(f.execute).toHaveBeenCalledTimes(3);expect(r.data).toHaveLength(50);expect(r.next_cursor).toEqual(expect.any(String));
  expect(r.data[0].reply_to.internal_message_id).toBeNull();expect(r.data[1].reply_to.internal_message_id).toBeNull();expect(r.data[2].reply_to.internal_message_id).toBeNull();expect(r.data[3].reply_to.internal_message_id).toBe(f.rows[0]!.id);
  expect(r.data[3].text).toBe('synthetic');expect(r.data[3].schema_version).toBe(3);
 });
 it('does not resolve replies or return protected fields after text denial',async()=>{
  const f=fixture(false),r=await f.run();expect(f.execute).toHaveBeenCalledTimes(2);
  for(const row of r.data){expect(row).not.toHaveProperty('text');expect(row).not.toHaveProperty('reply_to');expect(row).not.toHaveProperty('attachment');}
 });
});
