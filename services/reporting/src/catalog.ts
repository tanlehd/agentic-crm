import type { Catalog, FieldDescriptor, FieldType, MetricDescriptor, RelationDescriptor } from './types.js';

const catalog: Catalog = { objects: [], fields: [], relations: [], metrics: [], models: [] };
function object(id: string, owner: string, grain: string) {
  catalog.objects.push({ id, owner, grain, key: `${id}.id` }); field(id, 'id', 'reference');
}
function field(object: string, name: string, type: FieldType, groupable = true, values?: string[]) {
  const f: FieldDescriptor = { id: `${object}.${name}`, object, label: name.replaceAll('_', ' '), type, groupable, filterable: groupable };
  if (values) f.values = values; catalog.fields.push(f);
}
function relation(id: string, from: string, to: string, key: string, cardinality: RelationDescriptor['cardinality'] = 'many_to_one') {
  const fromKey = `${from}.${key}`; if (!catalog.fields.some(f => f.id === fromKey)) field(from, key, 'reference', false);
  catalog.relations.push({ id, from, to, fromKey, toKey: `${to}.id`, cardinality });
}
for (const [id, owner, grain] of [
  ['conversation', 'chat', 'thread'], ['session', 'chat', 'acquisition_session'], ['channel', 'channels', 'channel_identity'],
  ['contact', 'core', 'contact'], ['lead', 'sales', 'lead'], ['deal', 'sales', 'deal'], ['agent', 'identity', 'principal'], ['team', 'identity', 'team'],
  ['account', 'marketing', 'tenant_provider_account'], ['campaign', 'marketing', 'tenant_account_campaign'], ['ad_set', 'marketing', 'tenant_account_ad_set'],
  ['ad', 'marketing', 'tenant_account_ad'], ['creative', 'marketing', 'observed_creative'], ['page', 'channels', 'page_identity'],
  ['post', 'marketing', 'provider_post_ref'], ['media', 'marketing', 'provider_asset_ref'],
  ['insights_base', 'marketing', 'ad_day_query_revision'], ['insights_age', 'marketing', 'ad_day_age_query_revision'], ['insights_region', 'marketing', 'ad_day_region_query_revision'],
] as const) object(id, owner, grain);
field('session', 'opened_at', 'datetime'); field('session', 'source_kind', 'enum', true, ['paid', 'organic', 'unknown']);
field('session', 'first_response_seconds', 'integer', false); field('session', 'unanswered', 'boolean', false);
field('conversation', 'status', 'enum', true, ['open', 'closed']); field('channel', 'platform', 'string');
field('contact', 'created_at', 'datetime'); field('agent', 'kind', 'enum', true, ['human', 'ai']);
for (const id of ['agent', 'team', 'account', 'campaign', 'ad_set', 'ad', 'creative', 'page', 'post', 'media']) field(id, 'name', 'string');
field('account', 'currency', 'string'); field('creative', 'cta', 'string'); field('media', 'kind', 'string');
field('lead', 'origin_session_id', 'reference', false); field('lead', 'qualified_at', 'datetime', false);
field('deal', 'origin_session_id', 'reference', false); field('deal', 'lead_id', 'reference', false);
field('deal', 'stage', 'enum', false, ['open', 'won', 'lost']); field('deal', 'amount', 'money', false); field('deal', 'currency', 'string', false);
field('deal', 'closed_at', 'datetime', false); field('lead', 'created_at', 'datetime', false);
for (const id of ['insights_base', 'insights_age', 'insights_region']) {
  field(id, 'date_start', 'datetime'); field(id, 'currency', 'string');
  for (const name of ['impressions', 'clicks']) field(id, name, 'integer', false);
  field(id, 'spend', 'money', false); field(id, 'reach', 'integer', false);
}
field('insights_age', 'age', 'string'); field('insights_region', 'region', 'string');
relation('session_conversation', 'session', 'conversation', 'conversation_id');
relation('session_contact', 'session', 'contact', 'contact_id'); relation('session_channel', 'session', 'channel', 'channel_id');
relation('session_page', 'session', 'page', 'source_page_id'); relation('session_ad', 'session', 'ad', 'source_ad_id');
relation('session_initial_agent', 'session', 'agent', 'initial_agent_id'); relation('session_initial_team', 'session', 'team', 'initial_team_id');
relation('ad_adset', 'ad', 'ad_set', 'ad_set_id'); relation('adset_campaign', 'ad_set', 'campaign', 'campaign_id');
relation('campaign_account', 'campaign', 'account', 'account_id'); relation('ad_creative', 'ad', 'creative', 'observed_creative_id');
relation('creative_post', 'creative', 'post', 'post_id'); relation('creative_media', 'creative', 'media', 'asset_link_id', 'many_to_many');
// Unsafe relation is catalogued for explanation, never selectable for aggregated queries.
for (const id of ['insights_base', 'insights_age', 'insights_region']) relation(`${id}_ad`, id, 'ad', 'ad_id');
const hierarchy = ['ad_adset', 'adset_campaign', 'campaign_account', 'ad_creative', 'creative_post', 'creative_media'];
catalog.models.push({ id: 'acquisition', version: 1, base: 'session', timeField: 'session.opened_at', mode: 'acquisition_cohort', periodBasis: 'event', relations: [...catalog.relations.filter(r => r.from === 'session').map(r => r.id), ...hierarchy] });
for (const profile of ['base', 'age', 'region']) catalog.models.push({ id: `marketing_${profile}`, version: 1, base: `insights_${profile}`, timeField: `insights_${profile}.date_start`, mode: 'activity', periodBasis: 'utc_day', relations: [`insights_${profile}_ad`, ...hierarchy] });
const dimensionFields = (objects: string[]) => catalog.fields.filter(f => objects.includes(f.object) && f.groupable).map(f => f.id);
const acquisitionDimensions = dimensionFields(['session', 'conversation', 'contact', 'channel', 'page', 'agent', 'team', 'ad', 'ad_set', 'campaign', 'account', 'creative', 'post']);
function metric(id: string, grain: string, aggregation: MetricDescriptor['aggregation'], unit: MetricDescriptor['unit'], inputs: string[], formula: string, requires: string[] = []) {
  catalog.metrics.push({ id, version: 1, label: id.replaceAll('_', ' '), grain, aggregation, unit, inputs, formula,
    requires: requires.map(id => ({ id, version: 1 })), dimensions: [...acquisitionDimensions], models: ['acquisition@1'] });
}
metric('sessions_opened', 'session', 'count_distinct', 'count', ['session.id'], 'count_distinct(session.id)');
metric('engaged_contacts', 'session', 'count_distinct', 'count', ['session.contact_id', 'contact.id'], 'count_distinct(session.contact_id)');
metric('crm_leads', 'lead', 'count_distinct', 'count', ['session.id', 'lead.id', 'lead.origin_session_id', 'lead.created_at'], 'count_distinct(primary cohort lead.id)');
metric('sessions_with_lead', 'session', 'count_distinct', 'count', ['session.id', 'lead.id', 'lead.origin_session_id', 'lead.created_at'], 'count_distinct(session.id with primary lead)');
metric('session_to_lead_rate', 'session', 'ratio', 'percent', [], '100 * sessions_with_lead / sessions_opened', ['sessions_with_lead', 'sessions_opened']);
metric('deals_won', 'deal', 'count_distinct', 'count', ['session.id', 'deal.id', 'deal.origin_session_id', 'deal.stage', 'deal.closed_at'], 'count_distinct(primary cohort won deal.id)');
metric('won_value', 'deal', 'sum', 'currency', ['deal.amount', 'deal.currency'], 'sum(once per won deal.id, currency)', ['deals_won']);
metric('first_response_p95', 'session', 'percentile', 'seconds', ['session.id', 'session.first_response_seconds'], 'percentile_cont(0.95, responded sessions)');
for (const profile of ['base', 'age', 'region']) {
  const prefix = `insights_${profile}`;
  const dimensions = dimensionFields([prefix, 'ad', 'ad_set', 'campaign', 'account', 'creative', 'post']);
  const make = (id: string, aggregation: MetricDescriptor['aggregation'], unit: MetricDescriptor['unit'], inputs: string[], formula: string, requires: string[] = []) => {
    catalog.metrics.push({ id: `${profile}_${id}`, version: 1, label: `${profile} ${id}`, grain: prefix, aggregation, unit, inputs, formula,
      requires: requires.map(id => ({ id: `${profile}_${id}`, version: 1 })), dimensions: [...dimensions], models: [`marketing_${profile}@1`] });
  };
  for (const name of ['impressions', 'clicks']) make(name, 'sum', 'count', [`${prefix}.${name}`], `sum(canonical ${name})`);
  make('spend', 'sum', 'currency', [`${prefix}.spend`, `${prefix}.currency`], 'sum(canonical spend by currency)');
  make('ctr', 'ratio', 'percent', [], '100 * clicks / impressions', ['clicks', 'impressions']);
  make('cpc', 'ratio', 'currency', [], 'spend / clicks', ['spend', 'clicks']);
  make('cpm', 'ratio', 'currency', [], '1000 * spend / impressions', ['spend', 'impressions']);
}
// Export a template; createRegistry clones and validates it before use.
export const catalogV1: Catalog = catalog;
