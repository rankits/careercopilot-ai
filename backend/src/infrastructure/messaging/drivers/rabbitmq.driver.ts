import amqplib, { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import {
  IMessageBusDriver,
  MessageHandler,
  MessageEnvelope,
  PublishOptions,
  SubscribeOptions,
} from '@/infrastructure/messaging/messaging.interface.js';
import { QoSPresets } from '@/infrastructure/messaging/messaging.topology.js';
import { logger } from '@/shared/logger/logger.js';

const redactAmqpUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '[invalid-amqp-url]';
  }
};

export class RabbitMQBusDriver implements IMessageBusDriver {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private url: string;
  private isConnecting = false;
  private readonly log = logger.child({ component: 'rabbitmq' });

  constructor(url?: string) {
    this.url = url || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  }

  async connect(): Promise<void> {
    if (this.channel && this.connection) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const safeUrl = redactAmqpUrl(this.url);
    this.log.info({ url: safeUrl }, 'Connecting to RabbitMQ');

    try {
      this.connection = await amqplib.connect(this.url);
      this.channel = await this.connection.createConfirmChannel();

      this.connection.on('error', (err: Error) => {
        this.log.error({ err }, 'RabbitMQ connection error');
        this.connection = null;
        this.channel = null;
      });

      this.connection.on('close', () => {
        this.log.warn({ url: safeUrl }, 'RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
      });

      this.channel.on('error', (err: Error) => {
        this.log.error({ err }, 'RabbitMQ channel error');
        this.channel = null;
      });

      this.channel.on('close', () => {
        this.log.warn('RabbitMQ channel closed');
        this.channel = null;
      });

      this.log.info({ url: safeUrl }, 'RabbitMQ connected');
    } catch (error) {
      this.isConnecting = false;
      this.log.error({ err: error, url: safeUrl }, 'RabbitMQ connection failed');
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Lightweight readiness probe. Reuses an existing connection when present;
   * otherwise opens a short-lived connection so /health does not permanently
   * attach the API process to RabbitMQ unless messaging is already in use.
   */
  async ping(): Promise<boolean> {
    try {
      if (this.connection && this.channel) {
        return true;
      }

      const connection = await amqplib.connect(this.url);
      try {
        const channel = await connection.createChannel();
        await channel.close();
      } finally {
        await connection.close();
      }
      return true;
    } catch (error) {
      this.log.error({ err: error }, 'RabbitMQ ping failed');
      return false;
    }
  }

  private async getChannel(): Promise<ConfirmChannel> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) {
      throw new Error('Failed to initialize RabbitMQ channel');
    }
    return this.channel;
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    try {
      const channel = await this.getChannel();

      await channel.assertExchange(exchange, 'topic', {
        durable: true,
      });

      const buffer = Buffer.from(JSON.stringify(message));
      const persistent = options?.persistent ?? true;

      channel.publish(exchange, routingKey, buffer, {
        persistent,
        headers: options?.headers,
        priority: options?.priority,
        expiration: options?.expiration ? String(options.expiration) : undefined,
        messageId: options?.messageId,
        timestamp: options?.timestamp,
      });
      await channel.waitForConfirms();
      return true;
    } catch (error) {
      this.log.error({ err: error, exchange, routingKey }, 'RabbitMQ publish failed');
      return false;
    }
  }

  private async assertQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    options?: SubscribeOptions,
  ): Promise<{ channel: ConfirmChannel; config: SubscribeOptions }> {
    const channel = await this.getChannel();
    const config = { ...QoSPresets.DEFAULT, ...options };

    await channel.assertExchange(exchange, 'topic', { durable: true });

    const queueArguments: Record<string, unknown> = {};

    if (config.quorum) {
      queueArguments['x-queue-type'] = 'quorum';
    }

    if (config.dlq) {
      const dlxName = `${queue}.dlx`;
      const dlqName = `${queue}.dlq`;

      await channel.assertExchange(dlxName, 'direct', { durable: true });
      await channel.assertQueue(dlqName, {
        durable: true,
        arguments: config.quorum ? { 'x-queue-type': 'quorum' } : undefined,
      });
      await channel.bindQueue(dlqName, dlxName, dlqName);

      queueArguments['x-dead-letter-exchange'] = dlxName;
      queueArguments['x-dead-letter-routing-key'] = dlqName;
    }

    await channel.assertQueue(queue, {
      durable: true,
      arguments: Object.keys(queueArguments).length > 0 ? queueArguments : undefined,
    });
    await channel.bindQueue(queue, exchange, routingKey);
    return { channel, config };
  }

  async ensureQueue(
    queue: string,
    exchange: string,
    routingKey: string,
    options?: SubscribeOptions,
  ): Promise<void> {
    await this.assertQueue(queue, exchange, routingKey, options);
  }

  async subscribe<T>(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void> {
    const { channel, config } = await this.assertQueue(queue, exchange, routingKey, options);
    await channel.prefetch(config.prefetch || 10);

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const attempt =
          typeof msg.properties.headers?.['x-attempt'] === 'number'
            ? (msg.properties.headers['x-attempt'] as number)
            : 1;

        try {
          const payload = JSON.parse(msg.content.toString('utf8')) as T;
          const envelope: MessageEnvelope<T> = {
            id: msg.properties.messageId || `${Date.now()}`,
            timestamp: msg.properties.timestamp
              ? new Date(msg.properties.timestamp).toISOString()
              : new Date().toISOString(),
            exchange: msg.fields.exchange,
            routingKey: msg.fields.routingKey,
            attempt,
            payload,
          };

          await handler(envelope);

          if (!config.autoAck) {
            channel.ack(msg);
          }
        } catch (error) {
          const maxRetries = config.maxRetries ?? 3;

          if (attempt < maxRetries) {
            const nextAttempt = attempt + 1;
            channel.ack(msg);

            setTimeout(async () => {
              try {
                const retryChannel = await this.getChannel();
                retryChannel.publish(exchange, routingKey, msg.content, {
                  ...msg.properties,
                  headers: {
                    ...msg.properties.headers,
                    'x-attempt': nextAttempt,
                  },
                });
              } catch (requeueError) {
                this.log.error(
                  { err: requeueError, queue, exchange, routingKey, attempt: nextAttempt },
                  'RabbitMQ requeue failed',
                );
              }
            }, config.retryDelayMs || 5000);
          } else {
            this.log.error(
              { err: error, queue, exchange, routingKey, attempt, maxRetries },
              'RabbitMQ message handler failed; sending to DLQ/nack',
            );
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: config.autoAck ?? false },
    );

    this.log.info({ queue, exchange, routingKey }, 'RabbitMQ consumer subscribed');
  }

  async close(): Promise<void> {
    this.log.info('Disconnecting RabbitMQ');
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.log.info('RabbitMQ disconnected');
    } catch (error) {
      this.log.error({ err: error }, 'RabbitMQ disconnect failed');
      this.channel = null;
      this.connection = null;
    }
  }
}
