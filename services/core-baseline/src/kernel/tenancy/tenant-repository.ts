import { TransactionScope } from './unit-of-work.js';
const identifier = (name: string) => { if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid repository metadata'); return `\`${name}\``; };
export class TenantRepository {
  private readonly table: string;
  private readonly writable: Set<string>;
  constructor(private readonly scope: TransactionScope, table: string, writable: readonly string[]) {
    this.table = identifier(table);
    this.writable = new Set(writable);
    for (const field of writable) {
      identifier(field);
      if (['id','tenant_id','version'].includes(field)) throw new Error('Reserved repository column');
    }
  }
  private fields(values: Record<string, unknown>): string[] {
    const keys = Object.keys(values);
    if (!keys.length || keys.some(k => !this.writable.has(k))) throw new Error('Unknown/empty repository fields');
    return keys;
  }
  async find(id: string): Promise<Record<string, unknown> | undefined> {
    const rows = await this.scope.query(`SELECT * FROM ${this.table} WHERE tenant_id=? AND id=?`, [this.scope.context.tenantId,id]);
    return rows[0];
  }
  async insert(id: string, values: Record<string, unknown>): Promise<void> {
    const fields = this.fields(values);
    await this.scope.query(`INSERT INTO ${this.table} (tenant_id,id,${fields.map(identifier).join(',')}) VALUES (${fields.map(() => '?').concat(['?','?']).join(',')})`, [this.scope.context.tenantId,id,...fields.map(k => values[k])]);
  }
  async update(id: string, version: string, values: Record<string, unknown>): Promise<boolean> {
    const fields = this.fields(values);
    const result = await this.scope.query(`UPDATE ${this.table} SET ${fields.map(k => `${identifier(k)}=?`).join(',')},version=version+1 WHERE tenant_id=? AND id=? AND version=?`, [...fields.map(k => values[k]),this.scope.context.tenantId,id,version]);
    return result.affectedRows === 1;
  }
  async delete(id: string, version: string): Promise<boolean> {
    const result = await this.scope.query(`DELETE FROM ${this.table} WHERE tenant_id=? AND id=? AND version=?`, [this.scope.context.tenantId,id,version]);
    return result.affectedRows === 1;
  }
}
