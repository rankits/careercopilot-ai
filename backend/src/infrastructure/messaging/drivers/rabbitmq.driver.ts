import amqplib, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import {
  IMessageBusDriver,
  MessageHandler,
  MessageEnvelope,
  PublishOptions,
  SubscribeOptions,
} from "@/infrastructure/messaging/messaging.interface.js";
import { QoSPresets } from "@/infrastructure/messaging/messaging.topology.js";

export class RabbitMQBusDriver implements IMessageBusDriver {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private url: string;
  private isConnecting = false;

  constructor(url?: string) {
    this.url = url || process.env.RABBITMQ_URL || "amqp://localhost:5672";
  }

  async connect(): Promise<void> {
    if (this.channel && this.connection) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    try {
      this.connection = await amqplib.connect(this.url);
      this.channel = await this.connection.createChannel();

      this.connection.on("error", (err: Error) => {
        console.error("[RabbitMQ] Connection error:", err.message);
        this.connection = null;
        this.channel = null;
      });

      this.connection.on("close", () => {
        this.connection = null;
        this.channel = null;
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) {
      throw new Error("Failed to initialize RabbitMQ channel");
    }
    return this.channel;
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions
  ): Promise<boolean> {
    try {
      const channel = await this.getChannel();

      await channel.assertExchange(exchange, "topic", {
        durable: true,
      });

      const buffer = Buffer.from(JSON.stringify(message));
      const persistent = options?.persistent ?? true;

      return channel.publish(exchange, routingKey, buffer, {
        persistent,
        headers: options?.headers,
        priority: options?.priority,
        expiration: options?.expiration ? String(options.expiration) : undefined,
      });
    } catch {
      return false;
    }
  }

  async subscribe<T>(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: MessageHandler<T>,
    options?: SubscribeOptions
  ): Promise<void> {
    const channel = await this.getChannel();
    const config = { ...QoSPresets.DEFAULT, ...options };

    await channel.prefetch(config.prefetch || 10);
    await channel.assertExchange(exchange, "topic", { durable: true });

    const queueArguments: Record<string, unknown> = {};

    if (config.quorum) {
      queueArguments["x-queue-type"] = "quorum";
    }

    if (config.dlq) {
      const dlxName = `${queue}.dlx`;
      const dlqName = `${queue}.dlq`;

      await channel.assertExchange(dlxName, "direct", { durable: true });
      await channel.assertQueue(dlqName, {
        durable: true,
        arguments: config.quorum ? { "x-queue-type": "quorum" } : undefined,
      });
      await channel.bindQueue(dlqName, dlxName, dlqName);

      queueArguments["x-dead-letter-exchange"] = dlxName;
      queueArguments["x-dead-letter-routing-key"] = dlqName;
    }

    await channel.assertQueue(queue, {
      durable: true,
      arguments: Object.keys(queueArguments).length > 0 ? queueArguments : undefined,
    });
    await channel.bindQueue(queue, exchange, routingKey);

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const attempt =
          typeof msg.properties.headers?.["x-attempt"] === "number"
            ? (msg.properties.headers["x-attempt"] as number)
            : 1;

        try {
          const payload = JSON.parse(msg.content.toString("utf8")) as T;
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
                retryChannel.publish(
                  exchange,
                  routingKey,
                  msg.content,
                  {
                    ...msg.properties,
                    headers: {
                      ...msg.properties.headers,
                      "x-attempt": nextAttempt,
                    },
                  }
                );
              } catch {
                // Ignore transient requeue error
              }
            }, config.retryDelayMs || 5000);
          } else {
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: config.autoAck ?? false }
    );
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch {
      this.channel = null;
      this.connection = null;
    }
  }
}
