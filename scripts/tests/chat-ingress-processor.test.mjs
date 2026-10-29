import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ingressText } from '../../services/chat/dist/ingress-message.js';
import { normalized } from '../../services/core-baseline/dist/modules/channels/normalized.js';

const content = value => normalized({ provider_event_id: 'synthetic', provider_message_id: 'synthetic',
  external_subject_id: 'synthetic', occurred_at: '2026-10-06T01:00:00Z', message: { type: 'rich', content: value } }).message.content;

test('native processor rich text projection retains baseline text, preview, extraction and Unicode semantics', () => {
  const examples = [
    { version: 1, message_type: 'text', text: ' Synthetic 😀 ', reply_to: null, attachment: null },
    { version: 1, message_type: 'media', text: null, reply_to: null, attachment: { version: 1, kind: 'media', items: [{ media_type: 'image', external_media_id: 'synthetic', name: null }, { media_type: 'file', external_media_id: 'synthetic-file', name: 'Synthetic file' }] } },
    { version: 1, message_type: 'template', text: null, reply_to: null, attachment: { version: 1, kind: 'gallery', cards: [{ title: 'Synthetic', subtitle: null, buttons: [{ label: 'View' }] }, { title: 'Second', subtitle: 'Synthetic subtitle', buttons: [] }] } },
    { version: 1, message_type: 'unsupported', text: null, reply_to: null, attachment: { version: 1, kind: 'unsupported', label: 'Synthetic' } },
  ];
  const expected = [' Synthetic 😀 ', '[Media] image | Synthetic file', '[Gallery] Synthetic | Second — Synthetic subtitle', '[Unsupported message] Synthetic'];
  for (const [index, value] of examples.entries()) {
    const valid = content(value); assert.equal(ingressText(valid), expected[index]);
    if (valid.message_type !== 'text') { const extracted = content({ ...valid, text: ' Synthetic extracted 😀 ', text_source: 'extracted' }); assert.equal(ingressText(extracted), ' Synthetic extracted 😀 '); }
  }
});
