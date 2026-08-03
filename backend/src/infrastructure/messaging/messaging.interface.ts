export interface PublishOptions {
  persistent?: boolean;
  expiration?: number | string;
  headers?: Record<string, unknown>;
  priority?: number;
  messageId?: string;
  timestamp?: number;
}

export interface SubscribeOptions {
  dlq?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  prefetch?: number;
  quorum?: boolean;
  autoAck?: boolean;
}

export interface MessageEnvelope<T = unknown> {
  id: string;
  timestamp: string;
  exchange: string;
  routingKey: string;
  attempt: number;
  payload: T;
}

export type MessageHandler<T = unknown> = (message: MessageEnvelope<T>) => Promise<void>;

export interface IMessageBusDriver {
  connect(): Promise<void>;
  publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean>;
  subscribe<T>(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void>;
  ensureQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    options?: SubscribeOptions,
  ): Promise<void>;
  close(): Promise<void>;
}

export interface IMessageBus extends IMessageBusDriver {
  publishEvent<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<boolean>;
}
