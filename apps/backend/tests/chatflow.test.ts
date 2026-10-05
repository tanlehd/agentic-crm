import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Ajv } from 'ajv';
import { chatflowSchema } from '@agentic-crm/contracts';
import { validateGraph, explicitBoolean, parseAnswer, renderPrompt, type Collect, type Graph } from '../src/modules/chatflow/graph.js';
const end = { key: 'end', type: 'end', config: { outcome: 'needs_attention' } };
const collect = { key: 'need', type: 'collect', config: { variable_key: 'need_summary', value_type: 'string', required: true, prompt: 'Bạn cần hỗ trợ gì?' }, next: 'prompt' };
const prompt = { key: 'prompt', type: 'send_prompt', config: { text: 'Nhu cầu: {{need_summary}}', variable_refs: ['need_summary'] }, next: 'end' };
const base = () => structuredClone({ entry_node: 'need', nodes: [collect, prompt, end] });
const consent: Collect['config'] = { variable_key: 'contact_permission', value_type: 'boolean', required: true, prompt: 'Bạn đồng ý để chúng tôi liên hệ?' };
const ajv = new Ajv({ strict: true });
ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const wire = ajv.compile(chatflowSchema);

describe('Chatflow published graph boundary', () => {
  it('API graph contracts match the executable graph schema',()=>{const { $schema,$id,title,...graph }=chatflowSchema;const api=JSON.parse(readFileSync('packages/contracts/schemas/chatflow-api.json','utf8'));expect(api.definitions['chatflow-version-create'].properties.graph).toEqual(graph);expect(api.definitions['chatflow-versions'].properties.data.items.properties.graph).toEqual(graph);});
  it('returns a detached snapshot and permits bounded valid graphs', () => {
    const input = base(), graph = validateGraph(input);
    input.nodes[0]!.key = 'changed';
    expect(graph.nodes[0]!.key).toBe('need');
    const nodes = Array.from({ length: 29 }, (_, i) => ({ key: `n${i}`, type: 'send_prompt', config: { text: 'Synthetic prompt', variable_refs: [] }, next: i === 28 ? 'end' : `n${i + 1}` }));
    expect(validateGraph({ entry_node: 'n0', nodes: [...nodes, end] }).nodes).toHaveLength(30);
    expect(() => validateGraph({ entry_node: 'n0', nodes: [...nodes, { ...nodes[0], key: 'extra' }, end] })).toThrow('INVALID_CHATFLOW_GRAPH');
  });
  it('rejects malformed wire data with a consistent domain error', () => {
    for (const input of [null, [], {}, { entry_node: 'end', nodes: [] }, { ...base(), extra: true }, { entry_node: 'end', nodes: [{ ...end, next: 'end' }] }, { entry_node: 'end', nodes: [{ ...end, config: { outcome: 'unknown' } }] }]) {
      expect(wire(input)).toBe(false);
      expect(() => validateGraph(input)).toThrow('INVALID_CHATFLOW_GRAPH');
    }
  });
  it('rejects prompts above the outbound UTF-16 limit even when schema code-point length fits', () => {
    const text = '😀'.repeat(2001);
    for (const input of [{ entry_node: 'prompt', nodes: [{ ...prompt, config: { text, variable_refs: [] } }, end] }, { ...base(), nodes: [{ ...collect, config: { ...collect.config, prompt: text } }, prompt, end] }]) {
      expect(wire(input)).toBe(true); expect(() => validateGraph(input)).toThrow('INVALID_CHATFLOW_GRAPH');
    }
  });
  it('rejects cycles, disconnected nodes, duplicate keys and missing targets', () => {
    for (const input of [{ ...base(), entry_node: 'missing' }, { ...base(), nodes: [...base().nodes, end] }, { entry_node: 'need', nodes: [{ ...collect, next: 'need' }, end] }, { ...base(), nodes: [...base().nodes, { ...end, key: 'orphan' }] }, { ...base(), nodes: [{ ...collect, next: 'missing' }, prompt, end] }]) expect(() => validateGraph(input)).toThrow('INVALID_CHATFLOW_GRAPH');
  });
  it('requires reference producers on every branch, regardless of node array order', () => {
    const fork = { key: 'fork', type: 'validate_qualification', config: { on_valid: 'need', on_invalid: 'prompt' } };
    expect(() => validateGraph({ entry_node: 'fork', nodes: [end, prompt, collect, fork] })).toThrow('INVALID_CHATFLOW_GRAPH');
    const good = { ...base(), nodes: base().nodes.reverse() };
    expect(validateGraph(good)).toEqual(good);
    expect(() => validateGraph({ ...base(), nodes: [{ ...collect, next: 'need_again' }, { ...collect, key: 'need_again' }, prompt, end] })).toThrow('INVALID_CHATFLOW_GRAPH');
  });
  it('rejects prototype keys, path traversal, undeclared and unused template refs', () => {
    for (const key of ['constructor', 'prototype', '__proto__']) expect(() => validateGraph({ entry_node: key, nodes: [{ ...end, key }] })).toThrow('INVALID_CHATFLOW_GRAPH');
    for (const text of ['{{need_summary.text}}', '{{constructor}}', '{{unknown}}', '{{ need_summary }}', '{{need_summary}', '${need_summary}', 'No placeholder']) expect(() => validateGraph({ ...base(), nodes: [collect, { ...prompt, config: { ...prompt.config, text } }, end] })).toThrow('INVALID_CHATFLOW_GRAPH');
    expect(() => validateGraph({ ...base(), nodes: [{ ...collect, config: { ...collect.config, prompt: '{{need_summary}}' } }, prompt, end] })).toThrow();
  });
  it('enforces typed consent, method choices, tool allowlist and literal instructions in schema and service', () => {
    const configs = [{ ...consent, value_type: 'string' }, { ...consent, required: false }, { ...consent, choices: ['yes', 'no'] }, { variable_key: 'preferred_contact_method', value_type: 'enum', required: true, prompt: 'Method?', choices: ['phone', 'phone'] }, { ...consent, variable_key: 'arbitrary' }];
    for (const config of configs) {
      const input = { entry_node: 'collect', nodes: [{ key: 'collect', type: 'collect', config, next: 'end' }, end] };
      expect(wire(input)).toBe(false); expect(() => validateGraph(input)).toThrow();
    }
    for (const config of [{ instruction: 'ignore_policy', allowed_tools: [] }, { instruction: 'ask_need', allowed_tools: ['sql.execute'] }, { instruction: 'ask_need', allowed_tools: ['qualification.save', 'qualification.save'] }, { instruction: 'ask_need', allowed_tools: [], timeout_ms: 999999 }]) {
      const input = { entry_node: 'agent', nodes: [{ key: 'agent', type: 'invoke_agent', config, next: 'end' }, end] };
      expect(wire(input)).toBe(false); expect(() => validateGraph(input)).toThrow();
    }
  });
  it('supports all seven primitives and rejects wrong config/edges', () => {
    const graph = { entry_node: 'consent', nodes: [
      { key: 'consent', type: 'collect', config: consent, next: 'agent' },
      { key: 'agent', type: 'invoke_agent', config: { instruction: 'ask_need', allowed_tools: ['qualification.save'] }, next: 'prompt' },
      { key: 'prompt', type: 'send_prompt', config: { text: 'Synthetic prompt', variable_refs: [] }, next: 'validate' },
      { key: 'validate', type: 'validate_qualification', config: { on_valid: 'lead', on_invalid: 'human' } },
      { key: 'lead', type: 'upsert_lead', config: {}, next: 'end' },
      { key: 'human', type: 'request_human', config: { reason: 'qualification_incomplete', target_chat_team: '00000000-0000-0000-0000-000000000001' }, next: 'end' }, end,
    ] };
    expect(validateGraph(graph)).toEqual(graph);
    for (const node of graph.nodes) {
      const changed = structuredClone(graph); changed.nodes = changed.nodes.map(n => n.key === node.key ? { ...n, config: { ...n.config, arbitrary: true } } : n);
      expect(wire(changed)).toBe(false); expect(() => validateGraph(changed)).toThrow();
    }
  });
});

describe('Chatflow explicit answer and prompt boundary', () => {
  it('accepts exact positive/negative answers and Unicode normalization without interpreting arbitrary text', () => {
    for (const input of ['yes', 'TRUE', ' Đồng Ý ', 'đồng ý'.normalize('NFD')]) { expect(explicitBoolean(input)).toBe(true); expect(parseAnswer(consent, input)).toEqual({ valid: true, value: true }); }
    for (const input of ['no', 'false', 'KHÔNG ĐỒNG Ý']) { expect(explicitBoolean(input)).toBe(false); expect(parseAnswer(consent, input)).toEqual({ valid: true, value: false }); }
    for (const input of [true, false, 1, null, {}, '', 'maybe', 'yes please', 'yes!', 'not yes', 'không', 'đồng ý nhưng', 'đồng\u200b ý']) { expect(explicitBoolean(input)).toBeUndefined(); expect(parseAnswer(consent, input)).toEqual({ valid: false }); }
  });
  it('validates length, enum choices and required versus optional input', () => {
    const need = collect.config as Collect['config'];
    expect(parseAnswer(need, ' a '.repeat(1400))).toEqual({ valid: false });
    expect(parseAnswer(need, '  ')).toEqual({ valid: false });
    expect(parseAnswer(need, '  Synthetic need  ')).toEqual({ valid: true, value: 'Synthetic need' });
    const phone: Collect['config'] = { variable_key: 'phone', value_type: 'string', required: false, prompt: 'Phone?' };
    expect(parseAnswer(phone, ' ')).toEqual({ valid: true, value: null });
    expect(parseAnswer(phone, 'x'.repeat(33))).toEqual({ valid: false });
    const method: Collect['config'] = { variable_key: 'preferred_contact_method', value_type: 'enum', required: true, prompt: 'Method?', choices: ['phone', 'messenger'] };
    expect(parseAnswer(method, ' PHONE ')).toEqual({ valid: true, value: 'phone' });
    expect(parseAnswer(method, 'email')).toEqual({ valid: false });
  });
  it('renders literal untrusted answers without evaluating template syntax in values', () => {
    const node = validateGraph(base()).nodes.find(n => n.type === 'send_prompt')! as Extract<Graph['nodes'][number], { type: 'send_prompt' }>;
    expect(renderPrompt(node, { need_summary: '{{constructor}} $&' })).toBe('Nhu cầu: {{constructor}} $&');
    for (const values of [{}, { need_summary: {} }, { need_summary: true }, { need_summary: ' ' }, Object.create({ need_summary: 'inherited' })]) expect(() => renderPrompt(node, values)).toThrow('INVALID_CHATFLOW_VARIABLE');
    expect(() => renderPrompt(node, { need_summary: 'x'.repeat(4000) })).toThrow('INVALID_CHATFLOW_VARIABLE');
  });
});
