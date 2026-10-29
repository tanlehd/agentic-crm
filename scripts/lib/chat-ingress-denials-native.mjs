import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ChatIngress } from '../../services/chat/dist/ingress.js';
import { processIngressMessage } from '../../services/chat/dist/ingress-message.js';
import { OwnerError } from '../../packages/workload-transport/dist/index.js';

export async function chatIngressDenialsNative(ctx) {
  const { check, operator, chatOperator, commands, tenant, other, refs, peers, pools, clients, wire, request, fixture, identity, adminSessionHash, restoreRole } = ctx;
  const mapping = randomUUID(), subject = 'synthetic-denial-' + mapping;
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)', [mapping, tenant, refs.connection, refs.contact, subject]);
  const binding = { ...request().binding, crm_identity_id: mapping }, ingress = new ChatIngress(commands, peers, processIngressMessage);
  let created = 0;
  const next = (referral = false) => { const base = request(); return { ...base, binding, intake: { ...base.intake, external_subject_id: subject, occurred_at: new Date().toISOString(), ...(referral ? { referral: { source: 'ctm', ad_id: 'synthetic-denial-ad' } } : {}) } }; };
  const ref = receipt => ({ schema_version: 1, operation: 'ingress-read', request_id: randomUUID(), binding, receipt_id: receipt.receipt_id });
  const row = async receipt => (await chatOperator.execute('SELECT state,error_code,version,message_id FROM chat_ingress_inbox WHERE tenant_id=? AND id=?', [tenant, receipt.receipt_id]))[0][0];
  const audits = async receipt => (await chatOperator.execute("SELECT reason FROM audit_entry WHERE tenant_id=? AND resource_id=? AND action='ingress.fail'", [tenant, receipt.receipt_id]))[0];
  const remap = value => operator.execute('UPDATE contact_identity SET external_subject_id=? WHERE tenant_id=? AND id=?', [value, tenant, mapping]);
  const revoke = async () => { const barrier = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(tenant, barrier); };
  const rejected = (call, codes = ['REFERENCE_INVALID', 'FORBIDDEN', 'INVALID_TRANSITION', 'REVOKED']) => assert.rejects(call, e => codes.includes(e.code));
  await check('Chat ingress denials canonical mismatch concurrent failure audits once and restored replay stays failed', async () => {
    const input = next(), receipt = await wire(input);
    await remap(subject + '-changed');
    try { await Promise.all([rejected(ingress.process(ref(receipt))), rejected(new ChatIngress(commands, peers, processIngressMessage).process(ref(receipt)))]); }
    finally { await remap(subject); }
    assert.equal((await row(receipt)).error_code, 'CONTACT_BINDING_STALE'); assert.equal((await audits(receipt)).length, 1);
    assert.equal((await wire(input)).state, 'received'); assert.equal((await wire(ref(receipt))).state, 'failed');
    assert.equal((await ingress.process(ref(receipt))).state, 'failed'); assert.equal((await audits(receipt)).length, 1);
  });
  await check('Chat ingress denials archived Contact and disabled connection use explicit native business verdicts', async () => {
    const contact = await wire(next()), channel = await wire(next());
    const [[old]] = await operator.execute('SELECT archived_at FROM crm_record WHERE tenant_id=? AND id=?', [tenant, refs.contact]);
    await operator.execute('UPDATE crm_record SET archived_at=UTC_TIMESTAMP(6) WHERE tenant_id=? AND id=?', [tenant, refs.contact]);
    try { await rejected(ingress.process(ref(contact))); assert.equal((await row(contact)).error_code, 'CONTACT_BINDING_STALE'); }
    finally { await operator.execute('UPDATE crm_record SET archived_at=? WHERE tenant_id=? AND id=?', [old.archived_at, tenant, refs.contact]); }
    await operator.execute("UPDATE channel_connection SET status='disabled' WHERE tenant_id=? AND id=?", [tenant, refs.connection]);
    try { await rejected(ingress.process(ref(channel))); assert.equal((await row(channel)).error_code, 'REVOKED'); }
    finally { await operator.execute("UPDATE channel_connection SET status='active' WHERE tenant_id=? AND id=?", [tenant, refs.connection]); }
    assert.equal((await ingress.process(ref(channel))).state, 'failed');
    await assert.rejects(clients.connectorIdentity(tenant, 'ingress-verdict', { service_actor_id: fixture.actor, team_id: refs.team }), { code: 'FORBIDDEN' });
  });
  await check('Chat ingress denials current role and post-stage revoke cancel referral before durable failure', async () => {
    const before = await wire(next(true)); await revoke();
    try { await rejected(ingress.process(ref(before))); assert.equal((await row(before)).error_code, 'REVOKED'); }
    finally { await restoreRole(); }
    const after = await wire(next(true));
    const staged = new ChatIngress(commands, { ...peers, touchpoint: async (t, op, cmd) => { const result = await peers.touchpoint(t, op, cmd); if (op === 'touchpoint-prepare') await revoke(); return result; } }, processIngressMessage);
    try { await rejected(staged.process(ref(after))); assert.equal((await row(after)).error_code, 'REVOKED'); }
    finally { await restoreRole(); }
    const [[pending]] = await pools.channel.execute("SELECT COUNT(*) n FROM channel_ingress_touchpoint WHERE tenant_id=? AND receipt_id=? AND state IN ('prepared','bound')", [tenant, after.receipt_id]); assert.equal(Number(pending.n), 0);
    assert.equal((await ingress.process(ref(after))).state, 'failed'); assert.equal((await audits(after)).length, 1);
  });
  await check('Chat ingress denials transport metadata malformed verdict and closing policy remain retryable', async () => {
    const receipt = await wire(next()); let diagnoses = 0;
    const outage = new ChatIngress(commands, { ...peers, contact: async () => { throw new OwnerError('DEPENDENCY_UNAVAILABLE'); }, verdict: async (...args) => { diagnoses++; return peers.verdict(...args); } }, processIngressMessage);
    await rejected(outage.process(ref(receipt)), ['DEPENDENCY_UNAVAILABLE']); assert.equal(diagnoses, 0);
    const metadata = new ChatIngress(commands, { ...peers, metadata: async () => { throw new OwnerError('FORBIDDEN'); } }, processIngressMessage);
    await rejected(metadata.process(ref(receipt))); assert.equal((await row(receipt)).state, 'received');
    const malformed = new ChatIngress(commands, { ...peers, contact: async () => { throw new OwnerError('FORBIDDEN'); }, verdict: async (...args) => ({ ...await peers.verdict(...args), input_digest: '0'.repeat(64) }) }, processIngressMessage);
    await rejected(malformed.process(ref(receipt))); assert.equal((await row(receipt)).state, 'received');
    const barrier = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, []);
    try { await rejected(metadata.process(ref(receipt))); assert.equal((await row(receipt)).state, 'received'); }
    finally { await identity.drainRoleChange(tenant, barrier); await restoreRole(); }
    const abort = new AbortController(); abort.abort(); await rejected(ingress.process(ref(receipt), abort.signal), ['DEPENDENCY_UNAVAILABLE']); await ingress.recover(tenant, ctx.lastCommand());
    assert.equal((await audits(receipt)).length, 0); assert.equal((await ingress.process(ref(receipt))).state, 'processed'); created++;
  });
  await check('Chat ingress denials stale diagnosis cannot overwrite concurrent successful processing or cross receipt scope', async () => {
    const receipt = await wire(next()); let raced = false;
    await remap(subject + '-race');
    const racing = new ChatIngress(commands, { ...peers, verdict: async (...args) => {
      const result = await peers.verdict(...args);
      if (!raced && result.state === 'denied') { raced = true; await remap(subject); assert.equal((await ingress.process(ref(receipt))).state, 'processed'); created++; }
      return result;
    } }, processIngressMessage);
    try { await rejected(racing.process(ref(receipt))); } finally { await remap(subject); }
    assert.equal((await row(receipt)).state, 'processed'); assert.equal((await audits(receipt)).length, 0);
    await assert.rejects(ingress.process({ ...ref(receipt), binding: { ...binding, tenant_id: other } }), { code: 'NOT_FOUND' });
    await assert.rejects(ingress.process({ ...ref(receipt), binding: { ...binding, crm_contact_id: randomUUID() } }), { code: 'NOT_FOUND' });
    assert.equal((await row(receipt)).state, 'processed');
  });
  await check('Chat ingress denials atomic audit rollback and lost reply retry retain a single terminal failure', async () => {
    const receipt = await wire(next()); await remap(subject + '-rollback');
    const faulty = new Proxy(commands, { get(target, key) {
      if (key === 'transaction') return (t, work) => target.transaction(t, c => work(new Proxy(c, { get(connection, method) {
        if (method === 'execute') return (sql, values) => { if (sql.includes("'ingress.fail'")) throw new Error('SYNTHETIC_DENIAL_AUDIT_FAILURE'); return connection.execute(sql, values); };
        const value = connection[method]; return typeof value === 'function' ? value.bind(connection) : value;
      } })));
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    try {
      await rejected(new ChatIngress(faulty, peers, processIngressMessage).process(ref(receipt))); assert.equal((await row(receipt)).state, 'received'); assert.equal((await audits(receipt)).length, 0);
      await rejected(ingress.process(ref(receipt))); // Discard the denial response; retry after the durable failure.
      await rejected(ingress.process(ref(receipt))); assert.equal((await row(receipt)).state, 'failed'); assert.equal((await audits(receipt)).length, 1);
      const audit = JSON.stringify(await audits(receipt)); assert.equal(audit.includes(subject), false); assert.equal(audit.includes('Synthetic ingress'), false);
    } finally { await remap(subject); }
  });
  await check('Chat ingress denials unknown reference cleanup cannot terminalize received intake', async () => {
    const receipt = await wire(next(true)); await revoke();
    const unknown = new ChatIngress(commands, { ...peers, reference: async (t, owner, op, input) => { if (op === 'reference-release') throw new OwnerError('DEPENDENCY_UNAVAILABLE'); return peers.reference(t, owner, op, input); } }, processIngressMessage);
    try {
      await rejected(unknown.process(ref(receipt))); const command = ctx.lastCommand();
      assert.equal((await row(receipt)).state, 'received'); assert.equal((await audits(receipt)).length, 0);
      await ingress.recover(tenant, command); await rejected(ingress.process(ref(receipt))); assert.equal((await row(receipt)).error_code, 'REVOKED');
    } finally { await restoreRole(); }
    const [[pending]] = await pools.channel.execute("SELECT COUNT(*) n FROM channel_ingress_touchpoint WHERE tenant_id=? AND connection_id=? AND state='prepared'", [tenant, refs.connection]); assert.equal(Number(pending.n), 0);
  });
  assert.equal(created, 2); return created;
}
