import type { OwnerAdmission, OwnerCapacity, OwnerReference } from '@agentic-crm/contracts';
import { ownerFail, validateOwnerValue } from '@agentic-crm/workload-transport';
import { ChatOwnerCommands } from './owner-command.js';
import type { CommandRecoveryHandler } from './command-recovery.js';
import type { ChatIngress } from './ingress.js';
import type { ChatNoteWriter } from './note-write.js';
import type { ChatNeedOutcomeWriter } from './need-outcome.js';
import { catalogOperations } from './catalog.js';
import { inboxOperations } from './inbox.js';
import { historyOperations } from './history.js';
import { workspaceStateOperations } from './workspace-state.js';
import { sessionProgressOperations } from './session-progress.js';
import { classificationOperations } from './classification.js';
import { needOperations } from './need-assessment.js';
import { sendOperations } from './outbound-submit.js';
import { externalReadOperations } from './external-reads.js';

export const chatRecoverableOperations = [...catalogOperations, ...inboxOperations, ...Object.values(historyOperations),
  ...workspaceStateOperations, ...Object.values(sessionProgressOperations), ...Object.values(classificationOperations),
  ...Object.values(needOperations), ...sendOperations, ...externalReadOperations, 'workspace-capabilities', 'runtime-capabilities',
  'workspace-get-activity', 'workspace-conversations', 'workspace-sidebar', 'conversation-get-conversations', 'conversation-channels',
  'conversation-get-conversations-id', 'conversation-post-conversations-id-transition', 'conversation-close',
  'conversation-get-conversations-id-notes', 'conversation-post-conversations-id-notes', 'note-effect',
  'session-source', 'read-need', 'need-post-outcome', 'need-outcome-effect', 'record-get', 'custom-values-patch', 'custom-values-receipt',
  'routing-assignment', 'routing-takeover', 'routing-assignment-receipt', 'routing-takeover-receipt', 'routing-history',
  'routing-proposal', 'routing-targets', 'conversation-classification-get-records-id-assignment-teams',
  'routing-sync-snapshot', 'routing-reply-facts', 'routing-reroute-source', 'session-progress-get-session-funnel',
  'ingress-accept', 'ingress-receipt', 'ingress-process'] as const;

export type ReconciliationPeers = {
  call(tenant: string, owner: 'identity' | 'crm' | 'routing', operation: string, payload: unknown): Promise<unknown>;
};

/** Current handlers use original bindings and terminal child proofs. No Human request is re-executed. */
export function chatCommandRecoveryHandlers(commands: ChatOwnerCommands, peers: ReconciliationPeers,
  children: { ingress: Pick<ChatIngress, 'recover'>; notes: Pick<ChatNoteWriter, 'recover'>; outcomes: Pick<ChatNeedOutcomeWriter, 'recover'> }) {
  const recover: CommandRecoveryHandler = async (tenant, ref, observed) => {
    if (!('binding' in observed)) return;
    const operation = observed.binding.operation;
    if (operation.startsWith('ingress-')) { await children.ingress.recover(tenant, ref); return; }
    if (operation === 'note-effect') await children.notes.recover(tenant, ref);
    else if (operation === 'need-outcome-effect') await children.outcomes.recover(tenant, ref);
    else if (observed.state === 'prepared') await commands.abort(tenant, ref);
    const terminal = await commands.proof(tenant, ref);
    if (!('binding' in terminal) || terminal.state === 'prepared') ownerFail('DEPENDENCY_UNAVAILABLE');
    const b = terminal.binding;
    // Recover retained, known capacity by its immutable receipt. No new reservation or assignment is issued.
    const capacity = await commands.dependency(tenant, ref, 'routing-capacity') as OwnerCapacity | null;
    if (capacity) {
      const result = validateOwnerValue<OwnerCapacity>('OwnerCapacity', await peers.call(tenant, 'routing', terminal.state === 'committed' ? 'capacity-confirm' : 'capacity-release',
        { command: ref, session_id: b.session_id, reservation_id: capacity.reservation_id }));
      if (result.command_id !== ref.command_id || result.binding_digest !== ref.binding_digest || result.reservation_id !== capacity.reservation_id
        || result.session_id !== capacity.session_id || !['confirmed', 'released'].includes(result.state)
        || terminal.state === 'aborted' && result.state !== 'released') ownerFail('CONFLICT');
    }
    // Metadata reservation may have committed before its ACK reached Chat; use the original exact binding.
    if (b.metadata && !b.references) {
      try {
        const result = validateOwnerValue<OwnerReference>('OwnerReference', await peers.call(tenant, 'crm', 'reference-release', {
          command: ref, kind: 'metadata', resource_id: b.metadata.object_type_id, expected_revision: b.metadata.schema_revision, reservation_id: null,
        }));
        if (result.command_id !== ref.command_id || result.binding_digest !== ref.binding_digest || result.resource_id !== b.metadata.object_type_id
          || result.revision !== b.metadata.schema_revision || result.state !== 'released') ownerFail('CONFLICT');
      } catch (error) { if ((error as {code?: string}).code !== 'NOT_FOUND') throw error; }
    }
    const admission = await commands.dependency(tenant, ref, 'identity-admission') as OwnerAdmission | null;
    if (admission) {
      const result = validateOwnerValue<OwnerAdmission>('OwnerAdmission', await peers.call(tenant, 'identity', 'settle', {
        owner: 'chat', command: ref, admission_id: admission.admission_id,
      }));
      if (result.command_id !== ref.command_id || result.binding_digest !== ref.binding_digest || result.admission_id !== admission.admission_id
        || result.state !== 'settled') ownerFail('CONFLICT');
    }
  };
  return new Map<string, CommandRecoveryHandler>(chatRecoverableOperations.map(operation => [operation, recover]));
}
