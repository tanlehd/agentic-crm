import { Redis } from 'ioredis';
import { AuthError } from './security.js';
export interface AuthStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  consume(key: string, binding: string): Promise<string | null>;
  update(key: string, old: string, value: string, ttl: number): Promise<boolean>;
  remove(key: string): Promise<void>;
  lock(key: string, token: string): Promise<boolean>;
  unlock(key: string, token: string): Promise<void>;
}
export class RedisAuthStore implements AuthStore {
  readonly redis: Redis;
  constructor() {
    this.redis = new Redis({ host: process.env.REDIS_HOST ?? '127.0.0.1', connectTimeout: 2000, commandTimeout: 2000, maxRetriesPerRequest: 0, enableOfflineQueue: false });
    this.redis.on('error', () => { /* Fail closed without logging credentials. */ });
  }
  private async call<T>(fn: () => Promise<T>): Promise<T> { try { return await fn(); } catch { throw new AuthError(503, 'AUTH_STORE_UNAVAILABLE'); } }
  get(key: string) { return this.call(() => this.redis.get(key)); }
  async set(key: string, value: string, ttl: number) { await this.call(() => this.redis.set(key, value, 'PX', ttl)); }
  async consume(key: string, binding: string) {
    return this.call(async () => await this.redis.eval("local v=redis.call('GET',KEYS[1]); if not v then return nil end; local d=cjson.decode(v); if d.binding~=ARGV[1] then return nil end; redis.call('DEL',KEYS[1]); return d.payload", 1, key, binding) as string | null);
  }
  async update(key: string, old: string, value: string, ttl: number) {
    return this.call(async () => (await this.redis.eval("if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3]); return 1", 1, key, old, value, ttl)) === 1);
  }
  async remove(key: string) { await this.call(() => this.redis.del(key)); }
  async lock(key: string, token: string) { return this.call(async () => await this.redis.set(key, token, 'PX', 15000, 'NX') === 'OK'); }
  async unlock(key: string, token: string) {
    await this.call(() => this.redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0", 1, key, token));
  }
  close() { this.redis.disconnect(); }
}
