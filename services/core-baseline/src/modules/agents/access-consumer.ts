import type { Consumer } from '../../kernel/reliability/delivery.js';
import { identityAccessConsumer } from '../identity/access-consumer.js';
import type { Routing } from './routing.js';
export function routingAccessConsumer(routing:Routing):Consumer{return {name:'routing.access.v1',type:'principal.access_changed',async handle(s,event){await identityAccessConsumer.handle(s,event);await routing.refreshPrincipal(s,event.aggregate_id);}};}
