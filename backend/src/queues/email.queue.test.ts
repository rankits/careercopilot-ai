import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/messaging/index.js', async () => {
  const actual = await vi.importActual<typeof import('@/infrastructure/messaging/index.js')>(
    '@/infrastructure/messaging/index.js',
  );
  return {
    ...actual,
    messageBus: {
      publishEvent: vi.fn(async () => true),
    },
  };
});

import { messageBus } from '@/infrastructure/messaging/index.js';
import { MessageExchanges, MessageRoutingKeys } from '@/infrastructure/messaging/index.js';
import { EmailQueue } from '@/queues/email.queue.js';

const publishEvent = messageBus as {
  publishEvent: ReturnType<typeof vi.fn>;
};

describe('EmailQueue', () => {
  beforeEach(() => {
    publishEvent.publishEvent.mockClear();
  });

  it('publishes an OTP email job', async () => {
    await EmailQueue.sendOtpEmail({
      to: 'a@b.c',
      firstName: 'Ada',
      code: '123456',
      purposeLabel: 'login',
      expiresInMinutes: 10,
    });
    expect(publishEvent.publishEvent).toHaveBeenCalledWith(
      MessageExchanges.NOTIFICATIONS,
      MessageRoutingKeys.EMAIL_SEND,
      {
        type: 'OTP',
        to: 'a@b.c',
        firstName: 'Ada',
        code: '123456',
        purposeLabel: 'login',
        expiresInMinutes: 10,
      },
    );
  });

  it('publishes a welcome email job', async () => {
    await EmailQueue.sendWelcomeEmail({ to: 'x@y.z', firstName: 'Bob' });
    expect(publishEvent.publishEvent).toHaveBeenCalledWith(
      MessageExchanges.NOTIFICATIONS,
      MessageRoutingKeys.EMAIL_SEND,
      { type: 'WELCOME', to: 'x@y.z', firstName: 'Bob' },
    );
  });

  it('publishes a security alert email job', async () => {
    await EmailQueue.sendSecurityAlertEmail({
      to: 's@t.u',
      firstName: 'Eve',
      eventLabel: 'NEW_DEVICE',
      ipAddress: '1.2.3.4',
    });
    expect(publishEvent.publishEvent).toHaveBeenCalledWith(
      MessageExchanges.NOTIFICATIONS,
      MessageRoutingKeys.EMAIL_SEND,
      {
        type: 'SECURITY_ALERT',
        to: 's@t.u',
        firstName: 'Eve',
        eventLabel: 'NEW_DEVICE',
        ipAddress: '1.2.3.4',
      },
    );
  });
});
