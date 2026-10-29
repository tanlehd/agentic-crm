import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

async function checks(pool, table) {
  const [rows] = await pool.execute(`SELECT t.CONSTRAINT_NAME,c.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS t
    JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME
    WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME=? AND t.CONSTRAINT_TYPE='CHECK'`, [table]);
  return new Map(rows.map(row => [row.CONSTRAINT_NAME, row.CHECK_CLAUSE]));
}
export function validateClause(clause, names) {
  assert.equal(typeof clause, 'string');
  const normalized = clause.replace(/\\'/g, "'").replace(/_[a-z0-9]+(?=')/gi, '').replace(/[\s`()]/g, '');
  assert.equal(normalized, 'servicein' + names.map(name => "'" + name + "'").join(','), 'Registry service CHECK drift');
}

// Reviewed forward constraint expansion in the retained test fixture only.
export async function ownerWorkloadFixture(pool, provision, full = false) {
  const { ownerWorkloadExpansion, ownerWorkloadFullExpansion, ownerWorkloadServices } = await import('../../services/core-baseline/dist/kernel/database/owner-workload-expansion.js');
  const [[database]] = await pool.query('SELECT DATABASE() db'); assert.equal(database.db, 'native_identity_test');
  const path = '.local/chat-ownership/workload-schema.json';
  const digest = createHash('sha256').update(JSON.stringify(ownerWorkloadExpansion)).digest('hex');
  let pin; try { pin = JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (pin) assert.equal(pin.digest, digest);
  const fullPath = '.local/chat-ownership/workload-owner-v1-schema.json';
  const fullDigest = createHash('sha256').update(JSON.stringify(ownerWorkloadFullExpansion)).digest('hex');
  let fullPin; try { fullPin = JSON.parse(await readFile(fullPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (fullPin) assert.equal(fullPin.digest, fullDigest);
  let expanded = 0;
  for (const [index, change] of ownerWorkloadExpansion.entries()) {
    let constraints = await checks(pool, change.table);
    const next = ownerWorkloadFullExpansion[index];
    if (constraints.has(change.previous)) {
      assert(provision, 'Explicit owner workload fixture expansion required');
      assert(!constraints.has(change.constraint) && !constraints.has(next.constraint));
      validateClause(constraints.get(change.previous), ['identity', 'chat', 'connector']); await pool.query(change.statement);
      constraints = await checks(pool, change.table);
    }
    if (constraints.has(change.constraint)) {
      assert(!constraints.has(next.constraint)); validateClause(constraints.get(change.constraint), ownerWorkloadServices.slice(0, 5));
      if (full) {
        assert(provision, 'Explicit full owner workload fixture expansion required'); await pool.query(next.statement);
        constraints = await checks(pool, change.table);
      }
    } else assert(constraints.has(next.constraint), 'Unknown registry constraint state');
    if (constraints.has(next.constraint)) {
      assert(fullPin || provision && full, 'Full owner expansion requires its retained pin');
      validateClause(constraints.get(next.constraint), ownerWorkloadServices); expanded++;
    }
  }
  assert(expanded === 0 || expanded === 4, 'Partial owner service expansion');
  if (provision && !pin) await writeFile(path, JSON.stringify({ digest, tables: ownerWorkloadExpansion.map(x => x.table) }), { flag: 'wx' });
  if (provision && full && !fullPin) await writeFile(fullPath, JSON.stringify({ digest: fullDigest, tables: ownerWorkloadFullExpansion.map(x => x.table) }), { flag: 'wx' });
  return expanded ? fullDigest : digest;
}
