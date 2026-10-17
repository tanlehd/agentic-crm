export type FieldType = 'string' | 'enum' | 'reference' | 'integer' | 'decimal' | 'money' | 'datetime' | 'boolean';
export interface ObjectDescriptor { id: string; owner: string; grain: string; key: string }
export interface FieldDescriptor {
  id: string; object: string; label: string; type: FieldType; groupable: boolean; filterable: boolean;
  unit?: string; values?: string[]; requires?: string[];
}
export interface RelationDescriptor {
  id: string; from: string; to: string; fromKey: string; toKey: string;
  cardinality: 'many_to_one' | 'one_to_many' | 'many_to_many';
}
export interface MetricRef { id: string; version: number }
export interface MetricDescriptor extends MetricRef {
  label: string; grain: string; aggregation: 'count_distinct' | 'count' | 'sum' | 'avg' | 'min' | 'max' | 'ratio' | 'percentile';
  formula: string; unit: 'count' | 'percent' | 'currency' | 'seconds';
  inputs: string[]; requires: MetricRef[]; dimensions: string[]; models: string[];
}
export interface ModelDescriptor { id: string; version: number; base: string; timeField: string; mode: 'activity' | 'acquisition_cohort'; periodBasis: 'event' | 'utc_day'; relations: string[] }
export interface Catalog { objects: ObjectDescriptor[]; fields: FieldDescriptor[]; relations: RelationDescriptor[]; metrics: MetricDescriptor[]; models: ModelDescriptor[] }
export interface AccessContext {
  tenantId: string; principalId: string; authRevision: string; scopeFingerprint: string;
  permissions: readonly string[]; objects: readonly string[]; fields: readonly string[]; bindings: readonly string[];
}
export interface Binding {
  id: string; tenantId: string; environment: 'mock' | 'connected'; revision: string;
  models: readonly MetricRef[]; availableFields: readonly string[];
}
export interface Filter { field: string; op: 'eq' | 'in' | 'gte' | 'lte' | 'is_null'; value?: string | number | boolean | (string | number | boolean)[] }
export type Visualization =
  | { type: 'table' | 'kpi' }
  | { type: 'bar' | 'line' | 'horizontal_bar' | 'stacked_bar' | 'area' | 'pie' | 'donut'; x: string; y: string[]; series?: string }
  | { type: 'pivot'; rows: string[]; columns: string[]; values: string[] };
export interface Definition {
  schemaVersion: 1; model: MetricRef; bindingId: string; relations: string[]; dimensions: string[];
  metrics: MetricRef[]; filters: Filter[];
  time: { mode: 'activity' | 'acquisition_cohort'; from: string; to: string; asOf: string; timezone: string; bucket: 'day' | 'week' | 'month'; rollingDays?: number; horizonDays?: number };
  currency?: string; goal?: {metricId:string;target:string}; visualization: Visualization;
}
export interface Issue { code: string; path: string }
export interface SemanticPlan {
  kind: 'semantic_only'; definition: Definition; fingerprint: string; catalogFingerprint: string;
  tenantId: string; environment: Binding['environment']; bindingRevision: string; objects: string[];
  requiredFields: string[]; partitions: { grain: string; metrics: MetricRef[] }[];
  totals: 'recompute'; zeroDenominator: 'null';
}
export type CompileResult = { ok: false; issues: Issue[] } | { ok: true; plan: SemanticPlan };
