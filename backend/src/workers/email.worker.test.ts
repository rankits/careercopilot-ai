import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renderOtpEmail, renderWelcomeEmail, renderSecurityAlertEmail, sendMail } = vi.hoisted(
  () => ({
    renderOtpEmail: vi.fn(() => ({ subject: 'otp', html: '<h1>otp</h1>', text: 'otp' })),
    renderWelcomeEmail: vi.fn(() => ({
      subject: 'welcome',
      html: '<h1>welcome</h1>',
      text: 'welcome',
    })),
    renderSecurityAlertEmail: vi.fn(() => ({
      subject: 'alert',
      html: '<h1>alert</h1>',
      text: 'alert',
    })),
    sendMail: vi.fn(async () => {}),
  }),
);

vi.mock('@/infrastructure/messaging/index.js', async () => {
  const topology = await vi.importActual<
    typeof import('@/infrastructure/messaging/messaging.topology.js')
  >('@/infrastructure/messaging/messaging.topology.js');
  return {
    ...topology,
    messageBus: {
      subscribe: vi.fn(async () => {}),
    },
  };
});

vi.mock('@/infrastructure/email/index.js', () => ({
  sendMail,
  renderOtpEmail,
  renderWelcomeEmail,
  renderSecurityAlertEmail,
}));

vi.mock('@/shared/logger/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { messageBus } from '@/infrastructure/messaging/index.js';
import {
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import { startEmailWorker } from '@/workers/email.worker.js';

type SubscribeHandler = (message: { payload: unknown }) => Promise<void>;

const subscribeMock = messageBus as { subscribe: ReturnType<typeof vi.fn> };

describe('email.worker', () => {
  beforeEach(() => {
    subscribeMock.subscribe.mockClear();
    sendMail.mockClear();
    renderOtpEmail.mockClear();
    renderWelcomeEmail.mockClear();
    renderSecurityAlertEmail.mockClear();
  });

  it('subscribes to the email send queue', async () => {
    await startEmailWorker();
    expect(subscribeMock.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribeMock.subscribe).toHaveBeenCalledWith(
      MessageQueues.EMAIL_SEND,
      MessageExchanges.NOTIFICATIONS,
      MessageRoutingKeys.EMAIL_SEND,
      expect.any(Function),
      expect.any(Object),
    );
  });

  it('sends an OTP email', async () => {
    await startEmailWorker();
    const handler = subscribeMock.subscribe.mock.calls[0][3] as SubscribeHandler;
    await handler({
      payload: {
        type: 'OTP',
        to: 'a@b.c',
        firstName: 'Ada',
        code: '123456',
        purposeLabel: 'login',
        expiresInMinutes: 5,
      },
    });
    expect(renderOtpEmail).toHaveBeenCalledWith({
      firstName: 'Ada',
      code: '123456',
      purposeLabel: 'login',
      expiresInMinutes: 5,
    });
    expect(sendMail).toHaveBeenCalledWith({
      to: 'a@b.c',
      subject: 'otp',
      html: '<h1>otp</h1>',
      text: 'otp',
    });
  });

  it('sends a welcome email', async () => {
    await startEmailWorker();
    const handler = subscribeMock.subscribe.mock.calls[0][3] as SubscribeHandler;
    await handler({ payload: { type: 'WELCOME', to: 'x@y.z', firstName: 'Bob' } });
    expect(renderWelcomeEmail).toHaveBeenCalledWith({ firstName: 'Bob' });
    expect(sendMail).toHaveBeenCalledWith({
      to: 'x@y.z',
      subject: 'welcome',
      html: '<h1>welcome</h1>',
      text: 'welcome',
    });
  });

  it('sends a security alert email', async () => {
    await startEmailWorker();
    const handler = subscribeMock.subscribe.mock.calls[0][3] as SubscribeHandler;
    await handler({
      payload: {
        type: 'SECURITY_ALERT',
        to: 's@t.u',
        firstName: 'Eve',
        eventLabel: 'NEW_DEVICE',
        ipAddress: '1.2.3.4',
      },
    });
    expect(renderSecurityAlertEmail).toHaveBeenCalledWith({
      firstName: 'Eve',
      eventLabel: 'NEW_DEVICE',
      occurredAt: expect.any(Date),
      ipAddress: '1.2.3.4',
    });
    expect(sendMail).toHaveBeenCalledWith({
      to: 's@t.u',
      subject: 'alert',
      html: '<h1>alert</h1>',
      text: 'alert',
    });
  });

  it('throws on an unknown job type', async () => {
    await startEmailWorker();
    const handler = subscribeMock.subscribe.mock.calls[0][3] as SubscribeHandler;
    await expect(handler({ payload: { type: 'UNKNOWN' } })).rejects.toThrow(
      'Unknown email job type',
    );
  });
});
