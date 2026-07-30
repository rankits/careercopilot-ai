import { env } from "@/shared/config/env.conf.js";

/**
 * SMTP mailer configuration. Defaults target a local Mailpit-style dev
 * container so OTP/notification emails can be inspected locally without
 * any real credentials.
 */
export const mailerConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  from: {
    name: env.MAIL_FROM_NAME,
    address: env.MAIL_FROM_ADDRESS,
  },
};
