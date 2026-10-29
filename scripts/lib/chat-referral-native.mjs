import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ChatIngress } from '../../services/chat/dist/ingress.js';
import { processIngressMessage } from '../../services/chat/dist/ingress-message.js';
import { closeOwnership } from '../../services/chat/dist/ownership-close.js';
import { chatOwnershipSnapshot } from '../../services/chat/dist/ownership.js';
import { OwnerError } from '../../packages/workload-transport/dist/index.js';

export async function chatReferralNative(ctx) {
  const { check, operator, chatOperator, commands, tenant, other, refs, peers, pools, clients, wire, request, fixture, identity, adminSessionHash, restoreRole } = ctx;
  const mapping = randomUUID(), subject = 'synthetic-referral-' + mapping;
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)', [mapping, tenant, refs.connection, refs.contact, subject]);
  const binding = { ...request().binding, crm_identity_id: mapping }, ingress = new ChatIngress(commands, peers, processIngressMessage);
  // Session-source acceptance retains an unrelated prepared touchpoint without a Chat command.
  // Preserve that fixture; all real commands for this actor were recovered before this suite.
  const pendingRows = async () => (await pools.channel.execute("SELECT command_id,binding_digest FROM channel_ingress_touchpoint WHERE tenant_id=? AND connection_id=? AND state='prepared' ORDER BY command_id", [tenant, refs.connection]))[0];
  const retainedPending = await pendingRows();
  for (const row of retainedPending) {
    const [owned] = await chatOperator.execute('SELECT command_id FROM chat_owner_command WHERE tenant_id=? AND command_id=? AND actor_id=?', [tenant, row.command_id, fixture.actor]);
    assert.equal(owned.length, 0, 'Native ingress command must be recovered before referral acceptance');
  }
  let time = Date.now(), created = 0, first, firstInput, firstSession;
  const next = (ad = 'synthetic-ad-a') => { const base = request(); return { ...base, binding, intake: { ...base.intake, occurred_at: new Date(time += 10).toISOString(), external_subject_id: subject, ...(ad === null ? {} : { referral: { source: 'ctm', ad_id: ad, campaign_id: 'synthetic-campaign' } }) } }; };
  const ref = receipt => ({ schema_version: 1, operation: 'ingress-read', request_id: randomUUID(), binding, receipt_id: receipt.receipt_id });
  const rows = async (sql, values = []) => (await chatOperator.execute(sql, [tenant, ...values]))[0];
  const ledger = async command => (await pools.channel.execute('SELECT * FROM channel_ingress_touchpoint WHERE tenant_id=? AND command_id=?', [tenant, command.command_id]))[0][0];
  const process = async input => { const receipt = await wire(input); const r = await ingress.process(ref(receipt)); if (r.state === 'processed' && !r.duplicate) created++; return r; };
  const session = async () => (await rows('SELECT * FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ORDER BY sequence DESC', [first.conversation_id]))[0];
  await check('Chat ingress referral creates paid opening and confirms native Channels evidence with exact session link', async () => {
    firstInput = next(); first = await process(firstInput); firstSession = await session();
    assert.equal(firstSession.source_classification, 'paid'); assert.equal(firstSession.source_ad_id, 'synthetic-ad-a'); assert.equal(firstSession.source_touchpoint_id, first.touchpoint_id);
    const proof = await commands.proof(tenant, ctx.lastCommand()), evidence = await ledger(ctx.lastCommand());
    assert.equal(evidence.state, 'bound'); assert.equal(evidence.message_id, first.message_id); assert.equal(evidence.session_id, firstSession.id);
    assert.equal(proof.ingress_result.touchpoint_id, first.touchpoint_id);
    assert.equal((await rows('SELECT touchpoint_id FROM session_touchpoint WHERE tenant_id=? AND session_id=?', [firstSession.id])).length, 1);
  });
  await check('Chat ingress referral active continuity duplicate conflict and concurrent replay never rewrite source', async () => {
    const second = await process(next('synthetic-ad-b')); assert.equal(second.session_id, firstSession.id); assert.equal((await session()).source_ad_id, 'synthetic-ad-a');
    assert.equal((await rows('SELECT id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=?', [first.conversation_id])).length, 1);
    const duplicate = { ...firstInput, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...firstInput.intake, provider_event_id: randomUUID(), referral: { source: 'ctm', ad_id: 'ignored-new-ad' } } };
    const dup = await process(duplicate); assert.equal(dup.duplicate, true); assert.equal(dup.message_id, first.message_id); assert.equal((await ledger(ctx.lastCommand())).state, 'discarded');
    const conflict = { ...duplicate, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...duplicate.intake, provider_event_id: randomUUID(), message: { type: 'text', text: 'Synthetic referral conflict' } } };
    assert.equal((await process(conflict)).state, 'failed'); assert.equal((await ledger(ctx.lastCommand())).state, 'discarded');
    const receipt = await wire(next()), [a, b] = await Promise.all([ingress.process(ref(receipt)), new ChatIngress(commands, peers, processIngressMessage).process(ref(receipt))]); created++;
    assert.equal(a.message_id, b.message_id);
    const [states] = await pools.channel.execute('SELECT state FROM channel_ingress_touchpoint WHERE tenant_id=? AND receipt_id=? ORDER BY state', [tenant, receipt.receipt_id]);
    assert.deepEqual(states.map(r => r.state), ['bound', 'discarded']);
    const organic = next(null), original = await process(organic);
    const addedReferral = { ...organic, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...organic.intake, provider_event_id: randomUUID(), referral: { source: 'ctm' } } };
    assert.equal((await process(addedReferral)).message_id, original.message_id); assert.equal((await ledger(ctx.lastCommand())).state, 'discarded');
  });
  await check('Chat ingress referral late and closed boundaries preserve evidence without guessed cohort then reopen paid', async () => {
    const early = next(); early.intake.occurred_at = new Date(Date.parse(firstInput.intake.occurred_at) - 1).toISOString();
    const late = await process(early); assert.equal(late.session_id, null); assert.equal((await ledger(ctx.lastCommand())).session_id, null);
    assert.equal((await rows('SELECT touchpoint_id FROM session_touchpoint WHERE tenant_id=? AND touchpoint_id=?', [late.touchpoint_id])).length, 0);
    await commands.transaction(tenant, async c => {
      const snap = await chatOwnershipSnapshot(c, tenant, first.conversation_id);
      await closeOwnership(c, { tenant_id: tenant, command_id: randomUUID(), operation: 'conversation-close', actor: { kind: 'service', principal_id: fixture.actor }, resource: snap.resource, target: { principal_id: null, kind: null, team_id: refs.team }, session_id: snap.session }, { body: { target_status: 'closed', reason: 'Synthetic referral boundary' } }, chatOwnershipSnapshot);
    });
    const [[closed]] = await chatOperator.execute("SELECT DATE_FORMAT(closed_at,'%Y-%m-%dT%H:%i:%s.%fZ') at FROM conversation_acquisition_session WHERE tenant_id=? AND id=?", [tenant, firstSession.id]);
    const equal = next(); equal.intake.occurred_at = new Date(closed.at).toISOString();
    assert.equal((await process(equal)).session_id, null); assert.equal((await session()).status, 'closed');
    const reopen = next('synthetic-reopen'); reopen.intake.occurred_at = new Date(Date.parse(closed.at) + 1).toISOString(); time = Date.parse(reopen.intake.occurred_at);
    const opened = await process(reopen); assert.equal(opened.conversation_id, first.conversation_id); assert.notEqual(opened.session_id, firstSession.id);
    assert.equal((await session()).source_ad_id, 'synthetic-reopen');
    assert.equal((await rows('SELECT source_ad_id FROM conversation_acquisition_session WHERE tenant_id=? AND id=?', [firstSession.id]))[0].source_ad_id, 'synthetic-ad-a');
  });
  await check('Chat ingress referral lost prepare ACK and local rollback recover cancelled candidates without message duplication', async () => {
    const receipt = await wire(next()); let lostCommand;
    const lost = new ChatIngress(commands, { ...peers, touchpoint: async (t, op, cmd) => { const r = await peers.touchpoint(t, op, cmd); if (op === 'touchpoint-prepare') { lostCommand = cmd; throw new OwnerError('DEPENDENCY_UNAVAILABLE'); } return r; } }, processIngressMessage);
    await assert.rejects(lost.process(ref(receipt)), { code: 'DEPENDENCY_UNAVAILABLE' }); assert.equal((await ledger(lostCommand)).state, 'prepared');
    await new ChatIngress(commands, peers).recover(tenant, lostCommand); assert.equal((await ledger(lostCommand)).state, 'cancelled');
    assert.equal((await ingress.process(ref(receipt))).state, 'processed'); created++;
    const retry = await wire(next()), countBefore = (await rows('SELECT COUNT(*) n FROM message WHERE tenant_id=?'))[0].n;
    const rollback = new ChatIngress(commands, peers, async (...args) => { await processIngressMessage(...args); throw new Error('SYNTHETIC_REFERRAL_ROLLBACK'); });
    await assert.rejects(rollback.process(ref(retry)), /SYNTHETIC_REFERRAL_ROLLBACK/); const failedCommand = ctx.lastCommand();
    assert.equal((await rows('SELECT COUNT(*) n FROM message WHERE tenant_id=?'))[0].n, countBefore);
    await ingress.recover(tenant, failedCommand); assert.equal((await ledger(failedCommand)).state, 'cancelled');
    assert.equal((await ingress.process(ref(retry))).state, 'processed'); created++;
  });
  await check('Chat ingress referral committed recovery survives finalize outage lost ACK and grant revocation', async () => {
    for (const after of [false, true]) {
      const receipt = await wire(next()); let pending;
      const lost = new ChatIngress(commands, { ...peers, touchpoint: async (t, op, cmd) => { if (op === 'touchpoint-finalize') { pending = cmd; if (after) await peers.touchpoint(t, op, cmd); throw new OwnerError('DEPENDENCY_UNAVAILABLE'); } return peers.touchpoint(t, op, cmd); } }, processIngressMessage);
      await assert.rejects(lost.process(ref(receipt)), { code: 'DEPENDENCY_UNAVAILABLE' }); created++;
      assert.equal((await commands.proof(tenant, pending)).state, 'committed'); assert.equal((await ledger(pending)).state, after ? 'bound' : 'prepared');
      const barrier = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(tenant, barrier);
      try { await new ChatIngress(commands, peers).recover(tenant, pending); await assert.rejects(ingress.process(ref(receipt)), { code: 'FORBIDDEN' }); }
      finally { await restoreRole(); }
      assert.equal((await ledger(pending)).state, 'bound'); await ingress.recover(tenant, pending);
      assert.equal((await wire(ref(receipt))).state, 'processed');
    }
  });
  await check('Chat ingress referral abort-before-prepare tombstone and current revoke fence delayed evidence', async () => {
    const receipt = await wire(next()); let aborted;
    const stopped = new ChatIngress(commands, { ...peers, touchpoint: async (t, op, cmd) => {
      if (op === 'touchpoint-prepare') { aborted = cmd; await commands.abort(t, cmd); await peers.touchpoint(t, 'touchpoint-finalize', cmd); }
      return peers.touchpoint(t, op, cmd);
    } }, processIngressMessage);
    await assert.rejects(stopped.process(ref(receipt)), { code: 'INVALID_TRANSITION' }); assert.equal((await ledger(aborted)).state, 'cancelled');
    await ingress.recover(tenant, aborted); await assert.rejects(clients.connector(other, 'touchpoint-finalize', aborted), e => ['NOT_FOUND', 'FORBIDDEN'].includes(e.code));
    await assert.rejects(clients.connector(tenant, 'touchpoint-finalize', { ...aborted, binding_digest: '0'.repeat(64) }), { code: 'CONFLICT' });
    let revokedCommand;
    const revoked = new ChatIngress(commands, { ...peers, touchpoint: async (t, op, cmd) => {
      if (op === 'touchpoint-prepare') { revokedCommand = cmd; const barrier = randomUUID(); await identity.beginRoleChange(t, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(t, barrier); }
      return peers.touchpoint(t, op, cmd);
    } }, processIngressMessage);
    try { await assert.rejects(revoked.process(ref(await wire(next()))), e => ['INVALID_TRANSITION', 'REVOKED', 'FORBIDDEN'].includes(e.code)); }
    finally { await restoreRole(); }
    assert(revokedCommand);
    await ingress.recover(tenant, revokedCommand);
    assert.equal((await ledger(revokedCommand)).state, 'cancelled');
  });
  await check('Chat ingress referral own grants tenant constraints minimized proofs and indexed recovery hold', async () => {
    await assert.rejects(pools.channel.query('SELECT id FROM message LIMIT 1'));
    await assert.rejects(pools.channel.query('DELETE FROM channel_ingress_touchpoint WHERE 1=0'));
    await assert.rejects(ctx.chatPool.query('SELECT id FROM native_identity_test.channel_ingress_touchpoint LIMIT 1'));
    await assert.rejects(pools.channel.execute("UPDATE channel_ingress_touchpoint SET state='prepared' WHERE tenant_id=? AND id=?", [tenant, first.touchpoint_id]));
    const [[foreign]] = await chatOperator.execute("SELECT command_id,binding_digest,admission_id FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND operation='ingress-accept' AND admission_id IS NOT NULL LIMIT 1", [tenant, fixture.actor]);
    await assert.rejects(clients.connectorIdentity(tenant, 'admission-read', { owner: 'chat', command: { command_id: foreign.command_id, binding_digest: foreign.binding_digest }, admission_id: foreign.admission_id }), { code: 'FORBIDDEN' });
    await assert.rejects(clients.connectorIdentity(tenant, 'settle', { owner: 'chat', command: { command_id: foreign.command_id, binding_digest: foreign.binding_digest }, admission_id: foreign.admission_id }), { code: 'FORBIDDEN' });
    const [plans] = await pools.channel.execute('EXPLAIN SELECT id FROM channel_ingress_touchpoint WHERE tenant_id=? AND connection_id=? AND state=? ORDER BY id LIMIT 100', [tenant, refs.connection, 'prepared']);
    assert(plans[0].key); assert.notEqual(plans[0].type, 'ALL');
    const [proofs] = await chatOperator.execute("SELECT binding_json,result_json FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND operation='ingress-process'", [tenant, fixture.actor]);
    assert.equal(JSON.stringify(proofs).includes('Synthetic referral conflict'), false); assert.equal(JSON.stringify(proofs).includes(subject), false);
    assert.deepEqual(await pendingRows(), retainedPending, 'No new prepared touchpoint may survive native recovery');
  });
  assert.equal(created, 11); return created;
}
