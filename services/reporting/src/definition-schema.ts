const identifier = { type: 'string', minLength: 1, maxLength: 120, pattern: '^[a-z][a-z0-9_.]*$' };
const list = (maxItems: number, minItems = 0) => ({ type: 'array', items: identifier, uniqueItems: true, minItems, maxItems });
const ref = { type: 'object', additionalProperties: false, required: ['id', 'version'], properties: { id: identifier, version: { type: 'integer', minimum: 1, maximum: 1000000 } } };
const scalar = { anyOf: [{ type: 'string', maxLength: 255 }, { type: 'integer', minimum: -9007199254740991, maximum: 9007199254740991 }, { type: 'boolean' }] };
const timestamp = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$' };
export const definitionSchema = {
  $id: 'urn:agentic-crm:reporting:definition:1', type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'model', 'bindingId', 'relations', 'dimensions', 'metrics', 'filters', 'time', 'visualization'],
  properties: {
    schemaVersion: { const: 1 }, model: ref, bindingId: {anyOf:[identifier,{type:'string',pattern:'^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$'}]},
    relations: list(5), dimensions: list(4), metrics: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: ref },
    filters: { type: 'array', maxItems: 20, items: {
      type: 'object', additionalProperties: false, required: ['field', 'op'],
      properties: { field: identifier, op: { enum: ['eq', 'in', 'gte', 'lte', 'is_null'] }, value: { anyOf: [...scalar.anyOf, { type: 'array', minItems: 1, maxItems: 50, uniqueItems: true, items: scalar }] } },
    } },
    time: { type: 'object', additionalProperties: false, required: ['mode', 'from', 'to', 'asOf', 'timezone', 'bucket'], properties: {
      rollingDays: {type:'integer',minimum:1,maximum:365}, horizonDays:{type:'integer',minimum:1,maximum:90}, mode: { enum: ['activity', 'acquisition_cohort'] }, from: timestamp, to: timestamp, asOf: timestamp,
      timezone: { type: 'string', minLength: 1, maxLength: 80 }, bucket: { enum: ['day', 'week', 'month'] },
    } },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    goal:{type:'object',additionalProperties:false,required:['metricId','target'],properties:{metricId:identifier,target:{type:'string',pattern:'^(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$'}}},
    visualization: { oneOf: [
      { type: 'object', additionalProperties: false, required: ['type'], properties: { type: { enum: ['table', 'kpi'] } } },
      { type: 'object', additionalProperties: false, required: ['type', 'x', 'y'], properties: { type: { enum: ['bar', 'line', 'horizontal_bar', 'stacked_bar', 'area', 'pie', 'donut'] }, x: identifier, y: list(8, 1), series: identifier } },
      { type: 'object', additionalProperties: false, required: ['type', 'rows', 'columns', 'values'], properties: { type: { const: 'pivot' }, rows: list(3), columns: list(2), values: list(8, 1) } },
    ] },
  },
} as const;
