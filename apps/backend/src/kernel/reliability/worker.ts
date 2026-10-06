import { workflowChildren } from '../../modules/workflow/children.js';
import { SalesHandoffs } from '../../modules/sales/handoff.js';
import { ChatflowEngine } from '../../modules/chatflow/engine.js';
import { WorkflowEngine } from '../../modules/workflow/engine.js';
import { runtimeAccessConsumer } from '../../modules/agents/runtime-consumer.js';
import { Routing } from '../../modules/agents/routing.js';
import { routingAccessConsumer } from '../../modules/agents/access-consumer.js';
import { MessengerIntake } from '../../modules/channels/intake.js';
import { OutboundDispatcher } from '../../modules/conversation/outbound.js';
import { workspaceReadConsumer,workspaceCatalogConsumers } from '../../modules/conversation/workspace-consumer.js';
import { MockSender } from '../../modules/channels/mock-sender.js';
import { Injectable, Module } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { databaseSource } from '../database/data-source.js';
import { DurableDelivery } from './delivery.js';
import { identityAccessConsumer } from '../../modules/identity/access-consumer.js';
@Injectable()
class DeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly source = databaseSource();
  private readonly chatflow = new ChatflowEngine(this.source);
  private readonly workflow = new WorkflowEngine(this.source,workflowChildren(this.source));
  private readonly sales = new SalesHandoffs(this.source);
  private readonly runtime = this.chatflow.runtime;
  private readonly runtimeConsumer = runtimeAccessConsumer(this.runtime);
  private readonly routingConsumer = routingAccessConsumer(new Routing(this.source));
  private readonly intake = new MessengerIntake(this.source);
  private readonly delivery = new DurableDelivery(this.source);
  private readonly outbound = new OutboundDispatcher(this.source,new MockSender(this.source));
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private running?: Promise<void>;
  async onModuleInit() {
    await this.source.initialize();
    this.schedule();
  }
  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.tick().finally(() => this.schedule());
    },1000);
  }
  private async tick() {
    try {
      const claims = await this.delivery.claim();
      // Bounded concurrency below DB pool size; no overlapping ticks.
      for (let offset=0; offset<claims.length; offset+=4) {
        await Promise.all(claims.slice(offset,offset+4).map(claim=>this.delivery.dispatch(claim,[identityAccessConsumer,workspaceReadConsumer,...workspaceCatalogConsumers,this.routingConsumer,this.runtimeConsumer,...this.workflow.consumers()])));
      }
      await this.delivery.expireReceipts();
      await this.outbound.tick();
      await this.intake.tick();
      await this.chatflow.tick();
      await this.runtime.tick();
      await this.workflow.tick();
      await this.sales.tick();
    } catch { console.warn('RELIABILITY_TICK_FAILED'); }
  }
  async onModuleDestroy() {
    this.stopped = true; clearTimeout(this.timer);
    await this.running;
    await this.runtime.drain();
    if (this.source.isInitialized) await this.source.destroy();
  }
}
@Module({providers:[DeliveryWorker]})
export class ReliabilityWorkerModule {}
