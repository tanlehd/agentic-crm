import {it,expect} from 'vitest';
import {inboxPollInterval} from './inbox-polling';
import {inboxQuery} from './inbox-realtime';
it('uses five minutes by default with bounded env override',()=>{
 expect(inboxPollInterval(undefined)).toBe(300000);expect(inboxPollInterval('600000')).toBe(600000);
 for(const value of ['','0','-1','NaN','5e3','999','3600001'])expect(inboxPollInterval(value)).toBe(300000);
});
it('reconciles Inbox query keys without invalidating unrelated modules',()=>{
 expect(inboxQuery('/api/v1/conversations/abc/message-envelopes-v3?limit=50')).toBe(true);
 expect(inboxQuery('/api/v1/chat-workspace/conversations?limit=30')).toBe(true);
 expect(inboxQuery('/api/v1/reports')).toBe(false);
});
