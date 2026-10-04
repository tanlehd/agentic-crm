import { Controller, Get, Inject, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { createPool } from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import { validateJournal } from './kernel/database/migration-runner.js';
import { migrations } from './kernel/database/migrations.js';
import { Redis } from 'ioredis';
import type { HealthResponse } from '@agentic-crm/contracts';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly pool: Pool | undefined;
  private readonly redis: Redis | undefined;
  constructor() {
    if (process.env.MYSQL_HOST) {
      this.pool = createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectionLimit: 2,
        connectTimeout: 2000,
      });
    }
    if (process.env.REDIS_HOST) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        connectTimeout: 2000,
        commandTimeout: 2000,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => 2000,
      });
      this.redis.on('error', () => { /* Readiness reports sanitized state, not credentials. */ });
    }
  }

  async readiness(): Promise<HealthResponse> {
    const [mysql, redis] = await Promise.all([
      this.probe(this.pool ? async () => { const [rows] = await this.pool!.query('SELECT version,name,checksum,state FROM schema_migration ORDER BY version'); validateJournal(rows as any, migrations, true); } : undefined),
      this.probe(this.redis ? async () => { await this.redis!.ping(); } : undefined),
    ]);
    return {
      status: mysql === 'up' && redis === 'up' ? 'ok' : 'degraded',
      service: process.env.SERVICE_ROLE === 'worker' ? 'worker' : 'api',
      stage: 'scaffold',
      checks: { mysql, redis },
    };
  }

  private async probe(fn?: () => Promise<void>): Promise<'up' | 'down' | 'not_configured'> {
    if (!fn) return 'not_configured';
    try { await fn(); return 'up'; } catch { return 'down'; }
  }

  async onModuleDestroy(): Promise<void> {
    this.redis?.disconnect();
    await this.pool?.end();
  }
}

@Controller('health')
class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}
  @Get('live') live() { return { status: 'ok', service: process.env.SERVICE_ROLE === 'worker' ? 'worker' : 'api' }; }
  @Get('ready') async ready(): Promise<HealthResponse> {
    const result = await this.health.readiness();
    if (result.status !== 'ok') throw new ServiceUnavailableException(result);
    return result;
  }
}

@Module({ controllers: [HealthController], providers: [HealthService] })
export class ApplicationModule {}
