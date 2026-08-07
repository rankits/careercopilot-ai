import { beforeEach, describe, expect, it, vi } from 'vitest';

const nodemailerMock = vi.hoisted(() => ({
  default: {
    createTransport: vi.fn(),
  },
}));

vi.mock('nodemailer', () => nodemailerMock);

const sharedTransport = {
  sendMail: vi.fn(),
  verify: vi.fn(),
};

nodemailerMock.default.createTransport.mockImplementation(() => sharedTransport);

import { sendMail, verifyMailerConnection } from '@/infrastructure/email/email.service.js';

const input = {
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hi</p>',
  text: 'Hi',
};

beforeEach(() => {
  sharedTransport.sendMail.mockReset();
  sharedTransport.verify.mockReset();
});

describe('sendMail', () => {
  it('reuses a single SMTP transporter and dispatches messages', async () => {
    sharedTransport.sendMail.mockResolvedValue({ messageId: 'abc-123' });

    await sendMail(input);
    await sendMail({ ...input, to: 'other@example.com' });

    expect(nodemailerMock.default.createTransport).toHaveBeenCalledTimes(1);
    expect(sharedTransport.sendMail).toHaveBeenCalledTimes(2);
    expect(sharedTransport.sendMail.mock.calls[0][0]).toMatchObject({
      from: expect.stringContaining('CareerCopilot'),
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });

  it('dispatches without a plain-text body and resolves successfully', async () => {
    sharedTransport.sendMail.mockResolvedValue({ messageId: 'msg-9' });
    await expect(
      sendMail({ to: input.to, subject: 'S', html: '<i>Hi</i>' }),
    ).resolves.toBeUndefined();
  });
});

describe('verifyMailerConnection', () => {
  it('verifies the cached SMTP transporter', async () => {
    sharedTransport.verify.mockResolvedValue(true);
    await expect(verifyMailerConnection()).resolves.toBeUndefined();
    expect(sharedTransport.verify).toHaveBeenCalledTimes(1);
  });
});
