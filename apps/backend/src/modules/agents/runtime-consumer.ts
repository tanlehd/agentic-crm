import type { Consumer } from '../../kernel/reliability/delivery.js';
import { identityAccessConsumer } from '../identity/access-consumer.js';
import type { AgentExecutions } from './executions.js';
export function runtimeAccessConsumer(runtime:AgentExecutions):Consumer{return {name:'agent.runtime.access.v1',type:'principal.access_changed',async handle(s,event){await identityAccessConsumer.handle(s,event);await runtime.revoke(s,event.aggregate_id);}};}
