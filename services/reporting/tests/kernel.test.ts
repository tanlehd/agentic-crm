import { describe, expect, it } from 'vitest';
import { catalogV1, createRegistry, compileDefinition, visibleCatalog } from '../src/index.js';
import type { AccessContext, Binding, Catalog, CompileResult, Definition } from '../src/types.js';

const tenantA = '01900000-0000-7000-8000-000000000021';
const tenantB = '01900000-0000-7000-8000-000000000022';
const registry = createRegistry(catalogV1);
function access(catalog = catalogV1): AccessContext { return {
  tenantId: tenantA, principalId: '01900000-0000-7000-8000-000000000031', authRevision: '1', scopeFingerprint: 'synthetic_all',
  permissions: ['report.design'], objects: catalog.objects.map(o => o.id), fields: catalog.fields.map(f => f.id), bindings: ['synthetic_v1'],
}; }
function binding(catalog = catalogV1): Binding { return { id: 'synthetic_v1', tenantId: tenantA, environment: 'mock', revision: 'fixture_g1_v1', models: catalog.models.map(({ id, version }) => ({ id, version })), availableFields: catalog.fields.map(f => f.id) }; }
function definition(): Definition { return {
  schemaVersion: 1, model: { id: 'acquisition', version: 1 }, bindingId: 'synthetic_v1', relations: ['session_ad', 'ad_adset', 'adset_campaign'],
  dimensions: ['campaign.name', 'session.opened_at'], metrics: [{ id: 'sessions_opened', version: 1 }, { id: 'session_to_lead_rate', version: 1 }],
  filters: [{ field: 'session.source_kind', op: 'eq', value: 'paid' }],
  time: { mode: 'acquisition_cohort', from: '2026-09-01T00:00:00Z', to: '2026-10-01T00:00:00Z', asOf: '2026-10-10T00:00:00Z', timezone: 'Asia/Ho_Chi_Minh', bucket: 'week' },
  visualization: { type: 'pivot', rows: ['campaign.name'], columns: ['session.opened_at'], values: ['sessions_opened', 'session_to_lead_rate'] },
}; }
function marketing(): Definition {
  const d = definition(); d.model = { id: 'marketing_base', version: 1 }; d.relations = ['insights_base_ad', 'ad_adset', 'adset_campaign'];
  d.dimensions = ['campaign.name']; d.metrics = [{ id: 'base_spend', version: 1 }, { id: 'base_ctr', version: 1 }];
  d.currency = 'USD'; d.filters = []; d.time.mode = 'activity'; d.time.timezone = 'UTC'; d.visualization = { type: 'bar', x: 'campaign.name', y: ['base_spend', 'base_ctr'] }; return d;
}
function run(d: unknown = definition(), ctx = access(), b = binding(), r = registry) { return compileDefinition(r, d, ctx, b); }
function codes(result: CompileResult): string[] { return result.ok ? [] : result.issues.map(i => i.code); }
function fingerprint(result: CompileResult): string { expect(result.ok).toBe(true); if (!result.ok) throw new Error('Expected valid definition'); return result.plan.fingerprint; }

describe('versioned Reporting catalog', () => {
  it('registers the requested objects and four distinct data profiles', () => {
    expect(registry.snapshot().objects.map(o => o.id)).toEqual(expect.arrayContaining(['conversation', 'session', 'channel', 'campaign', 'ad_set', 'ad', 'page', 'post', 'media', 'team', 'agent']));
    expect(registry.snapshot().models.map(m => m.id)).toEqual(['acquisition', 'marketing_base', 'marketing_age', 'marketing_region']);
  });
  it('rejects duplicate fields and dangling relationship keys', () => {
    const c = structuredClone(catalogV1); c.fields.push(c.fields[0]!); expect(() => createRegistry(c)).toThrow('DUPLICATE_FIELD');
    const d = structuredClone(catalogV1); d.relations[0]!.toKey = 'absent.key'; expect(() => createRegistry(d)).toThrow('INVALID_REFERENCE');
  });
  it('rejects cyclic metric and property dependency graphs', () => {
    const c = structuredClone(catalogV1); c.metrics[0]!.requires = [{ id: c.metrics[0]!.id, version: 1 }]; expect(() => createRegistry(c)).toThrow('METRIC_CYCLE');
    const d = structuredClone(catalogV1); d.fields[0]!.requires = [d.fields[0]!.id]; expect(() => createRegistry(d)).toThrow('FIELD_CYCLE');
  });
  it('prevents a derived metric widening allowed dimensions beyond its dependencies', () => {
    const c = structuredClone(catalogV1); c.metrics.find(m => m.id === 'session_to_lead_rate')!.dimensions.push('media.name');
    expect(() => createRegistry(c)).toThrow('INVALID_REFERENCE');
  });
  it('isolates registry from mutations to input and returned views', () => {
    const c = structuredClone(catalogV1); const r = createRegistry(c); const original = fingerprint(run(definition(), access(), binding(), r));
    c.fields.length = 0; r.snapshot().metrics.length = 0; r.field('session.id')!.groupable = false;
    const view = visibleCatalog(r, access(), binding()); view.models.length = 0;
    expect(fingerprint(run(definition(), access(), binding(), r))).toBe(original);
  });
});

describe('report compiler security and boundaries', () => {
  it.each(['horizontal_bar','stacked_bar','area','pie','donut'] as const)('accepts %s and rejects incompatible encoding', type => {
    const d=marketing();d.metrics=[{id:'base_spend',version:1}];
    d.dimensions=type==='area'?['insights_base.date_start']:type==='stacked_bar'?['campaign.name','insights_base.date_start']:['campaign.name'];
    d.visualization={type,x:d.dimensions[0]!,y:['base_spend'],...(type==='stacked_bar'?{series:'insights_base.date_start'}:{})};
    expect(run(d).ok).toBe(true);
    d.visualization.x='ad.name';expect(codes(run(d))).toContain('ENCODING_MISMATCH');
  });
  it('requires temporal area and additive single-metric compositions',()=>{
    const d=marketing();d.metrics=[{id:'base_ctr',version:1}];d.visualization={type:'pie',x:'campaign.name',y:['base_ctr']};expect(codes(run(d))).toContain('ADDITIVE_METRIC_REQUIRED');
    d.visualization={type:'area',x:'campaign.name',y:['base_ctr']};expect(codes(run(d))).toContain('TEMPORAL_AXIS_REQUIRED');
    d.metrics=[{id:'base_spend',version:1}];d.visualization={type:'stacked_bar',x:'campaign.name',y:['base_spend']};expect(codes(run(d))).toContain('ENCODING_MISMATCH');
    d.dimensions.push('insights_base.date_start');d.visualization={type:'donut',x:'campaign.name',y:['base_spend'],series:'insights_base.date_start'};expect(codes(run(d))).toContain('ENCODING_MISMATCH');
  });
  it('returns semantic-only partitions and transitive input requirements, no SQL', () => {
    const result = run(); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.plan.kind).toBe('semantic_only'); expect(result.plan.requiredFields).toContain('lead.origin_session_id');
    expect(result.plan.totals).toBe('recompute'); expect(result.plan.zeroDenominator).toBe('null'); expect(result.plan).not.toHaveProperty('sql');
  });
  it.each([
    ['tenant mismatch', { tenantId: tenantB }], ['system tenant', { tenantId: '01900000-0000-7000-8000-000000000001' }],
    ['missing context', { tenantId: '' }], ['missing right', { permissions: [] }], ['missing binding right', { bindings: [] }],
    ['missing scope', { scopeFingerprint: '' }], ['missing auth revision', { authRevision: '' }],
  ])('rejects %s', (_name, patch) => {
    const ctx = { ...access(), ...patch }; expect(codes(run(definition(), ctx))).toEqual(['ACCESS_DENIED']);
    expect(visibleCatalog(registry, ctx, binding()).objects).toHaveLength(0);
  });
  it.each(['lead.created_at', 'session.opened_at', 'session.source_kind', 'session.source_ad_id', 'campaign.id'])('checks denied %s in inputs, time, filter or relationship', field => {
    const ctx = access(); ctx.fields = ctx.fields.filter(f => f !== field);
    expect(codes(run(definition(), ctx))).toContain('REFERENCE_UNAVAILABLE');
  });
  it('removes metrics with hidden dependencies from catalog, including derived metrics', () => {
    const ctx = access(); ctx.fields = ctx.fields.filter(f => f !== 'lead.id');
    const view = visibleCatalog(registry, ctx, binding());
    expect(view.metrics.map(m => m.id)).not.toContain('session_to_lead_rate'); expect(view.metrics.map(m => m.id)).toContain('sessions_opened');
    expect(view.fields.map(f => f.id)).not.toContain('lead.created_at');
  });
  it('requires producer field availability, not only permission', () => {
    const b = binding(); b.availableFields = b.availableFields.filter(f => f !== 'lead.origin_session_id');
    expect(codes(run(definition(), access(), b))).toContain('REFERENCE_UNAVAILABLE');
  });
  it('does not disclose secondary field type or relation diagnostics when access is denied', () => {
    const d = definition(); d.dimensions = ['media.name']; d.visualization = { type: 'table' };
    const ctx = access(); ctx.fields = ctx.fields.filter(f => f !== 'media.name');
    expect(codes(run(d, ctx))).toEqual(['REFERENCE_UNAVAILABLE']);
  });
  it('rejects binding and version overrides', () => {
    const d = definition(); d.bindingId = 'other'; expect(codes(run(d))).toContain('REFERENCE_UNAVAILABLE');
    d.bindingId = 'synthetic_v1'; d.model.version = 2; expect(codes(run(d))).toContain('REFERENCE_UNAVAILABLE');
    d.model.version = 1; d.metrics[0]!.version = 2; expect(codes(run(d))).toContain('REFERENCE_UNAVAILABLE');
  });
  it('fingerprints tenant, principal, authorization, scope and source revision independently', () => {
    const original = fingerprint(run()); const fingerprints = [original];
    for (const patch of [{ tenantId: tenantB }, { principalId: tenantB }, { authRevision: '2' }, { scopeFingerprint: 'team_only' }]) {
      const ctx = { ...access(), ...patch }; fingerprints.push(fingerprint(run(definition(), ctx, { ...binding(), tenantId: ctx.tenantId })));
    }
    fingerprints.push(fingerprint(run(definition(), access(), { ...binding(), revision: 'fixture_g1_v2' })));
    fingerprints.push(fingerprint(run(definition(), access(), { ...binding(), environment: 'connected' })));
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
    const reordered = Object.fromEntries(Object.entries(definition()).reverse()); expect(fingerprint(run(reordered))).toBe(original);
  });
  it.each([{ sql: 'SELECT * FROM any_schema' }, { tenantId: tenantB }, { expressions: 'arbitrary_code' }])('rejects undeclared executable/security props %j', props => {
    expect(codes(run({ ...definition(), ...props }))).toContain('INVALID_DEFINITION');
  });
  it('rejects oversized, circular, excessively nested and malformed inputs without throwing', () => {
    expect(codes(run({ ...definition(), extra: 'x'.repeat(70000) }))).toContain('DEFINITION_LIMIT');
    const cycle: Record<string, unknown> = {}; cycle.self = cycle; expect(codes(run(cycle))).toContain('DEFINITION_LIMIT');
    let nested: unknown = 1; for (let i = 0; i < 14; i++) nested = { value: nested };
    expect(codes(run(nested))).toContain('DEFINITION_LIMIT'); expect(run(null).ok).toBe(false); expect(run('sql').ok).toBe(false);
  });
});

describe('grain, time and visualization semantics', () => {
  it('accepts admitted base ad totals and keeps currency explicit', () => {
    expect(run(marketing()).ok).toBe(true); const d = marketing(); delete d.currency; expect(codes(run(d))).toContain('CURRENCY_REQUIRED');
  });
  it('does not combine CRM conversions with age/region observations', () => {
    const d = marketing(); d.model.id = 'marketing_age'; d.relations = ['insights_age_ad', 'ad_adset', 'adset_campaign'];
    d.metrics = [{ id: 'session_to_lead_rate', version: 1 }]; d.visualization = { type: 'table' };
    expect(codes(run(d))).toContain('REFERENCE_UNAVAILABLE');
    d.metrics = [{ id: 'age_spend', version: 1 }]; d.dimensions = ['insights_age.age']; expect(run(d).ok).toBe(true);
    d.dimensions.push('insights_region.region'); expect(codes(run(d))).toContain('METRIC_DIMENSION_UNSUPPORTED');
  });
  it('does not allow spend to be grouped by an agent or raw measures summed as dimensions', () => {
    const d = marketing(); d.dimensions = ['agent.name']; d.visualization = { type: 'table' }; expect(codes(run(d))).toContain('METRIC_DIMENSION_UNSUPPORTED');
    d.dimensions = ['insights_base.spend']; expect(codes(run(d))).toContain('DIMENSION_UNSUPPORTED');
  });
  it('rejects unknown currency codes rather than treating arbitrary labels as money', () => {
    const d = marketing(); d.currency = 'AAA'; expect(codes(run(d))).toContain('CURRENCY_UNSUPPORTED');
  });
  it('enforces declared dimension limits and rejects unsupported chart types', () => {
    const d = definition(); d.dimensions = ['session.id', 'session.opened_at', 'session.source_kind', 'ad.id', 'ad.name'];
    expect(codes(run(d))).toContain('INVALID_DEFINITION');
    expect(codes(run({ ...definition(), visualization: { type: 'arbitrary_renderer' } }))).toContain('INVALID_DEFINITION');
  });
  it('uses graph topology rather than caller ordering, and rejects ambiguous target paths', () => {
    const d = definition(); d.relations.reverse(); expect(run(d).ok).toBe(true);
    const c = structuredClone(catalogV1); c.relations.push({ id: 'session_second_ad', from: 'session', to: 'ad', fromKey: 'session.source_ad_id', toKey: 'ad.id', cardinality: 'many_to_one' });
    c.models[0]!.relations.push('session_second_ad'); d.relations.push('session_second_ad');
    expect(codes(run(d, access(c), binding(c), createRegistry(c)))).toContain('AMBIGUOUS_RELATION');
  });
  it('rejects media fan-out and disconnected join paths', () => {
    const d = definition(); d.relations = ['session_ad', 'ad_creative', 'creative_media']; d.dimensions = ['media.name']; d.visualization = { type: 'table' };
    expect(codes(run(d))).toContain('UNSAFE_RELATION');
    d.relations = ['adset_campaign']; expect(codes(run(d))).toContain('DISCONNECTED_RELATION');
  });
  it('requires an explicit path for every selected dimension and rejects row filters that change a cohort denominator', () => {
    const d = definition(); d.relations = []; expect(codes(run(d))).toContain('RELATION_REQUIRED');
    d.filters = [{ field: 'lead.qualified_at', op: 'is_null' }]; expect(codes(run(d))).toContain('METRIC_DIMENSION_UNSUPPORTED');
  });
  it.each([
    { field: 'session.source_kind', op: 'eq', value: 'imaginary' },
    { field: 'session.source_kind', op: 'gte', value: 'paid' },
    { field: 'session.source_kind', op: 'in', value: 'paid' },
    { field: 'session.source_kind', op: 'is_null', value: true },
    { field: 'session.opened_at', op: 'eq', value: '2026-02-30T00:00:00Z' },
  ])('rejects invalid typed filter %j', filter => {
    const d = definition(); expect(codes(run({ ...d, filters: [filter] }))).toContain('FILTER_TYPE_UNSUPPORTED');
  });
  it.each([
    { from: '2026-02-30T00:00:00Z' }, { from: '2026-10-01T00:00:00.000Z' },
    { asOf: '2026-09-30T00:00:00Z' }, { timezone: 'invalid/zone' }, { mode: 'activity' },
  ])('rejects incompatible time inputs %j', patch => {
    const d = definition(); expect(run({ ...d, time: { ...d.time, ...patch } }).ok).toBe(false);
  });
  it('does not rebucket provider daily totals or accept partial ad-day windows', () => {
    const d = marketing(); d.time.timezone = 'Asia/Ho_Chi_Minh'; expect(codes(run(d))).toContain('PROVIDER_PERIOD_UNSUPPORTED');
    d.time.timezone = 'UTC'; d.time.from = '2026-09-01T01:00:00Z'; expect(codes(run(d))).toContain('PROVIDER_PERIOD_UNSUPPORTED');
  });
  it('validates chart encoding rather than silently dropping selections', () => {
    const d = definition(); d.visualization = { type: 'bar', x: 'campaign.name', y: ['sessions_opened'] };
    expect(codes(run(d))).toContain('ENCODING_MISMATCH');
    d.visualization = { type: 'line', x: 'session.opened_at', series: 'campaign.name', y: d.metrics.map(m => m.id) }; expect(run(d).ok).toBe(true);
    d.visualization = { type: 'line', x: 'campaign.name', series: 'session.opened_at', y: d.metrics.map(m => m.id) }; expect(codes(run(d))).toContain('TEMPORAL_AXIS_REQUIRED');
  });
  it('validates pivot dimension overlap and KPI cardinality', () => {
    const d = definition(); d.visualization = { type: 'pivot', rows: ['campaign.name'], columns: ['campaign.name'], values: d.metrics.map(m => m.id) };
    expect(codes(run(d))).toContain('ENCODING_MISMATCH'); d.visualization = { type: 'kpi' }; expect(codes(run(d))).toContain('ENCODING_MISMATCH');
    d.dimensions = []; d.metrics = [{ id: 'sessions_opened', version: 1 }]; expect(run(d).ok).toBe(true);
  });
});

describe('descriptor-only extension proof', () => {
  function extend(): Catalog {
    const c = structuredClone(catalogV1);
    c.fields.push({ id: 'session.intent_score', object: 'session', label: 'Intent score', type: 'decimal', groupable: true, filterable: true });
    c.objects.push({ id: 'offering', key: 'offering.id', owner: 'synthetic_extension', grain: 'offering' });
    c.fields.push({ id: 'offering.id', object: 'offering', label: 'Offering ID', type: 'reference', groupable: true, filterable: true },
      { id: 'offering.created_at', object: 'offering', label: 'Created', type: 'datetime', groupable: true, filterable: true });
    c.models.push({ id: 'offering_model', version: 1, base: 'offering', timeField: 'offering.created_at', mode: 'activity', periodBasis: 'event', relations: [] });
    c.metrics.push({ id: 'offering_count', version: 1, label: 'Offerings', grain: 'offering', aggregation: 'count_distinct', unit: 'count', formula: 'count_distinct(offering.id)', inputs: ['offering.id'], requires: [], dimensions: ['offering.id', 'offering.created_at'], models: ['offering_model@1'] });
    c.metrics.find(m => m.id === 'sessions_opened')!.dimensions.push('session.intent_score'); return c;
  }
  it('supports a typed custom field and a new source/model without compiler branches', () => {
    const c = extend(); const r = createRegistry(c); const ctx = access(c); const b = binding(c); const d = definition();
    d.metrics = [{ id: 'sessions_opened', version: 1 }]; d.visualization = { type: 'table' }; d.filters = [{ field: 'session.intent_score', op: 'gte', value: '7.25' }];
    expect(run(d, ctx, b, r).ok).toBe(true); d.filters[0]!.value = 7; expect(codes(run(d, ctx, b, r))).toContain('FILTER_TYPE_UNSUPPORTED');
    d.model.id = 'offering_model'; d.relations = []; d.dimensions = ['offering.id']; d.filters = []; d.metrics = [{ id: 'offering_count', version: 1 }]; d.time.mode = 'activity';
    expect(run(d, ctx, b, r).ok).toBe(true);
    // A new deployment catalog changes its fingerprint, but old published registry semantics remain stable.
    expect(run(definition()).ok).toBe(true); expect(registry.snapshot().models).toHaveLength(4);
  });
});
