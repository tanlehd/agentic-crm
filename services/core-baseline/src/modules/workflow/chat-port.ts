import type { Access } from '../identity/domain/authorization.js';
import type { RegistryRecord } from '../crm/registry.js';
import { CommandError } from '../../kernel/reliability/commands.js';

/** Workflow owns integration acceptance; a retained Chat copy is never an authority. */
export interface WorkflowChatPort {
  readable(access: Access, conversation: string): Promise<RegistryRecord>;
  readNeed(access: Access, input: Record<string, unknown>): Promise<Record<string, unknown>>;
  recoverNeed(access: Access, input: Record<string, unknown>, run: string, correlation: string): Promise<Record<string, unknown>>;
}
const unavailable = async (): Promise<never> => { throw new CommandError(503, 'WORKFLOW_CHAT_UNAVAILABLE'); };
export const unavailableWorkflowChat: WorkflowChatPort = { readable: unavailable, readNeed: unavailable, recoverNeed: unavailable };
