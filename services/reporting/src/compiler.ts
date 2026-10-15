import { Ajv } from 'ajv';
import { definitionSchema } from './definition-schema.js';
import { digest, refKey, type Registry } from './registry.js';
import type { AccessContext, Binding, Catalog, CompileResult, Definition, FieldDescriptor, Filter, Issue, MetricDescriptor } from './types.js';

const validateShape = new Ajv({ strict: true, allErrors: false, coerceTypes: false }).compile<Definition>(definitionSchema);
export function hasDefinitionShape(input:unknown):input is Definition{return validateShape(input);}
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const systemTenant = '01900000-0000-7000-8000-000000000001';
const decimal = /^-?(?:0|[1-9][0-9]{0,19})(?:\.[0-9]{1,8})?$/;
const currencies = new Set(Intl.supportedValuesOf('currency'));

function contextAllowed(ctx: AccessContext, binding: Binding): boolean {
  return uuid.test(ctx.tenantId) && uuid.test(ctx.principalId) && ctx.tenantId !== systemTenant &&
    ctx.tenantId !== '00000000-0000-0000-0000-000000000000' && binding.tenantId === ctx.tenantId &&
    /^[1-9][0-9]{0,19}$/.test(ctx.authRevision) && ctx.scopeFingerprint.length > 0 && ctx.scopeFingerprint.length <= 128 &&
    ctx.permissions.includes('report.design') && ctx.bindings.includes(binding.id) && binding.revision.length > 0 &&
    ['mock', 'connected'].includes(binding.environment);
}
function readable(registry: Registry, catalog: Catalog, ctx: AccessContext, binding: Binding, id: string): boolean {
  if (!registry.field(id)) return false;
  return registry.fieldInputs(id).every(key => {
    const f = registry.field(key)!; const object = catalog.objects.find(o => o.id === f.object)!;
    return ctx.objects.includes(f.object) && ctx.fields.includes(key) && binding.availableFields.includes(key) &&
      ctx.fields.includes(object.key) && binding.availableFields.includes(object.key);
  });
}

/** No object rows are returned. Native authorization must be resolved by the future HTTP adapter. */
export function visibleCatalog(registry: Registry, ctx: AccessContext, binding: Binding): Catalog {
  const empty: Catalog = { objects: [], fields: [], relations: [], metrics: [], models: [] };
  if (!contextAllowed(ctx, binding)) return empty;
  const c = registry.snapshot();
  const canRead = (id: string) => readable(registry, c, ctx, binding, id);
  const models = c.models.filter(m => binding.models.some(r => refKey(r) === refKey(m)) && canRead(m.timeField));
  if (!models.length) return empty;
  const relations = c.relations.filter(r => models.some(m => m.relations.includes(r.id)) && canRead(r.fromKey) && canRead(r.toKey));
  // Reachable metadata only: a partially admitted binding must not expose unrelated model fields.
  const objects = new Set(models.map(m => m.base));
  for (let pass = 0; pass < relations.length; pass++) for (const r of relations) if (objects.has(r.from)) objects.add(r.to);
  const metrics = c.metrics.filter(m => m.models.some(id => models.some(model => refKey(model) === id)) && registry.metricInputs(m).every(canRead));
  for (const metric of metrics) for (const key of registry.metricInputs(metric)) objects.add(registry.field(key)!.object);
  const fields = c.fields.filter(f => objects.has(f.object) && canRead(f.id));
  const fieldIds = new Set(fields.map(f => f.id));
  return {
    objects: c.objects.filter(o => objects.has(o.id) && canRead(o.key)), fields,
    relations: relations.filter(r => objects.has(r.from)),
    metrics: metrics.map(m => ({ ...m, dimensions: m.dimensions.filter(id => fieldIds.has(id)), models: m.models.filter(id => models.some(model => refKey(model) === id)) })),
    models: models.map(m => ({ ...m, relations: m.relations.filter(id => relations.some(r => r.id === id)) })),
  };
}

function boundedJson(input: unknown): boolean {
  let size = 0; let nodes = 0; const seen = new Set<object>();
  const visit = (value: unknown, depth: number): boolean => {
    if (++nodes > 6000 || depth > 12) return false;
    if (value !== null && typeof value === 'object') {
      if (seen.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false;
      seen.add(value);
      for (const [key, item] of Object.entries(value)) { size += key.length; if (size > 65536 || !visit(item, depth + 1)) return false; }
      seen.delete(value); return true;
    }
    if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) return false;
    if (typeof value === 'number' && !Number.isFinite(value)) return false;
    size += typeof value === 'string' ? value.length : 16; return size <= 65536;
  };
  return visit(input, 0) && Buffer.byteLength(JSON.stringify(input)) <= 65536;
}
function timestamp(value: string): boolean {
  const ms = Date.parse(value); if (!Number.isFinite(ms)) return false;
  return new Date(ms).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
}
function validOperand(f: FieldDescriptor, value: unknown): boolean {
  switch (f.type) {
    case 'integer': return typeof value === 'number' && Number.isSafeInteger(value);
    case 'decimal': case 'money': return typeof value === 'string' && decimal.test(value);
    case 'boolean': return typeof value === 'boolean';
    case 'datetime': return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && timestamp(value);
    case 'enum': return typeof value === 'string' && (!f.values || f.values.includes(value));
    default: return typeof value === 'string';
  }
}
function validFilter(f: FieldDescriptor, filter: Filter): boolean {
  if (!f.filterable) return false;
  if (filter.op === 'is_null') return !Object.hasOwn(filter, 'value');
  if ((filter.op === 'gte' || filter.op === 'lte') && !['integer', 'decimal', 'money', 'datetime'].includes(f.type)) return false;
  if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.every(v => validOperand(f, v));
  return !Array.isArray(filter.value) && validOperand(f, filter.value);
}
function sameSet(a: string[], b: string[]): boolean { return new Set(a).size === a.length && a.length === b.length && a.every(id => b.includes(id)); }

export function compileDefinition(registry: Registry, input: unknown, ctx: AccessContext, binding: Binding): CompileResult {
  const fail = (code: string, path = ''): CompileResult => ({ ok: false, issues: [{ code, path }] });
  if (!contextAllowed(ctx, binding)) return fail('ACCESS_DENIED');
  try { if (!boundedJson(input)) return fail('DEFINITION_LIMIT'); } catch { return fail('INVALID_DEFINITION'); }
  if (!validateShape(input)) return fail('INVALID_DEFINITION', validateShape.errors?.[0]?.instancePath ?? '');
  const d = structuredClone(input); const c = registry.snapshot(); const issues: Issue[] = [];
  const add = (code: string, path: string) => { issues.push({ code, path }); };
  if (d.bindingId !== binding.id) return fail('REFERENCE_UNAVAILABLE', '/bindingId');
  if (d.currency && !currencies.has(d.currency)) return fail('CURRENCY_UNSUPPORTED', '/currency');
  const model = c.models.find(m => refKey(m) === refKey(d.model));
  if (!model || !binding.models.some(m => refKey(m) === refKey(d.model))) return fail('REFERENCE_UNAVAILABLE', '/model');
  const requiredFields = new Set<string>();
  const useField = (id: string, path: string): FieldDescriptor | undefined => {
    if (!readable(registry, c, ctx, binding, id)) { add('REFERENCE_UNAVAILABLE', path); return undefined; }
    for (const key of registry.fieldInputs(id)) {
      requiredFields.add(key); const field = registry.field(key)!;
      requiredFields.add(c.objects.find(o => o.id === field.object)!.key);
    }
    return registry.field(id);
  };
  useField(model.timeField, '/time');
  const selected = [];
  for (const [i, id] of d.relations.entries()) {
    const r = c.relations.find(r => r.id === id && model.relations.includes(id));
    if (!r) { add('REFERENCE_UNAVAILABLE', `/relations/${i}`); continue; }
    useField(r.fromKey, `/relations/${i}`); useField(r.toKey, `/relations/${i}`);
    if (r.cardinality !== 'many_to_one') add('UNSAFE_RELATION', `/relations/${i}`);
    selected.push(r);
  }
  const reachable = new Set([model.base]); const pending = [...selected];
  while (pending.length) {
    const i = pending.findIndex(r => reachable.has(r.from)); if (i === -1) { add('DISCONNECTED_RELATION', '/relations'); break; }
    const r = pending.splice(i, 1)[0]!;
    if (reachable.has(r.to)) add('AMBIGUOUS_RELATION', '/relations'); reachable.add(r.to);
  }
  const selectedFields = [...d.dimensions, ...d.filters.map(f => f.field)];
  for (const [i, id] of selectedFields.entries()) {
    const path = i < d.dimensions.length ? `/dimensions/${i}` : `/filters/${i - d.dimensions.length}`;
    const f = useField(id, path); if (!f) continue;
    if (!reachable.has(f.object)) add('RELATION_REQUIRED', path);
    if (i < d.dimensions.length && !f.groupable) add('DIMENSION_UNSUPPORTED', path);
  }
  const metrics: MetricDescriptor[] = [];
  if (new Set(d.metrics.map(m => m.id)).size !== d.metrics.length) add('DUPLICATE_METRIC', '/metrics');
  for (const [i, ref] of d.metrics.entries()) {
    const m = c.metrics.find(m => refKey(m) === refKey(ref) && m.models.includes(refKey(model)));
    if (!m) { add('REFERENCE_UNAVAILABLE', `/metrics/${i}`); continue; }
    const inputs = registry.metricInputs(m);
    for (const key of inputs) useField(key, `/metrics/${i}`);
    if (d.dimensions.some(id => !m.dimensions.includes(id)) || d.filters.some(f => !m.dimensions.includes(f.field))) add('METRIC_DIMENSION_UNSUPPORTED', `/metrics/${i}`);
    if (m.unit === 'currency' && !d.currency) add('CURRENCY_REQUIRED', '/currency');
    metrics.push(m);
  }
  for (const [i, filter] of d.filters.entries()) {
    const f = registry.field(filter.field);
    if (f && readable(registry, c, ctx, binding, f.id) && !validFilter(f, filter)) add('FILTER_TYPE_UNSUPPORTED', `/filters/${i}`);
  }
  if (d.time.mode !== model.mode) add('TIME_MODE_UNSUPPORTED', '/time/mode');
  if (![d.time.from, d.time.to, d.time.asOf].every(timestamp) || Date.parse(d.time.from) >= Date.parse(d.time.to) || Date.parse(d.time.asOf) < Date.parse(d.time.to)) add('INVALID_WINDOW', '/time');
  try { if (/^[+-]/.test(d.time.timezone)) throw new Error(); new Intl.DateTimeFormat('en', { timeZone: d.time.timezone }); } catch { add('INVALID_TIMEZONE', '/time/timezone'); }
  if (model.periodBasis === 'utc_day' && (d.time.timezone !== 'UTC' || ![d.time.from, d.time.to].every(t => /T00:00:00(?:\.000)?Z$/.test(t)))) add('PROVIDER_PERIOD_UNSUPPORTED', '/time');
  const v = d.visualization; const metricIds = d.metrics.map(m => m.id);
  if (v.type === 'kpi' && (d.dimensions.length || d.metrics.length !== 1)) add('ENCODING_MISMATCH', '/visualization');
  if ('x' in v) {
    if (!sameSet([v.x, ...(v.series ? [v.series] : [])], d.dimensions) || !sameSet(v.y, metricIds)) add('ENCODING_MISMATCH', '/visualization');
    if ((v.type === 'line' || v.type === 'area') && registry.field(v.x)?.type !== 'datetime') add('TEMPORAL_AXIS_REQUIRED', '/visualization/x');
    if (['pie','donut','stacked_bar'].includes(v.type)) {
      if (metrics.length !== 1 || !metrics.every(m => ['sum','count'].includes(m.aggregation))) add('ADDITIVE_METRIC_REQUIRED', '/visualization/y');
      if (v.type === 'stacked_bar' ? !v.series : !!v.series || d.dimensions.length !== 1) add('ENCODING_MISMATCH', '/visualization');
    }
  }
  if (v.type === 'pivot' && (!sameSet([...v.rows, ...v.columns], d.dimensions) || !sameSet(v.values, metricIds))) add('ENCODING_MISMATCH', '/visualization');
  if (issues.length) {
    // Do not expose secondary type/cardinality diagnostics about inaccessible descriptors.
    const publicIssues = issues.some(x => x.code === 'REFERENCE_UNAVAILABLE') ? issues.filter(x => x.code === 'REFERENCE_UNAVAILABLE') : issues;
    return { ok: false, issues: publicIssues.filter((x, i, all) => all.findIndex(y => y.code === x.code && y.path === x.path) === i) };
  }
  const partitions = [...new Set(metrics.map(m => m.grain))].map(grain => ({ grain, metrics: metrics.filter(m => m.grain === grain).map(({ id, version }) => ({ id, version })) }));
  return { ok: true, plan: {
    kind: 'semantic_only', definition: d, catalogFingerprint: registry.fingerprint,
    fingerprint: digest({ definition: d, catalog: registry.fingerprint, tenant: ctx.tenantId, principal: ctx.principalId,
      auth: ctx.authRevision, scope: ctx.scopeFingerprint, binding: { id: binding.id, environment: binding.environment, revision: binding.revision } }),
    tenantId: ctx.tenantId, environment: binding.environment, bindingRevision: binding.revision, objects: [...reachable],
    requiredFields: [...requiredFields].sort(), partitions, totals: 'recompute', zeroDenominator: 'null',
  } };
}
