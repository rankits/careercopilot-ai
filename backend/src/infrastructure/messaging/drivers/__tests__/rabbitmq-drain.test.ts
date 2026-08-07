import { describe, expect, it, vi } from 'vitest';
import { RabbitMQBusDriver } from '@/infrastructure/messaging/drivers/rabbitmq.driver.js';

describe('RabbitMQBusDriver in-flight drain helpers (AA-008)', () => {
  it('waitForInFlight returns idle immediately when nothing is running', async () => {
    const driver = new RabbitMQBusDriver('amqp://localhost:5672');
    await expect(driver.waitForInFlight(100)).resolves.toBe('idle');
  });

  it('cancelConsumers is a no-op when no consumers are registered', async () => {
    const driver = new RabbitMQBusDriver('amqp://localhost:5672');
    await expect(driver.cancelConsumers()).resolves.toBeUndefined();
  });

  it('waitForInFlight returns timeout when a tracked promise outlives the budget', async () => {
    const driver = new RabbitMQBusDriver('amqp://localhost:5672') as RabbitMQBusDriver & {
      trackInFlight(work: Promise<void>): void;
    };

    let resolveWork!: () => void;
    const work = new Promise<void>((resolve) => {
      resolveWork = resolve;
    });
    driver.trackInFlight(work);

    await expect(driver.waitForInFlight(20)).resolves.toBe('timeout');
    resolveWork();
    await work;
  });
});
