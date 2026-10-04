import { DeliveryError, type Consumer } from '../../kernel/reliability/delivery.js';
// Live authorization reads authoritative DB revisions. No permission cache or
// workflow executions exist yet; later cancellation consumers register separately.
export const identityAccessConsumer: Consumer = {
  name:'identity.access.v1',type:'principal.access_changed',
  async handle(_scope,event) {
    if (event.aggregate_type !== 'principal' || event.data.principal_id !== event.aggregate_id ||
        typeof event.data.auth_revision !== 'string' || !/^[1-9][0-9]*$/.test(event.data.auth_revision) ||
        Object.keys(event.data).some(key => !['principal_id','auth_revision'].includes(key))) throw new DeliveryError('INVALID_EVENT');
  },
};
