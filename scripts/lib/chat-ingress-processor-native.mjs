import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ChatIngress } from '../../services/chat/dist/ingress.js';
import { processIngressMessage } from '../../services/chat/dist/ingress-message.js';
import { closeOwnership } from '../../services/chat/dist/ownership-close.js';
import { chatOwnershipSnapshot } from '../../services/chat/dist/ownership.js';
import { ownershipControlEvent } from '../../services/chat/dist/ownership-effects.js';
import { ChannelChatIngressRelay } from '../../services/core-baseline/dist/modules/channels/chat-ingress-relay.js';

export async function chatIngressProcessorNative(ctx) {
  const { check, operator, chatOperator, commands, tenant, refs, peers, wire, request, fixture, identity, adminSessionHash, restoreRole } = ctx;
  // A retained per-run message namespace on the same synthetic Contact/connection/actor.
  const mapping = randomUUID(), subject = 'synthetic-processor-' + mapping;
  await operator.execute('INSERT INTO contact_identity(id,tenant_id,connection_id,contact_id,external_subject_id) VALUES (?,?,?,?,?)', [mapping, tenant, refs.connection, refs.contact, subject]);
  for (const dataset of ['conversion', 'stage', 'progress', 'routing', 'registry']) await chatOperator.execute('INSERT INTO chat_dataset_head(tenant_id,dataset,revision,version,created_at,updated_at) VALUES (?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE tenant_id=tenant_id', [tenant, dataset]);
  const ingress = new ChatIngress(commands, peers, processIngressMessage);
  const binding = { ...request().binding, crm_identity_id: mapping };
  let time = Date.now(), created = 0, firstInput, firstReceipt, firstResult;
  const next = () => { const base = request(); return { ...base, binding, intake: { ...base.intake, external_subject_id: subject, occurred_at: new Date(time += 10).toISOString() } }; };
  const ref = receipt => ({ schema_version: 1, operation: 'ingress-read', request_id: randomUUID(), binding, receipt_id: receipt.receipt_id });
  const count = async () => Number((await chatOperator.execute('SELECT COUNT(*) n FROM message WHERE tenant_id=? AND connection_id=?', [tenant, refs.connection]))[0][0].n);
  const state = async receipt => (await chatOperator.execute('SELECT state FROM chat_ingress_inbox WHERE tenant_id=? AND id=?', [tenant, receipt.receipt_id]))[0][0].state;
  const store = async sql => (await chatOperator.execute(sql, [tenant, firstResult.conversation_id]))[0];
  await check('Chat ingress processor creates real thread message session progress contribution and durable events atomically', async () => {
    firstInput = next(); firstReceipt = await wire(firstInput); firstResult = await ingress.process(ref(firstReceipt));
    assert.equal(firstResult.state, 'processed'); assert.equal(firstResult.duplicate, false); created++;
    const [[row]] = await chatOperator.execute(`SELECT r.team_id,r.owner_principal_id,r.version,s.id session_id,s.source_classification,s.source_page_id,s.sequence,p.coverage,p.stage_key,w.latest_inbound_seq
      FROM crm_record r JOIN conversation_acquisition_session s ON s.tenant_id=r.tenant_id AND s.conversation_id=r.id JOIN session_progress p ON p.tenant_id=s.tenant_id AND p.session_id=s.id
      JOIN conversation_workspace w ON w.tenant_id=r.tenant_id AND w.conversation_id=r.id WHERE r.tenant_id=? AND r.id=?`, [tenant, firstResult.conversation_id]);
    assert.equal(row.owner_principal_id, null); assert.equal(row.team_id, refs.team); assert.equal(String(row.sequence), '1'); assert.equal(row.source_classification, 'organic'); assert.equal(row.source_page_id, refs.connection); assert.equal(row.coverage, 'full'); assert.equal(String(row.latest_inbound_seq), '1');
    assert.equal((await store('SELECT id FROM session_contribution WHERE tenant_id=? AND conversation_id=?')).length, 1);
    assert.equal((await store('SELECT id FROM conversation_activity WHERE tenant_id=? AND conversation_id=?')).length, 2);
    const deliveries = await store('SELECT consumer_name FROM chat_event_delivery WHERE tenant_id=? AND aggregate_id=?');
    assert.deepEqual(deliveries.map(d => d.consumer_name).sort(), ['ai-runtime.chat-control.v1', 'crm.chat-registry.v1', 'workflow.chat-control.v1', 'workflow.starter.v1']);
    const [[sessionDelivery]] = await chatOperator.execute('SELECT consumer_name FROM chat_event_delivery WHERE tenant_id=? AND aggregate_id=?', [tenant, row.session_id]);
    assert.equal(sessionDelivery.consumer_name, 'human.routing.acquisition_session.opened.v1');
    assert.equal((await wire(firstInput)).state, 'received'); assert.equal((await wire(ref(firstReceipt))).state, 'processed');
  });
  if(process.argv.includes('--with-baseline-relay'))await check('Chat ingress Channels relay reads native terminal receipt on repeated accept without duplicate effects',async()=>{
    const relay=new ChannelChatIngressRelay((_operation,_tenant,input)=>wire(input)),before=await count();
    const first=await relay.receive(binding,firstInput.source_delivery_id,firstInput.intake);
    assert.equal(first.state,'processed');assert.equal(first.message_id,firstResult.message_id);
    const again=await relay.receive(binding,firstInput.source_delivery_id,firstInput.intake);
    assert.equal(again.state,'processed');assert.equal(again.receipt_id,first.receipt_id);assert.equal(await count(),before);
  });
  await check('Chat ingress processor concurrent replay and new event same message preserve effects and exact rich content', async () => {
    const before = await count(), originalVersion = (await store('SELECT version FROM crm_record WHERE tenant_id=? AND id=?'))[0].version;
    const [a, b] = await Promise.all([ingress.process(ref(firstReceipt)), new ChatIngress(commands, peers, processIngressMessage).process(ref(firstReceipt))]);
    assert.equal(a.message_id, b.message_id);
    const duplicate = await wire({ ...firstInput, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...firstInput.intake, provider_event_id: randomUUID() } });
    const dup = await ingress.process(ref(duplicate)); assert.equal(dup.duplicate, true); assert.equal(dup.message_id, firstResult.message_id);
    assert.equal(await count(), before); assert.equal(String((await store('SELECT version FROM crm_record WHERE tenant_id=? AND id=?'))[0].version), String(originalVersion));
    const input = next(), receipt = await wire(input); const [one, two] = await Promise.all([ingress.process(ref(receipt)), ingress.process(ref(receipt))]);
    assert.equal(one.message_id, two.message_id); assert.equal(await count(), before + 1); created++;
    const rich = next(); rich.intake.message = { type: 'rich', content: { version: 1, message_type: 'media', text: null, text_source: 'preview', reply_to: { external_msg_id: firstInput.intake.provider_message_id }, attachment: { version: 1, kind: 'media', items: [{ media_type: 'image', external_media_id: 'synthetic-image', name: 'Synthetic image' }] } } };
    const richReceipt = await wire(rich), result = await ingress.process(ref(richReceipt)); assert.equal(result.state, 'processed'); created++;
    const [[content]] = await chatOperator.execute('SELECT m.text,c.content FROM message m JOIN message_content c ON c.tenant_id=m.tenant_id AND c.message_id=m.id WHERE m.tenant_id=? AND m.id=?', [tenant, result.message_id]);
    assert.equal(content.text, '[Media] Synthetic image'); assert.deepEqual(typeof content.content === 'string' ? JSON.parse(content.content) : content.content, rich.intake.message.content);
    const conflict = await wire({ ...rich, request_id: randomUUID(), source_delivery_id: randomUUID(), intake: { ...rich.intake, provider_event_id: randomUUID(), message: { ...rich.intake.message, content: { ...rich.intake.message.content, reply_to: null } } } });
    const failed = await ingress.process(ref(conflict)); assert.equal(failed.state, 'failed'); assert.equal(failed.error_code, 'MESSAGE_PAYLOAD_CONFLICT');
  });
  await check('Chat ingress processor late closed boundary and reopening retain thread and session history', async () => {
    const early = next(); early.intake.occurred_at = new Date(Date.parse(firstInput.intake.occurred_at) - 1).toISOString();
    const beforeSeq = (await store('SELECT latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?'))[0].latest_inbound_seq;
    const late = await ingress.process(ref(await wire(early))); created++;
    assert.equal((await chatOperator.execute('SELECT resolution FROM message_acquisition_membership WHERE tenant_id=? AND message_id=?', [tenant, late.message_id]))[0][0].resolution, 'unresolved_late');
    assert.equal(String((await store('SELECT latest_inbound_seq FROM conversation_workspace WHERE tenant_id=? AND conversation_id=?'))[0].latest_inbound_seq), String(beforeSeq));
    // Actual Chat-local close effects; service admission is separately exercised by processor tests.
    await commands.transaction(tenant, async c => {
      const snapshot = await chatOwnershipSnapshot(c, tenant, firstResult.conversation_id);
      const binding = { tenant_id: tenant, command_id: randomUUID(), operation: 'conversation-close', actor: { kind: 'service', principal_id: fixture.actor }, resource: snapshot.resource, target: { principal_id: null, kind: null, team_id: refs.team }, session_id: snapshot.session };
      await closeOwnership(c, binding, { body: { target_status: 'closed', reason: 'Synthetic processor boundary' } }, chatOwnershipSnapshot);
    });
    const [[closed]] = await chatOperator.execute("SELECT DATE_FORMAT(closed_at,'%Y-%m-%dT%H:%i:%s.%fZ') at,id FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ORDER BY sequence DESC LIMIT 1", [tenant, firstResult.conversation_id]);
    const equal = next(); equal.intake.occurred_at = new Date(closed.at).toISOString();
    const closedResult = await ingress.process(ref(await wire(equal))); created++;
    assert.equal(closedResult.conversation_id, firstResult.conversation_id); assert.equal((await store('SELECT status FROM conversation WHERE tenant_id=? AND record_id=?'))[0].status, 'closed');
    const after = next(); after.intake.occurred_at = new Date(Date.parse(closed.at) + 1).toISOString(); time = Date.parse(after.intake.occurred_at);
    const reopened = await ingress.process(ref(await wire(after))); created++;
    assert.equal(reopened.conversation_id, firstResult.conversation_id);
    const sessions = await store('SELECT id,sequence,status FROM conversation_acquisition_session WHERE tenant_id=? AND conversation_id=? ORDER BY sequence');
    assert.equal(sessions.length, 2); assert.equal(sessions[0].id, closed.id); assert.equal(sessions[0].status, 'closed'); assert.equal(sessions[1].status, 'active');
    const [[head]] = await chatOperator.execute('SELECT pause_through,cancel_through FROM chat_control_head WHERE tenant_id=? AND conversation_id=?', [tenant, firstResult.conversation_id]);
    const [[event]] = await chatOperator.execute("SELECT payload FROM outbox_event WHERE tenant_id=? AND aggregate_id=? AND event_type='chat.registry.changed.v1' ORDER BY aggregate_version DESC LIMIT 1", [tenant, firstResult.conversation_id]);
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    assert.equal(payload.snapshot.cancel_through_revision, String(head.cancel_through)); assert.equal(payload.snapshot.pause_through_revision, String(head.pause_through));
  });
  await check('Chat ingress processor rollback lost ACK and current revoke preserve exact durable state', async () => {
    const receipt = await wire(next()), before = await count();
    const broken = new ChatIngress(commands, peers, async (...args) => { await processIngressMessage(...args); throw new Error('SYNTHETIC_ROLLBACK'); });
    await assert.rejects(broken.process(ref(receipt)), /SYNTHETIC_ROLLBACK/);
    assert.equal(await count(), before); assert.equal(await state(receipt), 'received');
    await ingress.recover(tenant, ctx.lastCommand());
    ctx.loseSettlement(); await assert.rejects(ingress.process(ref(receipt)), { code: 'DEPENDENCY_UNAVAILABLE' });
    assert.equal(await count(), before + 1); created++; assert.equal(await state(receipt), 'processed');
    await new ChatIngress(commands, peers, processIngressMessage).recover(tenant, ctx.lastCommand());
    await ingress.process(ref(receipt)); assert.equal(await count(), before + 1);
    const denied = await wire(next()); ctx.revoke();
    try { await assert.rejects(ingress.process(ref(denied)), { code: 'INVALID_TRANSITION' }); assert.equal(await state(denied), peers.verdict ? 'failed' : 'received'); }
    finally { await restoreRole(); }
    const barrier = randomUUID(); await identity.beginRoleChange(tenant, adminSessionHash, barrier, fixture.role, []); await identity.drainRoleChange(tenant, barrier);
    try { await assert.rejects(ingress.process(ref(receipt)), { code: 'FORBIDDEN' }); }
    finally { await restoreRole(); }
  });
  await check('Chat ingress processor wakes snooze and leaves referral and missing imported projection unprocessed', async () => {
    await chatOperator.execute("INSERT INTO conversation_snooze(tenant_id,conversation_id,until_at,last_cause,updated_at) VALUES (?,?,TIMESTAMPADD(DAY,1,UTC_TIMESTAMP(6)),'scheduled',UTC_TIMESTAMP(6))", [tenant, firstResult.conversation_id]);
    const result = await ingress.process(ref(await wire(next()))); assert.equal(result.state, 'processed'); created++;
    assert.equal((await store('SELECT until_at FROM conversation_snooze WHERE tenant_id=? AND conversation_id=?'))[0].until_at, null);
    const ad = next(); ad.intake.referral = { source: 'ctm', ad_id: 'synthetic-ad' }; const referral = await wire(ad);
    await assert.rejects(new ChatIngress(commands, { ...peers, touchpoint: undefined }, processIngressMessage).process(ref(referral)), { code: 'DEPENDENCY_UNAVAILABLE' }); assert.equal(await state(referral), 'received');
    const missing = await wire(next()), before = await count();
    await chatOperator.execute('UPDATE conversation_activity_counter SET backfilled=FALSE WHERE tenant_id=? AND conversation_id=?', [tenant, firstResult.conversation_id]);
    try { await assert.rejects(ingress.process(ref(missing)), { code: 'PRECONDITION_REQUIRED' }); assert.equal(await count(), before); assert.equal(await state(missing), 'received'); }
    finally { await chatOperator.execute('UPDATE conversation_activity_counter SET backfilled=TRUE WHERE tenant_id=? AND conversation_id=?', [tenant, firstResult.conversation_id]); }
    const [proofs] = await chatOperator.execute("SELECT request_json,result_json FROM chat_owner_command WHERE tenant_id=? AND actor_id=? AND operation='ingress-process'", [tenant, fixture.actor]);
    assert.equal(JSON.stringify(proofs).includes('Synthetic ingress'), false); assert.equal(JSON.stringify(proofs).includes('synthetic-image'), false);
  });
  await check('Chat ingress processor preserves existing Human ownership and rejects a changed metadata snapshot', async () => {
    // Operator establishes a retained assigned-registry fixture; processor must not reassign it.
    await commands.transaction(tenant, async c => {
      const snapshot = await chatOwnershipSnapshot(c, tenant, firstResult.conversation_id);
      const ownerRevision = String(BigInt(snapshot.resource.owner_revision) + 1n), registry = String(BigInt(snapshot.registryRevision) + 1n);
      await c.execute('UPDATE crm_record SET owner_principal_id=?,owner_revision=? WHERE tenant_id=? AND id=?', [ctx.f.principal, ownerRevision, tenant, firstResult.conversation_id]);
      await c.execute('UPDATE chat_control_head SET registry_revision=? WHERE tenant_id=? AND conversation_id=?', [registry, tenant, firstResult.conversation_id]);
      const [[head]] = await c.execute('SELECT pause_through,cancel_through FROM chat_control_head WHERE tenant_id=? AND conversation_id=?', [tenant, firstResult.conversation_id]);
      await ownershipControlEvent(c, { tenant_id: tenant, command_id: randomUUID(), actor: { kind: 'service', principal_id: fixture.actor }, resource: snapshot.resource, target: { kind: 'human', principal_id: ctx.f.principal, team_id: refs.team }, session_id: snapshot.session }, snapshot.resource.record_version, ownerRevision, registry, snapshot.resource.control_revision, { pause: String(head.pause_through), cancel: String(head.cancel_through) });
    });
    const original = (await store('SELECT owner_principal_id,team_id,owner_revision FROM crm_record WHERE tenant_id=? AND id=?'))[0];
    const result = await ingress.process(ref(await wire(next()))); assert.equal(result.state, 'processed'); created++;
    assert.deepEqual((await store('SELECT owner_principal_id,team_id,owner_revision FROM crm_record WHERE tenant_id=? AND id=?'))[0], original);
    const input = next(), receipt = await wire(input), before = await count(); let metadata;
    const changed = new ChatIngress(commands, { ...peers, metadata: async t => {
      metadata = await peers.metadata(t);
      await operator.execute('UPDATE object_type SET schema_version=schema_version+1 WHERE tenant_id=? AND id=?', [tenant, metadata.object_type_id]);
      return metadata;
    } }, processIngressMessage);
    try { await assert.rejects(changed.process(ref(receipt)), { code: 'STALE_VERSION' }); assert.equal(await count(), before); assert.equal(await state(receipt), 'received'); }
    finally { if (metadata) await operator.execute('UPDATE object_type SET schema_version=? WHERE tenant_id=? AND id=?', [metadata.schema_revision, tenant, metadata.object_type_id]); }
  });
  return created;
}
