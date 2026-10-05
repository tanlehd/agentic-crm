import type { TransactionScope } from '../../kernel/tenancy/unit-of-work.js';
import { CommandError } from '../../kernel/reliability/commands.js';
import type { Access } from '../identity/domain/authorization.js';
import type { Graph,Node } from './graph.js';
export interface ChildContext {runId:string;actorId:string;actionKey:string;correlationId:string;access:Access}
export interface WorkflowChildren {
  validate(s:TransactionScope,graph:Graph,access:Access):Promise<void>;
  execute(s:TransactionScope,node:Node,input:Record<string,any>,context:ChildContext):Promise<Record<string,unknown>>;
  // Must check same-tenant child.parent_run_id before returning its durable terminal predicate.
  result(s:TransactionScope,runId:string,eventType:string,childId:string):Promise<Record<string,unknown>|null>;
  cancel(s:TransactionScope,runId:string):Promise<void>;
}
const unavailable=():never=>{throw new CommandError(422,'WORKFLOW_CHILD_UNAVAILABLE');};
export const unavailableChildren:WorkflowChildren={async validate(_s,g){if(g.nodes.some(n=>['start_chatflow','request_lead_handoff','wait_event'].includes(n.type)))unavailable();},async execute(){return unavailable();},async result(){return unavailable();},async cancel(){}};
