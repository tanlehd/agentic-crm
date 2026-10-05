// Test-only process boundary; never imported by the runtime or exposed over HTTP.
import { databaseSource } from '../../dist/kernel/database/data-source.js';
import { WorkflowEngine } from '../../dist/modules/workflow/engine.js';
import { DurableDelivery } from '../../dist/kernel/reliability/delivery.js';
import { OutboundDispatcher } from '../../dist/modules/conversation/outbound.js';
import { MockSender } from '../../dist/modules/channels/mock-sender.js';
if (process.env.APP_ENV !== 'test' || !['workflow_test','routing_test'].includes(process.env.MYSQL_DATABASE) || !process.send) throw new Error('FAULT_TEST_ONLY');
const source = databaseSource(true);
const pause = async () => {
  process.send({ boundary: 'committed' });
  await new Promise(() => {}); // Parent kills this process, no graceful DB cleanup.
};
process.once('message', async ({ mode, claim, tenant, conversation, intent }) => {
  try {
    await source.initialize();
    const engine = new WorkflowEngine(source);
    if (mode === 'effect-crash' || mode === 'effect-recover') {
      await engine.effect(claim);
      if (mode === 'effect-crash') await pause();
      await engine.finish(claim);
    } else if (mode === 'relay-crash' || mode === 'relay-recover') {
      const delivery = new DurableDelivery(source);
      if (mode === 'relay-crash') {
        await delivery.consume(claim, engine.consumers()[0]);
        await pause();
      } else await delivery.dispatch(claim, engine.consumers());
    } else if (mode === 'send-crash') {
      const mock = new MockSender(source);
      await new OutboundDispatcher(source, {
        async send(input) { const result = await mock.send(input); await pause(); return result; },
        lookup: (t, i) => mock.lookup(t, i),
      }).dispatch(tenant, conversation, intent);
    } else throw new Error('INVALID_FAULT_MODE');
    await source.destroy();
    process.send({ boundary: 'finished' }, () => process.disconnect());
  } catch {
    // Do not serialize exception, query, credential or payload to evidence.
    process.send({ boundary: 'failed' }, () => process.exit(1));
  }
});
