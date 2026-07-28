export interface IMessageBus {
  publish(exchange: string, routingKey: string, message: unknown): Promise<void>;
  subscribe(queue: string, handler: (message: unknown) => Promise<void>): Promise<void>;
}
