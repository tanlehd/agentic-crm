import { describe,it,expect } from 'vitest';
import { snoozeInput } from '../src/modules/conversation/snooze.js';
describe('SRC-034 deadline validation',()=>{
 const now=new Date('2026-10-06T01:00:00Z');
 it('accepts UTC absolute deadline at30 days and protects optional reason',()=>{expect(snoozeInput({until:'2026-11-05T01:00:00Z',reason:'  Synthetic  '},now)).toEqual({until:new Date('2026-11-05T01:00:00Z'),reason:'  Synthetic  '});});
 it('rejects relative/local/past/too distant deadlines and unknown fields',()=>{for(const until of ['1h','2026-10-07T01:00:00','2026-10-06T01:00:00Z','2026-11-05T01:00:00.001Z'])expect(()=>snoozeInput({until},now)).toThrow();expect(()=>snoozeInput({until:'2026-10-07T01:00:00Z',reason:'x'.repeat(251)},now)).toThrow();expect(()=>snoozeInput({until:'2026-10-07T01:00:00Z',owner_id:'bad'},now)).toThrow();});
});
