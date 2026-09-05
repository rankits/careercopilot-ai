import nodemailer, { type Transporter } from 'nodemailer';
import { mailerConfig } from '@/shared/config/mailer.conf.js';
import { logger } from '@/shared/logger/logger.js';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: mailerConfig.host,
      port: mailerConfig.port,
      secure: mailerConfig.secure,
      auth: mailerConfig.auth,
    });
  }
  return transporter;
};

export const sendMail = async (input: SendMailInput): Promise<void> => {
  const client = getTransporter();
  const info = await client.sendMail({
    from: `"${mailerConfig.from.name}" <${mailerConfig.from.address}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  logger.info(
    { to: input.to, subject: input.subject, messageId: info.messageId },
    'Email dispatched',
  );
};

export const verifyMailerConnection = async (): Promise<void> => {
  await getTransporter().verify();
  logger.info('SMTP connection verified');
};
