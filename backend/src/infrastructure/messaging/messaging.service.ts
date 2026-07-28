import {
  IMessageBus,
  IMessageBusDriver,
  MessageHandler,
  PublishOptions,
  SubscribeOptions,
} from "./messaging.interface.js";
import { RabbitMQBusDriver } from "./drivers/rabbitmq.driver.js";

export class MessageBusService implements IMessageBus {
  private driver: IMessageBusDriver;

  constructor() {
    this.driver = new RabbitMQBusDriver();
  }

  async connect(): Promise<void> {
    return this.driver.connect();
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions
  ): Promise<boolean> {
    return this.driver.publish(exchange, routingKey, message, options);
  }

  async subscribe<T>(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions
  ): Promise<void> {
    return this.driver.subscribe(queue, exchange, routingKey, handler, options);
  }

  async close(): Promise<void> {
    return this.driver.close();
  }

  async publishEvent<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: PublishOptions
  ): Promise<boolean> {
    return this.publish(exchange, routingKey, payload, options);
  }
}

export const messageBus = new MessageBusService();
