import {
  messageBus,
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
  QoSPresets,
} from "@/infrastructure/messaging/index.js";
import { sendMail } from "@/infrastructure/email/index.js";
import {
  renderOtpEmail,
  renderWelcomeEmail,
  renderSecurityAlertEmail,
} from "@/infrastructure/email/index.js";
import { logger } from "@/shared/logger/logger.js";
import type { EmailJob } from "@/queues/email.queue.js";

const processEmailJob = async (job: EmailJob): Promise<void> => {
  switch (job.type) {
    case "OTP": {
      const { subject, html, text } = renderOtpEmail({
        firstName: job.firstName,
        code: job.code,
        purposeLabel: job.purposeLabel,
        expiresInMinutes: job.expiresInMinutes,
      });
      await sendMail({ to: job.to, subject, html, text });
      return;
    }
    case "WELCOME": {
      const { subject, html, text } = renderWelcomeEmail({ firstName: job.firstName });
      await sendMail({ to: job.to, subject, html, text });
      return;
    }
    case "SECURITY_ALERT": {
      const { subject, html, text } = renderSecurityAlertEmail({
        firstName: job.firstName,
        eventLabel: job.eventLabel,
        occurredAt: new Date(),
        ipAddress: job.ipAddress,
      });
      await sendMail({ to: job.to, subject, html, text });
      return;
    }
    default: {
      const exhaustiveCheck: never = job;
      throw new Error(`Unknown email job type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
};

/**
 * Subscribes to the email routing key on the notifications exchange and
 * sends the corresponding email via Nodemailer. Only depends on RabbitMQ +
 * SMTP - deliberately has no direct Postgres dependency, so it stays cheap
 * to run as its own process (`npm run worker:email`) independent of the
 * API process. Failed sends are retried (with backoff) and eventually
 * dead-lettered per `QoSPresets.DEFAULT` - see infrastructure/messaging.
 */
export const startEmailWorker = async (): Promise<void> => {
  await messageBus.subscribe<EmailJob>(
    MessageQueues.EMAIL_SEND,
    MessageExchanges.NOTIFICATIONS,
    MessageRoutingKeys.EMAIL_SEND,
    async (message) => {
      await processEmailJob(message.payload);
    },
    QoSPresets.DEFAULT,
  );
  logger.info("Email worker started consuming");
};
