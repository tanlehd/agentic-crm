import {describe,it,expect} from 'vitest';
import {realtimeTransaction,markRealtimeChange} from '../src/realtime.js';
describe('Chat committed realtime hints',()=>{
 it('emits once after success, never on read/rollback, isolates concurrent transactions',async()=>{
  const hints:string[]=[];const notify=(tenant:string)=>{hints.push(tenant);};
  await realtimeTransaction('read',async()=>{},notify);
  await expect(realtimeTransaction('rollback',async()=>{markRealtimeChange();throw Error('rollback');},notify)).rejects.toThrow('rollback');
  await Promise.all([realtimeTransaction('one',async()=>{markRealtimeChange();await Promise.resolve();markRealtimeChange();expect(hints).not.toContain('one');},notify),realtimeTransaction('two',async()=>{},notify)]);
  expect(hints).toEqual(['one']);
  await expect(realtimeTransaction('failure',async()=>{markRealtimeChange();return 'committed';},()=>{throw Error('redis down');})).resolves.toBe('committed');
 });
});
