import { Controller, Get, Post, Req, Res, Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AuthError, authConfig } from './security.js';
import { AuthService, MysqlAccounts } from './service.js';
import { OidcProvider } from './oidc.js';
import { RedisAuthStore } from './store.js';
interface Request extends IncomingMessage { query: Record<string, unknown> }
export function cookie(req: IncomingMessage, name: string): string | undefined {
  const matches = (req.headers.cookie ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0]!.slice(name.length + 1) : undefined;
}
export class AuthRuntime implements OnModuleDestroy {
  readonly store = new RedisAuthStore();
  readonly accounts = new MysqlAccounts();
  readonly service: AuthService;
  constructor() { const config = authConfig(); this.service = new AuthService(config, this.store, new OidcProvider(config), this.accounts); }
  async onModuleDestroy() { this.store.close(); await this.accounts.close(); }
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthRuntime) private readonly runtime: AuthRuntime) {}
  private get auth() { return this.runtime.service; }
  private cookie(name: string, value: string, seconds: number) { return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${this.auth.config.secure ? '; Secure' : ''}`; }
  private async respond(res: ServerResponse, fn: (correlation: string) => Promise<void>) {
    const correlation = randomUUID();
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try { await fn(correlation); }
    catch (error) {
      const failure = error instanceof AuthError ? error : new AuthError(503, 'AUTH_UNAVAILABLE');
      if (failure.status === 401) res.setHeader('Set-Cookie', this.cookie('crm_session', '', 0));
      res.statusCode = failure.status; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: failure.code, message: 'Không thể hoàn tất xác thực. Vui lòng thử lại.', fields: [], retryable: failure.status === 503 }, meta: { correlation_id: correlation } }));
    }
  }
  @Get('login') login(@Req() req: Request, @Res() res: ServerResponse) { return this.respond(res, async () => {
    const result = await this.auth.login(req.query.return_to);
    res.setHeader('Set-Cookie', this.cookie('crm_login', result.browser, 600)); res.setHeader('Location', result.location); res.statusCode = 302; res.end();
  }); }
  @Get('callback') callback(@Req() req: Request, @Res() res: ServerResponse) { return this.respond(res, async () => {
    res.setHeader('Set-Cookie', this.cookie('crm_login', '', 0));
    const result = await this.auth.callback(req.query.state, cookie(req, 'crm_login'), req.query.code, req.query.error, cookie(req, 'crm_session'));
    res.setHeader('Set-Cookie', [this.cookie('crm_login', '', 0), this.cookie('crm_session', result.id, Math.floor((result.session.absolute_expires_at - Date.now()) / 1000))]);
    res.statusCode = 303; res.setHeader('Location', result.returnTo); res.end();
  }); }
  @Get('session') session(@Req() req: Request, @Res() res: ServerResponse) { return this.respond(res, async correlation => {
    const session = await this.auth.session(cookie(req, 'crm_session'), true);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: { account_id: session.account_id, display_name: session.display_name, expires_at: new Date(Math.min(session.last_seen_at + 8 * 3600_000, session.absolute_expires_at)).toISOString() }, meta: { correlation_id: correlation } }));
  }); }
  @Get('csrf') csrf(@Req() req: Request, @Res() res: ServerResponse) { return this.respond(res, async correlation => {
    const token = await this.auth.csrf(cookie(req, 'crm_session'));
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: { csrf_token: token }, meta: { correlation_id: correlation } }));
  }); }
  @Post('logout') logout(@Req() req: Request, @Res() res: ServerResponse) { return this.respond(res, async () => {
    await this.auth.logout(cookie(req, 'crm_session'), req.headers.origin, req.headers['x-csrf-token']);
    res.setHeader('Set-Cookie', this.cookie('crm_session', '', 0)); res.statusCode = 204; res.end();
  }); }
}
@Module({ controllers: [AuthController], providers: [AuthRuntime], exports: [AuthRuntime] })
export class AuthModule {}
