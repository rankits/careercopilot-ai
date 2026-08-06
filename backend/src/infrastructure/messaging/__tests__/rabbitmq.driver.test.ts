import { beforeEach, describe, expect, it, vi } from 'vitest';

const amqplibMock = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock('amqplib', () => ({
  default: amqplibMock,
  connect: amqplibMock.connect,
}));

import { RabbitMQBusDriver } from '@/infrastructure/messaging/drivers/rabbitmq.driver.js';

const amqplibConnect = amqplibMock.connect;

// The connect mock is shared across every test in this file; carry the call
// count/implementation from one test into the next would otherwise skew the
// "called N times" assertions, so clear both between tests.
beforeEach(() => {
  amqplibConnect.mockReset();
});

type Handler = (...args: unknown[]) => void;

function makeChannel(overrides: Record<string, unknown> = {}) {
  return {
    assertExchange: vi.fn(async () => {}),
    assertQueue: vi.fn(async () => ({ queue: 'q' })),
    bindQueue: vi.fn(async () => {}),
    prefetch: vi.fn(async () => {}),
    consume: vi.fn(async () => ({ consumerTag: 'ct' })),
    publish: vi.fn(() => true),
    waitForConfirms: vi.fn(async () => {}),
    ack: vi.fn(),
    nack: vi.fn(),
    close: vi.fn(async () => {}),
    on: vi.fn(),
    ...overrides,
  };
}

function makeConnection(channel: Record<string, unknown> = makeChannel()) {
  return {
    createConfirmChannel: vi.fn(async () => channel),
    createChannel: vi.fn(async () => makeChannel()),
    close: vi.fn(async () => {}),
    on: vi.fn(),
  };
}

function emit(target: Record<string, unknown>, event: string, ...args: unknown[]) {
  const on = target.on as unknown as { mock: { calls: [string, Handler][] } };
  const call = on?.mock.calls.find(([e]) => e === event);
  if (call) call[1](...args);
}

function build(channel: Record<string, unknown> = makeChannel()) {
  const conn = makeConnection(channel);
  amqplibConnect.mockResolvedValue(conn);
  const driver = new RabbitMQBusDriver('amqp://user:pass@broker:5672');
  return { driver, conn, channel };
}

function makeMsg(overrides: Record<string, unknown> = {}) {
  return {
    content: Buffer.from('{"x":1}'),
    properties: { messageId: 'm1', timestamp: 1_700_000_000_000, headers: {} },
    fields: { exchange: 'ex', routingKey: 'rk' },
    ...overrides,
  };
}

function getConsumeHandler(channel: Record<string, unknown>): Handler {
  const consume = channel.consume as ReturnType<typeof vi.fn>;
  return consume.mock.calls[0][1] as Handler;
}

describe('RabbitMQBusDriver constructor', () => {
  it('uses the supplied URL', async () => {
    const { driver } = build();
    await driver.connect();
    expect(amqplibConnect).toHaveBeenCalledWith('amqp://user:pass@broker:5672');
  });

  it('defaults to the RABBITMQ_URL env value when no URL is given', async () => {
    process.env.RABBITMQ_URL = 'amqp://envhost:5672';
    const conn = makeConnection();
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver();
    await driver.connect();
    expect(amqplibConnect).toHaveBeenCalledWith('amqp://envhost:5672');
    delete process.env.RABBITMQ_URL;
  });

  it('falls back to the localhost default when nothing is configured', async () => {
    delete process.env.RABBITMQ_URL;
    const conn = makeConnection();
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver();
    await driver.connect();
    expect(amqplibConnect).toHaveBeenCalledWith('amqp://localhost:5672');
  });

  it('tolerates an invalid AMQP URL (logging only)', async () => {
    const conn = makeConnection();
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver('not a url');
    await expect(driver.connect()).resolves.toBeUndefined();
  });
});

describe('connect', () => {
  it('connects once and emits connection lifecycle events', async () => {
    const { driver, conn, channel } = build();
    await driver.connect();
    await driver.connect(); // early return when already connected
    expect(amqplibConnect).toHaveBeenCalledTimes(1);

    emit(conn, 'error', new Error('boom'));
    emit(conn, 'close');
    emit(channel, 'error', new Error('chan'));
    emit(channel, 'close');
    expect(driver).toBeInstanceOf(RabbitMQBusDriver);
  });

  it('rethrows when the broker is unreachable', async () => {
    amqplibConnect.mockRejectedValue(new Error('refused'));
    const driver = new RabbitMQBusDriver('amqp://x');
    await expect(driver.connect()).rejects.toThrow('refused');
    expect(amqplibConnect).toHaveBeenCalledTimes(1);
  });

  it('skips connect when one is already in flight', async () => {
    let resolveConnect!: (v: unknown) => void;
    amqplibConnect.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveConnect = res;
        }),
    );
    const driver = new RabbitMQBusDriver('amqp://x');

    const p1 = driver.connect().catch(() => {});
    const p2 = driver.connect(); // isConnecting -> early return
    await expect(p2).resolves.toBeUndefined();

    resolveConnect(makeConnection());
    await p1;
    expect(amqplibConnect).toHaveBeenCalledTimes(1);
  });
});

describe('ping', () => {
  it('reuses an existing connection and returns true', async () => {
    const { driver } = build();
    await driver.connect();
    amqplibConnect.mockClear();
    await expect(driver.ping()).resolves.toBe(true);
    expect(amqplibConnect).not.toHaveBeenCalled();
  });

  it('opens a short-lived connection when not already connected', async () => {
    const conn = makeConnection();
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver('amqp://x');

    await expect(driver.ping()).resolves.toBe(true);
    expect(conn.createChannel).toHaveBeenCalled();
    expect(conn.close).toHaveBeenCalled();
  });

  it('returns false when the broker is unreachable', async () => {
    amqplibConnect.mockRejectedValue(new Error('down'));
    const driver = new RabbitMQBusDriver('amqp://x');
    await expect(driver.ping()).resolves.toBe(false);
  });

  it('returns false when a short-lived channel cannot be created', async () => {
    const conn = makeConnection();
    (conn.createChannel as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no channel'));
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver('amqp://x');
    await expect(driver.ping()).resolves.toBe(false);
    expect(conn.close).toHaveBeenCalled(); // finally branch runs
  });
});

describe('publish', () => {
  it('publishes serialized messages with the given options', async () => {
    const { driver, channel } = build();
    await driver.connect();

    await expect(
      driver.publish(
        'ex',
        'rk',
        { a: 1 },
        {
          persistent: false,
          headers: { h: 1 },
          priority: 5,
          expiration: 50,
          messageId: 'm-1',
          timestamp: 123,
        },
      ),
    ).resolves.toBe(true);

    expect(channel.assertExchange).toHaveBeenCalledWith('ex', 'topic', { durable: true });
    expect(channel.publish).toHaveBeenCalledWith(
      'ex',
      'rk',
      Buffer.from('{"a":1}'),
      expect.objectContaining({
        persistent: false,
        headers: { h: 1 },
        priority: 5,
        expiration: '50',
        messageId: 'm-1',
        timestamp: 123,
      }),
    );
  });

  it('publishes with default persistent semantics and no optional fields', async () => {
    const { driver, channel } = build();
    await driver.connect();
    await expect(driver.publish('ex', 'rk', 'message')).resolves.toBe(true);
    expect(channel.publish).toHaveBeenCalledWith('ex', 'rk', Buffer.from('"message"'), {
      persistent: true,
      headers: undefined,
      priority: undefined,
      expiration: undefined,
      messageId: undefined,
      timestamp: undefined,
    });
  });

  it('returns false when confirmation fails', async () => {
    const { driver, channel } = build();
    await driver.connect();
    (channel.waitForConfirms as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('nack'));
    await expect(driver.publish('ex', 'rk', 'm')).resolves.toBe(false);
  });

  it('returns false when the channel cannot be established', async () => {
    const conn = makeConnection();
    (conn.createConfirmChannel as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    amqplibConnect.mockResolvedValue(conn);
    const driver = new RabbitMQBusDriver('amqp://x');
    await expect(driver.publish('ex', 'rk', 'm')).resolves.toBe(false);
  });
});

describe('ensureQueue / assertQueue', () => {
  it('declares a durable queue with a dead-letter exchange by default', async () => {
    const { driver, channel } = build();
    await driver.connect();
    await expect(driver.ensureQueue('queue', 'ex', 'rk')).resolves.toBeUndefined();

    expect(channel.assertExchange).toHaveBeenCalledWith('ex', 'topic', { durable: true });
    expect(channel.assertExchange).toHaveBeenCalledWith('queue.dlx', 'direct', { durable: true });
    expect(channel.assertQueue).toHaveBeenCalledWith('queue.dlq', {
      durable: true,
      arguments: undefined,
    });
    expect(channel.assertQueue).toHaveBeenCalledWith('queue.dlq', {
      durable: true,
      arguments: undefined,
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('queue.dlq', 'queue.dlx', 'queue.dlq');
    expect(channel.assertQueue).toHaveBeenCalledWith('queue', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'queue.dlx',
        'x-dead-letter-routing-key': 'queue.dlq',
      },
    });
    expect(channel.bindQueue).toHaveBeenCalledWith('queue', 'ex', 'rk');
  });

  it('honours quorum queues', async () => {
    const { driver, channel } = build();
    await driver.connect();
    await driver.ensureQueue('queue', 'ex', 'rk', { quorum: true });

    expect(channel.assertQueue).toHaveBeenCalledWith('queue.dlq', {
      durable: true,
      arguments: { 'x-queue-type': 'quorum' },
    });
    expect(channel.assertQueue).toHaveBeenCalledWith('queue', {
      durable: true,
      arguments: {
        'x-queue-type': 'quorum',
        'x-dead-letter-exchange': 'queue.dlx',
        'x-dead-letter-routing-key': 'queue.dlq',
      },
    });
  });

  it('skips DLQ wiring when dlq is disabled', async () => {
    const { driver, channel } = build();
    await driver.connect();
    await driver.ensureQueue('queue', 'ex', 'rk', { dlq: false });

    expect(channel.assertQueue).toHaveBeenCalledWith('queue', {
      durable: true,
      arguments: undefined,
    });
    expect(channel.assertExchange).not.toHaveBeenCalledWith('queue.dlx', 'direct', {
      durable: true,
    });
  });
});

describe('subscribe', () => {
  it('forwards messages to the handler and acks by default', async () => {
    const { driver, channel } = build();
    await driver.connect();

    const handler = vi.fn(async () => {});
    await driver.subscribe('q', 'ex', 'rk', handler, { retryDelayMs: 1 });

    expect(channel.prefetch).toHaveBeenCalledWith(10);
    expect(channel.consume).toHaveBeenCalledWith('q', expect.any(Function), { noAck: false });

    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(makeMsg());

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      id: 'm1',
      exchange: 'ex',
      routingKey: 'rk',
      attempt: 1,
      payload: { x: 1 },
    });
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('supports auto-ack and ignores empty messages', async () => {
    const { driver, channel } = build();
    await driver.connect();

    const handler = vi.fn(async () => {});
    await driver.subscribe('q', 'ex', 'rk', handler, { autoAck: true });

    expect(channel.consume).toHaveBeenCalledWith('q', expect.any(Function), { noAck: true });

    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(null); // msg === null -> early return, no ack
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('acknowledges and requeues an attempt that is still below the retry cap', async () => {
    const { driver, channel } = build();
    await driver.connect();

    const handler = vi.fn(async () => {
      throw new Error('failed to process');
    });
    await driver.subscribe('q', 'ex', 'rk', handler, { maxRetries: 3, retryDelayMs: 1 });

    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(
      makeMsg({
        properties: { messageId: 'm1', timestamp: 1_700_000_000_000, headers: { 'x-attempt': 2 } },
      }),
    );

    expect(channel.ack).toHaveBeenCalledWith(expect.anything());
    await new Promise((r) => setTimeout(r, 25));
    expect(channel.publish).toHaveBeenCalledWith(
      'ex',
      'rk',
      expect.any(Buffer),
      expect.objectContaining({ headers: { 'x-attempt': 3 } }),
    );
  });

  it('nacks a message that has exhausted its retries', async () => {
    const { driver, channel } = build();
    await driver.connect();

    const handler = vi.fn(async () => {
      throw new Error('still failing');
    });
    await driver.subscribe('q', 'ex', 'rk', handler, { maxRetries: 2, retryDelayMs: 1 });

    const msg = makeMsg({
      properties: { messageId: 'm1', timestamp: 1_700_000_000_000, headers: { 'x-attempt': 2 } },
    });
    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(msg);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('falls back to defaults when x-attempt header and timestamps are absent', async () => {
    const { driver, channel } = build();
    await driver.connect();

    const handler = vi.fn(async () => {});
    await driver.subscribe('q', 'ex', 'rk', handler);

    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(
      makeMsg({
        content: Buffer.from('{}'),
        properties: { messageId: '', timestamp: undefined, headers: undefined },
      }),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String),
        attempt: 1,
        payload: {},
      }),
    );
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('logs when requeuing itself fails', async () => {
    const channel = makeChannel();
    (channel.publish as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('publish dead');
    });
    const { driver } = build(channel);
    await driver.connect();

    const handler = vi.fn(async () => {
      throw new Error('boom');
    });
    await driver.subscribe('q', 'ex', 'rk', handler, { maxRetries: 3, retryDelayMs: 1 });

    const consumeHandler = getConsumeHandler(channel);
    await consumeHandler(makeMsg({ headers: { 'x-attempt': 1 } }));
    await new Promise((r) => setTimeout(r, 25));
  });
});

describe('close', () => {
  it('closes the channel and connection', async () => {
    const { driver, conn, channel } = build();
    await driver.connect();
    await driver.close();
    expect(channel.close).toHaveBeenCalled();
    expect(conn.close).toHaveBeenCalled();
  });

  it('clears references when closing fails', async () => {
    const channel = makeChannel();
    (channel.close as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('stuck'));
    const { driver } = build(channel);
    await driver.connect().catch(() => {});
    await expect(driver.close()).resolves.toBeUndefined();
  });
});
