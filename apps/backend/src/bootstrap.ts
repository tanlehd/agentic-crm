import { FacebookModule } from './modules/channels/facebook-http.js';
import { OperationsModule } from './modules/operations/http.js';
import { ChatflowModule } from './modules/chatflow/http.js';
import { WorkflowModule } from './modules/workflow/http.js';
import { RoutingModule } from './modules/agents/http.js';
import { ChannelsModule } from './modules/channels/http.js';
import { ConversationModule } from './modules/conversation/http.js';
import { WorkspaceModule } from './modules/conversation/workspace-http.js';
import { CrmModule } from './modules/crm/http.js';
import { ReliabilityWorkerModule } from './kernel/reliability/worker.js';
import 'reflect-metadata';
import { Module, RequestMethod } from '@nestjs/common';
import { IdentityModule } from './modules/identity/http.js';
import { AuthModule } from './modules/identity/auth/http.js';
import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './health.js';

export async function bootstrap(role: 'api' | 'worker'): Promise<void> {
  process.env.SERVICE_ROLE = role;
  @Module({ imports: role === 'api' && process.env.MYSQL_HOST ? [ApplicationModule, FacebookModule, AuthModule, IdentityModule, CrmModule, ConversationModule, WorkspaceModule, ChannelsModule, RoutingModule, WorkflowModule, ChatflowModule, OperationsModule] : process.env.MYSQL_HOST && role === 'worker' ? [ApplicationModule, ReliabilityWorkerModule] : [ApplicationModule] })
  class RuntimeModule {}
  const app = await NestFactory.create(RuntimeModule, { logger: ['error', 'warn', 'log'] });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'auth/{*path}', method: RequestMethod.ALL }] });
  const port = Number(process.env.PORT ?? (role === 'api' ? 3001 : 3002));
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  await app.listen(port, '0.0.0.0');
}
