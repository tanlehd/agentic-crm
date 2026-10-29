import { workflowChildren } from '../../modules/workflow/children.js';
import { SalesHandoffs } from '../../modules/sales/handoff.js';
import { WorkflowEngine } from '../../modules/workflow/engine.js';
import { Routing } from '../../modules/agents/routing.js';
import { routingAccessConsumer } from '../../modules/agents/access-consumer.js';
import { MessengerIntake } from '../../modules/channels/intake.js';
import { routingJobs } from '../../modules/agents/owner-runtime.js';
import { baselineOwnerConfig } from '../../owner-config.js';
import { baselineOwnerPool } from '../database/owner-pool.js';
import { Injectable, Module } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { databaseSource } from '../database/data-source.js';
import { DurableDelivery } from './delivery.js';
import { identityAccessConsumer } from '../../modules/identity/access-consumer.js';
@Injectable()
class DeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly source = databaseSource();
  private readonly workflow = new WorkflowEngine(this.source,workflowChildren(this.source));
  private readonly sales = new SalesHandoffs(this.source);
  private readonly routingConsumer = routingAccessConsumer(new Routing(this.source));
  private readonly routingPool = baselineOwnerPool('ROUTING_OWNER');
  private routing?: ReturnType<typeof routingJobs>;
  private routingTenants: readonly string[] = [];
  private readonly intake = new MessengerIntake(this.source);
  private readonly delivery = new DurableDelivery(this.source);
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private running?: Promise<void>;
  async onModuleInit() {
    await this.source.initialize();
    const config = await baselineOwnerConfig();
    this.routing = routingJobs(this.routingPool, config.routingActors);
    this.routingTenants = config.tenants;
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
      const consumers = [identityAccessConsumer, this.routingConsumer, ...this.workflow.consumers().filter(consumer => consumer.type === 'lead.accepted')];
      const claims = await this.delivery.claim([...new Set(consumers.map(consumer => consumer.type))]);
      // Bounded concurrency below DB pool size; no overlapping ticks.
      for (let offset=0; offset<claims.length; offset+=4) {
        await Promise.all(claims.slice(offset,offset+4).map(claim=>this.delivery.dispatch(claim, consumers)));
      }
      await this.intake.tick();
      await this.workflow.tick();
      await this.sales.tick();
      for (const tenant of this.routingTenants) {
        await this.routing!.reroute.recover(tenant);
        await this.routing!.dispatcher.tick(tenant);
      }
    } catch { console.warn('RELIABILITY_TICK_FAILED'); }
  }
  async onModuleDestroy() {
    this.stopped = true; clearTimeout(this.timer);
    await this.running;
    await this.routingPool.end();
    if (this.source.isInitialized) await this.source.destroy();
  }
}
@Module({providers:[DeliveryWorker]})
export class ReliabilityWorkerModule {}
