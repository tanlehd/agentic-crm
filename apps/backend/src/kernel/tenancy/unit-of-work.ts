import type { DataSource, QueryRunner } from 'typeorm';
export interface TenantContext { readonly tenantId: string }
export class TransactionScope {
  private active = true;
  readonly context: TenantContext;
  constructor(context: TenantContext, private readonly runner: QueryRunner) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.tenantId)) throw new Error('Invalid tenant context');
    this.context = Object.freeze({ tenantId: context.tenantId });
  }
  // Infrastructure/application ports only. Never expose raw SQL to transport input.
  async query(sql: string, values: unknown[] = []): Promise<any> {
    if (!this.active) throw new Error('Transaction scope closed');
    return this.runner.query(sql, values);
  }
  close(): void { this.active = false; }
}
export class UnitOfWork {
  constructor(private readonly source: DataSource) {}
  async run<T>(context: TenantContext, work: (scope: TransactionScope) => Promise<T>): Promise<T> {
    const runner = this.source.createQueryRunner();
    let scope: TransactionScope | undefined;
    try {
      await runner.connect();
      scope = new TransactionScope(context, runner);
      await runner.startTransaction('READ COMMITTED');
      const result = await work(scope);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally { scope?.close(); await runner.release(); }
  }
}
