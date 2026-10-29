import test from 'node:test';
import assert from 'node:assert/strict';
import { validateClause } from '../lib/owner-workload-fixture.mjs';

test('workload CHECK validation accepts MySQL literal rendering without accepting extra services or predicates', () => {
  const names = ['identity', 'chat', 'connector', 'routing', 'bff'];
  for (const quote of ["'", "\\'"]) validateClause('(`service` in (' + names.map(n => '_utf8mb4' + quote + n + quote).join(',') + '))', names);
  const clause = "service in ('identity','chat','connector','routing','bff')";
  for (const changed of [clause + ' OR 1=1', clause.replace("'bff'", "'bff','crm'"), clause.replace('service', 'other'), clause.replace("'chat'", "'chat%'")]) {
    assert.throws(() => validateClause(changed, names), /Registry service CHECK drift/);
  }
});
