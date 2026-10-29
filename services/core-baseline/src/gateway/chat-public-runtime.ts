import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { required } from '@agentic-crm/workload-transport';
import { databaseSource } from '../kernel/database/data-source.js';
import { AuthModule, AuthRuntime } from '../modules/identity/auth/http.js';
import { HumanDispatchEnrollment } from '../modules/identity/dispatch-enrollment.js';
import { chatConnection } from './chat-connection.js';
import { chatPublicMiddleware } from './chat-public.js';
import type {Server} from 'node:http';
import {attachInboxRealtime,redisInboxHints} from './inbox-realtime.js';
import {cookie} from '../modules/identity/auth/http.js';
import {hash} from '../modules/identity/auth/security.js';
import {IdentityAuthorization,AccessError} from '../modules/identity/authorization.js';
import {UnitOfWork} from '../kernel/tenancy/unit-of-work.js';

export class ChatPublicRuntime implements OnModuleDestroy {
  private realtime?:ReturnType<typeof attachInboxRealtime>;
  private readonly registry = databaseSource();
  private readonly source = databaseSource(false, {
    user: required(process.env, 'IDENTITY_DISPATCH_USER'), password: required(process.env, 'IDENTITY_DISPATCH_PASSWORD'),
  });
  constructor(@Inject(AuthRuntime) private readonly auth: AuthRuntime) {}
  attachRealtime(server:Server){
    if(process.env.CHAT_REALTIME_ENABLED!=='true')return;
    const identity=new IdentityAuthorization(new UnitOfWork(this.source));
    this.realtime=attachInboxRealtime(server,this.auth.service.config.origin,async(request,tenant)=>{
      const token=cookie(request,'crm_session'),session=await this.auth.service.session(token);
      try{await identity.runHuman(session.account_id,tenant,async(_scope,access)=>{
        if(!access.capabilities.includes('read')||!access.grants.some(g=>g.resource==='conversation'&&g.action==='read'))throw new AccessError('FORBIDDEN');
      });}catch(error){if(error instanceof AccessError)throw Object.assign(new Error('FORBIDDEN'),{status:403});throw error;}
      return hash(token!);
    },redisInboxHints());
  }
  async middleware() {
    await this.source.initialize();
    await this.registry.initialize();
    const bff = chatConnection('bff'), crm = chatConnection('crm');
    await bff(); await crm();
    return chatPublicMiddleware(this.auth.service, new HumanDispatchEnrollment(this.source),
      async request => (await bff()).command(request), async request => (await crm()).command(request), async (tenant, record) => {
        const rows = await this.registry.query(`SELECT r.id FROM crm_record r JOIN object_type o
          ON o.tenant_id=r.tenant_id AND o.id=r.object_type_id
          WHERE r.tenant_id=? AND r.id=? AND o.\`key\`<>'conversation' LIMIT 1`, [tenant, record]);
        return rows.length === 1;
      });
  }
  async onModuleDestroy() {
    this.realtime?.close();
    if (this.source.isInitialized) await this.source.destroy();
    if (this.registry.isInitialized) await this.registry.destroy();
  }
}

@Module({ imports: [AuthModule], providers: [ChatPublicRuntime], exports: [ChatPublicRuntime] })
export class ChatPublicModule {}
