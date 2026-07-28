import {
  messageBus,
  MessageExchanges,
  MessageRoutingKeys,
} from "../infrastructure/messaging/index.js";

export interface SendOtpEmailInput {
  to: string;
  firstName: string;
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}

export interface SendWelcomeEmailInput {
  to: string;
  firstName: string;
}

export interface SendSecurityAlertEmailInput {
  to: string;
  firstName: string;
  eventLabel: string;
  ipAddress?: string | undefined;
}

export type EmailJob =
  | ({ type: "OTP" } & SendOtpEmailInput)
  | ({ type: "WELCOME" } & SendWelcomeEmailInput)
  | ({ type: "SECURITY_ALERT" } & SendSecurityAlertEmailInput);

/**
 * Producer-side API for email delivery. Callers (currently the `auth`
 * module) publish a job via the RabbitMQ-backed message bus and return
 * immediately - SMTP latency/outages never block the HTTP request.
 * `workers/email.worker.ts` subscribes to the same exchange/routing key
 * and performs the actual send via Nodemailer.
 */
export const EmailQueue = {
  async sendOtpEmail(input: SendOtpEmailInput): Promise<void> {
    const job: EmailJob = { type: "OTP", ...input };
    await messageBus.publishEvent(MessageExchanges.NOTIFICATIONS, MessageRoutingKeys.EMAIL_SEND, job);
  },

  async sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void> {
    const job: EmailJob = { type: "WELCOME", ...input };
    await messageBus.publishEvent(MessageExchanges.NOTIFICATIONS, MessageRoutingKeys.EMAIL_SEND, job);
  },

  async sendSecurityAlertEmail(input: SendSecurityAlertEmailInput): Promise<void> {
    const job: EmailJob = { type: "SECURITY_ALERT", ...input };
    await messageBus.publishEvent(MessageExchanges.NOTIFICATIONS, MessageRoutingKeys.EMAIL_SEND, job);
  },
};
