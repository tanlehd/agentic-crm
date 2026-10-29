// Test-only process boundary; never imported by the runtime or exposed over HTTP.
import { databaseSource } from '../../dist/kernel/database/data-source.js';
import { WorkflowEngine } from '../../dist/modules/workflow/engine.js';
import { DurableDelivery } from '../../dist/kernel/reliability/delivery.js';
if (process.env.APP_ENV !== 'test' || !(['workflow_test','routing_test'].includes(process.env.MYSQL_DATABASE)||(process.env.RETIREMENT_NATIVE_CASES==='1'&&/^retire_[a-f0-9]{16}$/.test(process.env.MYSQL_DATABASE))) || !process.send) throw new Error('FAULT_TEST_ONLY');
const source = databaseSource(true);
const pause = async () => {
  process.send({ boundary: 'committed' });
  await new Promise(() => {}); // Parent kills this process, no graceful DB cleanup.
};
process.once('message', async ({ mode, claim }) => {
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
    } else throw new Error('INVALID_FAULT_MODE');
    await source.destroy();
    process.send({ boundary: 'finished' }, () => process.disconnect());
  } catch {
    // Do not serialize exception, query, credential or payload to evidence.
    process.send({ boundary: 'failed' }, () => process.exit(1));
  }
});
