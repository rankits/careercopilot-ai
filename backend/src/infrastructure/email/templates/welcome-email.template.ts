import { escapeHtml } from '@/infrastructure/email/templates/html-escape.util.js';
import type { RenderedEmail } from '@/infrastructure/email/templates/otp-email.template.js';

export interface WelcomeEmailData {
  firstName: string;
}

export const renderWelcomeEmail = (data: WelcomeEmailData): RenderedEmail => {
  const subject = 'Welcome to CareerCopilot';

  const text = [
    `Hi ${data.firstName},`,
    '',
    'Your email is verified and your CareerCopilot account is ready to go.',
    '',
    '- CareerCopilot',
  ].join('\n');

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    <h2 style="color: #111827;">Welcome, ${escapeHtml(data.firstName)}!</h2>
    <p>Your email is verified and your CareerCopilot account is ready to go.</p>
    <p>You can now sign in and start building your profile.</p>
    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">- CareerCopilot</p>
  </div>`;

  return { subject, html, text };
};
