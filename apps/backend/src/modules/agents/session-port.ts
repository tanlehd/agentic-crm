import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import type { Tool } from './protocol.js';
export interface SessionSnapshot {id:string;status:'running'|'paused_human'|'completed'|'failed'|'cancelled';conversationId:string;principalId:string;ownerRevision:string;serviceActorId:string;node:string;instruction:'ask_need'|'ask_contact_method'|'confirm_contact_permission';allowedTools:Tool[];qualification:Record<string,unknown>}
export interface ChatflowSessionPort {
  // Return pinned invoke_agent snapshot and current status; validate bound message.
  load(s:TransactionScope,id:string,messageId:string):Promise<SessionSnapshot>;
  saveDraft(s:TransactionScope,id:string,value:Record<string,unknown>):Promise<void>;
  proposeReply(s:TransactionScope,id:string,text:string):Promise<void>;
  complete(s:TransactionScope,id:string,executionId:string):Promise<void>;
  handoff(s:TransactionScope,id:string,reason:string):Promise<void>;
}
export const unavailableSessions:ChatflowSessionPort={load:async()=>{throw new CommandError(409,'SESSION_NOT_AVAILABLE');},saveDraft:async()=>{throw new CommandError(409,'SESSION_NOT_AVAILABLE');},proposeReply:async()=>{throw new CommandError(409,'SESSION_NOT_AVAILABLE');},complete:async()=>{throw new CommandError(409,'SESSION_NOT_AVAILABLE');},handoff:async()=>{throw new CommandError(409,'SESSION_NOT_AVAILABLE');}};
