import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import type { RegistryRecord,SubtypeAdapter } from '../crm/registry.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import { conversation,cancelQueued } from './domain.js';
export type OwnershipChanged=(s:TransactionScope,r:RegistryRecord)=>Promise<void>;
// SRC-018/020 compose transactional runtime/session cancellation here.
export function conversationOwnership(onChanged:OwnershipChanged=async()=>{}):SubtypeAdapter{return {
  insert:async()=>{throw new CommandError(422,'USE_INTAKE');},
  exists:async(s,id)=>{await conversation(s,id);return true;},
  eligible:async(s,r)=>{if((await conversation(s,r.id)).row.status==='closed')throw new CommandError(409,'INVALID_TRANSITION');},
  assigned:async(s,r)=>{await cancelQueued(s,r.id);await onChanged(s,r);},
};}
