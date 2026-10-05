import { Ajv } from 'ajv';
import { chatflowSchema, type ChatflowGraph } from '@agentic-crm/contracts';
import { CommandError } from '../../kernel/reliability/commands.js';

export type Graph = ChatflowGraph;
export type Node = Graph['nodes'][number];
export type Collect = Extract<Node, { type: 'collect' }>;
export type Variable = Collect['config']['variable_key'];
export type Answer = { valid: true; value: string | boolean | null } | { valid: false };
const ajv = new Ajv({ strict: true });
ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const wire = ajv.compile(chatflowSchema);
const bad = (): never => { throw new CommandError(422, 'INVALID_CHATFLOW_GRAPH'); };
const limits: Record<Variable, number> = { service_interest: 255, need_summary: 4000, phone: 32, preferred_contact_method: 32, contact_permission: 32 };

export function edges(node: Node): string[] {
  if (node.type === 'end') return [];
  if (node.type === 'validate_qualification') return [node.config.on_valid, node.config.on_invalid];
  return [node.next];
}

// Reject interpolation syntax other than a declared, flat variable placeholder.
function placeholders(text: string): string[] {
  const matches = [...text.matchAll(/\{\{([a-z][a-z0-9_]{0,47})\}\}/g)];
  if (text.replace(/\{\{([a-z][a-z0-9_]{0,47})\}\}/g, '').match(/[{}]/)) bad();
  return [...new Set(matches.map(match => match[1]!))];
}

export function validateGraph(value: unknown): Graph {
  if (!wire(value)) bad();
  const graph = value as Graph;
  const nodes = new Map(graph.nodes.map(node => [node.key, node]));
  if (nodes.size !== graph.nodes.length || !nodes.has(graph.entry_node)) bad();
  const visited = new Set<string>(), visiting = new Set<string>(), order: string[] = [];
  function visit(key: string): void {
    if (visiting.has(key) || !nodes.has(key)) bad();
    if (visited.has(key)) return;
    visiting.add(key);
    for (const next of edges(nodes.get(key)!)) visit(next);
    visiting.delete(key); visited.add(key); order.unshift(key);
  }
  visit(graph.entry_node);
  if (visited.size !== nodes.size) bad();
  const dominators = new Map<string, Set<string>>();
  for (const key of order) {
    const parents = graph.nodes.filter(node => edges(node).includes(key)).map(node => node.key);
    const shared = parents.length ? new Set([...dominators.get(parents[0]!)!, parents[0]!]) : new Set<string>();
    for (const parent of parents.slice(1)) for (const ancestor of shared) {
      if (ancestor !== parent && !dominators.get(parent)!.has(ancestor)) shared.delete(ancestor);
    }
    dominators.set(key, shared);
  }
  const producers = new Map<Variable, string>();
  for (const node of graph.nodes) if (node.type === 'collect') {
    if (producers.has(node.config.variable_key) || node.config.prompt.length > 4000 || /[{}]/.test(node.config.prompt)) bad();
    producers.set(node.config.variable_key, node.key);
  }
  for (const node of graph.nodes) if (node.type === 'send_prompt') {
    if (node.config.text.length > 4000) bad();
    const refs = placeholders(node.config.text);
    if (refs.length !== node.config.variable_refs.length || refs.some(ref => !new Set<string>(node.config.variable_refs).has(ref))) bad();
    for (const ref of node.config.variable_refs) {
      const producer = producers.get(ref);
      if (!producer || !dominators.get(node.key)!.has(producer)) bad();
    }
  }
  return structuredClone(graph);
}

// Only an answer to the bound consent collect can be used as consent evidence.
// This parser intentionally does not inspect an LLM proposal or infer intent.
export function explicitBoolean(input: unknown): boolean | undefined {
  if (typeof input !== 'string' || input.length > 32) return undefined;
  const text = input.normalize('NFC').trim().toLowerCase();
  if (['yes', 'true', 'đồng ý'].includes(text)) return true;
  if (['no', 'false', 'không đồng ý'].includes(text)) return false;
  return undefined;
}

export function parseAnswer(config: Collect['config'], input: unknown): Answer {
  if (typeof input !== 'string' || input.length > 4000) return { valid: false };
  const text = input.normalize('NFC').trim();
  if (!text) return config.required ? { valid: false } : { valid: true, value: null };
  if (text.length > limits[config.variable_key]) return { valid: false };
  if (config.value_type === 'boolean') {
    const value = explicitBoolean(input);
    return value === undefined ? { valid: false } : { valid: true, value };
  }
  if (config.value_type === 'enum') {
    const value = config.choices.find(choice => choice === text.toLowerCase());
    return value === undefined ? { valid: false } : { valid: true, value };
  }
  return { valid: true, value: text };
}

export function renderPrompt(node: Extract<Node, { type: 'send_prompt' }>, values: Partial<Record<Variable, unknown>>): string {
  const invalid = (): never => { throw new CommandError(422, 'INVALID_CHATFLOW_VARIABLE'); };
  const rendered = node.config.text.replace(/\{\{([a-z][a-z0-9_]{0,47})\}\}/g, (_, key: Variable) => {
    if (!Object.hasOwn(limits, key) || !Object.hasOwn(values, key)) return invalid();
    const value = values[key];
    if (value === null && key === 'phone') return '';
    if (key === 'contact_permission' ? typeof value !== 'boolean' : typeof value !== 'string') return invalid();
    if (typeof value === 'string' && (!value.trim() || value.length > limits[key])) return invalid();
    if (key === 'preferred_contact_method' && !['messenger', 'phone'].includes(String(value))) return invalid();
    return String(value);
  });
  if (!rendered.trim() || rendered.length > 4000) invalid();
  return rendered;
}
