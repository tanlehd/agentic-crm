import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync(new URL('./schemas/health.json', import.meta.url), 'utf8'));
const validate = new Ajv({ strict: true, allErrors: true }).compile(schema);

describe('public readiness boundary', () => {
  it('represents an unconfigured scaffold without claiming readiness', () => {
    expect(validate({ status: 'degraded', service: 'api', stage: 'scaffold', checks: { mysql: 'not_configured', redis: 'not_configured' } })).toBe(true);
  });
  it('rejects accidentally exposed infrastructure credentials', () => {
    expect(validate({ status: 'ok', service: 'api', stage: 'scaffold', checks: { mysql: 'up', redis: 'up' }, password: 'synthetic-secret' })).toBe(false);
  });
  it('rejects incomplete or incompatible status payloads consumed by the UI', () => {
    expect(validate({ status: 'ok', service: 'api', checks: { mysql: 'up' } })).toBe(false);
    expect(validate({ status: 'ok', service: 'api', stage: 'scaffold', checks: { mysql: 'connected', redis: 'up' } })).toBe(false);
  });
});
