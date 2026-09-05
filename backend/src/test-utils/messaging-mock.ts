import { vi } from 'vitest';

/**
 * Stubs the message bus so tests never touch a real RabbitMQ broker.
 * Auth/admin flows publish "fire and forget" domain events (signin,
 * auth.updated) and queue emails via the same bus - irrelevant to the
 * HTTP-level behavior these specs assert on, EXCEPT that OTP codes are
 * only ever delivered via the "email" payload published here (the API
 * never echoes them back) - so specs read them off `publishEventMock`.
 * Kept self-contained (no outer variable references) for the same
 * hoisting reason as prisma-mock.ts.
 */
vi.mock('@/infrastructure/messaging/index.js', async () => {
  const actual = await vi.importActual<typeof import('@/infrastructure/messaging/index.js')>(
    '@/infrastructure/messaging/index.js',
  );
  return {
    ...actual,
    messageBus: {
      connect: vi.fn(async () => {}),
      ping: vi.fn(async () => true),
      publish: vi.fn(async () => true),
      publishEvent: vi.fn(async () => true),
      subscribe: vi.fn(async () => {}),
      ensureQueue: vi.fn(async () => {}),
      cancelConsumers: vi.fn(async () => {}),
      waitForInFlight: vi.fn(async () => 'idle' as const),
      close: vi.fn(async () => {}),
    },
  };
});

import { messageBus } from '@/infrastructure/messaging/index.js';

export const publishEventMock = messageBus.publishEvent as unknown as ReturnType<typeof vi.fn>;

export interface CapturedEmailJob {
  type: 'OTP' | 'WELCOME' | 'SECURITY_ALERT';
  to: string;
  code?: string;
  [key: string]: unknown;
}

/** Returns the most recently queued email job matching `to` (and, if given, `type`). */
export const findQueuedEmail = (
  to: string,
  type?: CapturedEmailJob['type'],
): CapturedEmailJob | undefined => {
  const calls = publishEventMock.mock.calls as unknown as Array<[string, string, CapturedEmailJob]>;
  return [...calls]
    .reverse()
    .map(([, , payload]) => payload)
    .find((job) => job.to === to && (type === undefined || job.type === type));
};
