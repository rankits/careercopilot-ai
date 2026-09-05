import {
  IMessageBus,
  IMessageBusDriver,
  InFlightWaitResult,
  MessageHandler,
  PublishOptions,
  SubscribeOptions,
} from '@/infrastructure/messaging/messaging.interface.js';
import { RabbitMQBusDriver } from '@/infrastructure/messaging/drivers/rabbitmq.driver.js';

export class MessageBusService implements IMessageBus {
  private driver: IMessageBusDriver;

  constructor() {
    this.driver = new RabbitMQBusDriver();
  }

  async connect(): Promise<void> {
    return this.driver.connect();
  }

  async ping(): Promise<boolean> {
    return this.driver.ping();
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    return this.driver.publish(exchange, routingKey, message, options);
  }

  async subscribe<T>(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void> {
    return this.driver.subscribe(queue, exchange, routingKey, handler, options);
  }

  async ensureQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    options?: SubscribeOptions,
  ): Promise<void> {
    return this.driver.ensureQueue(queue, exchange, routingKey, options);
  }

  async cancelConsumers(): Promise<void> {
    return this.driver.cancelConsumers();
  }

  async waitForInFlight(timeoutMs: number): Promise<InFlightWaitResult> {
    return this.driver.waitForInFlight(timeoutMs);
  }

  async close(): Promise<void> {
    return this.driver.close();
  }

  async publishEvent<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    return this.publish(exchange, routingKey, payload, options);
  }
}

export const messageBus = new MessageBusService();
