import { createHash } from 'node:crypto';
import type { Catalog, FieldDescriptor, MetricRef } from './types.js';

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function digest(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
export function refKey(ref: MetricRef): string { return `${ref.id}@${ref.version}`; }
function unique(values: string[], kind: string): void {
  if (new Set(values).size !== values.length) throw new Error(`CATALOG_DUPLICATE_${kind}`);
}
function check(ok: unknown): asserts ok { if (!ok) throw new Error('CATALOG_INVALID_REFERENCE'); }

export function createRegistry(input: Catalog) {
  // Private clone; consumers only get clones, so published descriptors cannot be mutated.
  const catalog: Catalog = structuredClone(input);
  unique(catalog.objects.map(x => x.id), 'OBJECT'); unique(catalog.fields.map(x => x.id), 'FIELD');
  unique(catalog.relations.map(x => x.id), 'RELATION'); unique(catalog.metrics.map(refKey), 'METRIC'); unique(catalog.models.map(refKey), 'MODEL');
  const objects = new Map(catalog.objects.map(x => [x.id, x]));
  const fields = new Map(catalog.fields.map(x => [x.id, x]));
  const relations = new Map(catalog.relations.map(x => [x.id, x]));
  const metrics = new Map(catalog.metrics.map(x => [refKey(x), x]));
  const models = new Map(catalog.models.map(x => [refKey(x), x]));
  for (const entry of [...catalog.objects, ...catalog.fields, ...catalog.relations, ...catalog.metrics, ...catalog.models]) check(/^[a-z][a-z0-9_.]{0,119}$/.test(entry.id));
  for (const object of objects.values()) check(fields.get(object.key)?.object === object.id && object.owner && object.grain);
  for (const f of fields.values()) {
    check(objects.has(f.object) && f.id.startsWith(`${f.object}.`));
    check(['string', 'enum', 'reference', 'integer', 'decimal', 'money', 'datetime', 'boolean'].includes(f.type));
    for (const dep of f.requires ?? []) check(fields.has(dep));
  }
  for (const r of relations.values()) check(fields.get(r.fromKey)?.object === r.from && fields.get(r.toKey)?.object === r.to);
  for (const m of models.values()) {
    check(['event', 'utc_day'].includes(m.periodBasis));
    check(Number.isSafeInteger(m.version) && m.version > 0 && objects.has(m.base) && fields.get(m.timeField)?.object === m.base && fields.get(m.timeField)?.type === 'datetime');
    unique(m.relations, 'MODEL_RELATION'); for (const r of m.relations) check(relations.has(r));
  }
  for (const m of metrics.values()) {
    check(Number.isSafeInteger(m.version) && m.version > 0 && m.inputs.length + m.requires.length > 0);
    for (const f of m.inputs) check(fields.has(f));
    for (const d of m.dimensions) check(fields.get(d)?.groupable);
    for (const model of m.models) check(models.has(model));
    for (const dep of m.requires) {
      const required = metrics.get(refKey(dep)); check(required);
      check(m.models.every(id => required.models.includes(id)) && m.dimensions.every(id => required.dimensions.includes(id)));
    }
  }
  function fieldInputs(id: string, path = new Set<string>()): string[] {
    if (path.has(id)) throw new Error('CATALOG_FIELD_CYCLE');
    const f = fields.get(id); check(f); const next = new Set(path).add(id);
    return [...new Set([id, ...(f.requires ?? []).flatMap(dep => fieldInputs(dep, next))])];
  }
  function metricInputs(ref: MetricRef, path = new Set<string>()): string[] {
    const key = refKey(ref); if (path.has(key)) throw new Error('CATALOG_METRIC_CYCLE');
    const m = metrics.get(key); check(m); const next = new Set(path).add(key);
    return [...new Set([...m.inputs.flatMap(f => fieldInputs(f)), ...m.requires.flatMap(dep => metricInputs(dep, next))])];
  }
  for (const f of fields.keys()) fieldInputs(f);
  for (const m of metrics.values()) metricInputs(m);
  return {
    fingerprint: digest(catalog),
    snapshot: (): Catalog => structuredClone(catalog),
    field: (id: string): FieldDescriptor | undefined => { const f = fields.get(id); return f ? structuredClone(f) : undefined; },
    fieldInputs, metricInputs,
  };
}
export type Registry = ReturnType<typeof createRegistry>;
