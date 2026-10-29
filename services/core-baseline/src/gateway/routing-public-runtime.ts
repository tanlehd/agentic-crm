import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { required } from '@agentic-crm/workload-transport';
import { databaseSource } from '../kernel/database/data-source.js';
import { UnitOfWork } from '../kernel/tenancy/unit-of-work.js';
import { baselineOwnerConfig } from '../owner-config.js';
import { AuthModule, AuthRuntime } from '../modules/identity/auth/http.js';
import { NativeOwnerHumanAuthority } from '../modules/identity/owner-authority.js';
import { HumanDispatchEnrollment } from '../modules/identity/dispatch-enrollment.js';
import { RoutingChannelReferences } from '../modules/channels/routing-reference.js';
import { NativeRoutingConfiguration } from '../modules/agents/owner-config.js';
import { RoutingConfigurationBff, createRoutingConfigurationBff } from '../modules/agents/owner-config-bff.js';
import { NativeRoutingViewStorage } from '../modules/agents/owner-view-storage.js';
import { NativeRoutingView } from '../modules/agents/owner-view.js';
import { RoutingViewBff, createRoutingViewBff } from '../modules/agents/owner-view-bff.js';
import { RoutingRerouteBff, createRoutingRerouteBff } from '../modules/agents/owner-reroute-bff.js';
import { routingJobs } from '../modules/agents/owner-runtime.js';
import { chatConnection, ownerConnection } from './chat-connection.js';
import { baselineOwnerPool } from '../kernel/database/owner-pool.js';

export class RoutingPublicRuntime implements OnModuleDestroy {
  private readonly identitySource = databaseSource(false, { user: required(process.env, 'IDENTITY_OWNER_USER'), password: required(process.env, 'IDENTITY_OWNER_PASSWORD') });
  private readonly routing = baselineOwnerPool('ROUTING_OWNER');
  private readonly channels = baselineOwnerPool('CHANNELS_READ');
  constructor(@Inject(AuthRuntime) private readonly auth: AuthRuntime) {}
  async middleware() {
    await this.identitySource.initialize();
    const config = await baselineOwnerConfig();
    const authority = new NativeOwnerHumanAuthority(new UnitOfWork(this.identitySource), config.conversationObjects, config.projectionObjects);
    const enrollment = new HumanDispatchEnrollment(this.identitySource);
    const connection = new RoutingChannelReferences(this.channels);
    const jobs = routingJobs(this.routing, config.routingActors);
    const identity = ownerConnection('routing', 'identity', 'IDENTITY_OWNER_URL');
    const chat = chatConnection('routing'), channels = ownerConnection('routing', 'connector', 'CHANNELS_OWNER_URL');
    const view = new NativeRoutingView(new NativeRoutingViewStorage(this.routing), {
      admit: async (t, command) => (await identity()).read(t, 'admit', { owner: 'routing', command }),
      settle: async (t, command, admission_id) => (await identity()).read(t, 'settle', { owner: 'routing', command, admission_id }),
      policy: async (t, command, admission_id) => (await identity()).read(t, 'admission-routing-view', { command, admission_id }),
      directory: async (t, command, admission_id) => (await identity()).read(t, 'routing-view-directory', { command, admission_id }),
      chat: async (t, command, admission_id) => (await chat()).read(t, 'routing-view', { command, admission_id }),
      connections: async (t, command, admission_id) => (await channels()).read(t, 'routing-view-connections', { command, admission_id }),
    });
    const reads = createRoutingViewBff(new RoutingViewBff(this.auth.service, enrollment, authority, view));
    const writes = createRoutingConfigurationBff(new RoutingConfigurationBff(this.auth.service, enrollment, authority,
      new NativeRoutingConfiguration(this.routing, jobs.capacity), async (...args) => (await identity()).read(...args), (t, id) => connection.connection(t, id)));
    const reroute = createRoutingRerouteBff(new RoutingRerouteBff(this.auth.service, enrollment, authority, jobs.reroute));
    return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (path !== '/api/v1/human-routing' && !path.startsWith('/api/v1/human-routing/')) { next(); return; }
      const handler = request.method === 'GET' ? reads : path === '/api/v1/human-routing/reroute' ? reroute : writes;
      handler.emit('request', request, response);
    };
  }
  async onModuleDestroy() {
    await Promise.all([this.routing.end(), this.channels.end()]);
    if (this.identitySource.isInitialized) await this.identitySource.destroy();
  }
}
@Module({ imports: [AuthModule], providers: [RoutingPublicRuntime], exports: [RoutingPublicRuntime] })
export class RoutingPublicModule {}
