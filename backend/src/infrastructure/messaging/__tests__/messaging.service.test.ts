import { describe, expect, it, vi } from 'vitest';

const driverMock = vi.hoisted(() => ({
  RabbitMQBusDriver: vi.fn(),
}));

vi.mock('@/infrastructure/messaging/drivers/rabbitmq.driver.js', () => driverMock);

import { MessageBusService } from '@/infrastructure/messaging/messaging.service.js';
import '@/infrastructure/messaging/index.js';

const instance = {
  connect: vi.fn(async () => {}),
  ping: vi.fn(async () => true),
  publish: vi.fn(async () => true),
  subscribe: vi.fn(async () => {}),
  ensureQueue: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
};

driverMock.RabbitMQBusDriver.mockImplementation(function () {
  return instance;
});

const handler = async () => {};

describe('MessageBusService', () => {
  it('delegates each driver operation and routes publishEvent through publish', async () => {
    const bus = new MessageBusService();

    await bus.connect();
    expect(instance.connect).toHaveBeenCalledTimes(1);

    await expect(bus.ping()).resolves.toBe(true);
    expect(instance.ping).toHaveBeenCalledTimes(1);

    await expect(bus.publish('ex', 'rk', { a: 1 }, { persistent: true })).resolves.toBe(true);
    expect(instance.publish).toHaveBeenCalledWith('ex', 'rk', { a: 1 }, { persistent: true });

    await expect(bus.publishEvent('events', 'user.signin', { userId: 1 })).resolves.toBe(true);
    expect(instance.publish).toHaveBeenCalledWith(
      'events',
      'user.signin',
      { userId: 1 },
      undefined,
    );

    await bus.subscribe('q', 'ex', 'rk', handler, { prefetch: 1 });
    expect(instance.subscribe).toHaveBeenCalledWith('q', 'ex', 'rk', handler, { prefetch: 1 });

    await bus.ensureQueue('q', 'ex', 'rk');
    expect(instance.ensureQueue).toHaveBeenCalledWith('q', 'ex', 'rk', undefined);

    await bus.close();
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('wires up its own injected driver instance', () => {
    const bus = new MessageBusService();
    expect(bus).toBeInstanceOf(MessageBusService);
    expect(driverMock.RabbitMQBusDriver).toHaveBeenCalled();
  });
});
