import { MessengerIntake } from '../../modules/channels/intake.js';
import { OutboundDispatcher } from '../../modules/conversation/outbound.js';
import { MockSender } from '../../modules/channels/mock-sender.js';
import { Injectable, Module } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { databaseSource } from '../database/data-source.js';
import { DurableDelivery } from './delivery.js';
import { identityAccessConsumer } from '../../modules/identity/access-consumer.js';
@Injectable()
class DeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly source = databaseSource();
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
        await Promise.all(claims.slice(offset,offset+4).map(claim=>this.delivery.dispatch(claim,[identityAccessConsumer])));
      }
      await this.delivery.expireReceipts();
      await this.outbound.tick();
      await this.intake.tick();
    } catch { console.warn('RELIABILITY_TICK_FAILED'); }
  }
  async onModuleDestroy() {
    this.stopped = true; clearTimeout(this.timer);
    await this.running;
    if (this.source.isInitialized) await this.source.destroy();
  }
}
@Module({providers:[DeliveryWorker]})
export class ReliabilityWorkerModule {}
