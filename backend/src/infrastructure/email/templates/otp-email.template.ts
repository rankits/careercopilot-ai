import { escapeHtml } from "@/infrastructure/email/templates/html-escape.util.js";

export interface OtpEmailData {
  firstName: string;
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const renderOtpEmail = (data: OtpEmailData): RenderedEmail => {
  const subject = `Your CareerCopilot verification code: ${data.code}`;

  const text = [
    `Hi ${data.firstName},`,
    "",
    `Your ${data.purposeLabel} code is ${data.code}.`,
    `This code expires in ${data.expiresInMinutes} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email.",
    "",
    "- CareerCopilot",
  ].join("\n");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    <h2 style="color: #111827; margin-bottom: 4px;">Verify it's you</h2>
    <p>Hi ${escapeHtml(data.firstName)},</p>
    <p>Your <strong>${escapeHtml(data.purposeLabel)}</strong> code is:</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f3f4f6; padding: 16px 24px; border-radius: 8px; text-align: center;">${escapeHtml(data.code)}</p>
    <p>This code expires in <strong>${data.expiresInMinutes} minutes</strong> and can only be used once. Do not share it with anyone.</p>
    <p style="color: #6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
  </div>`;

  return { subject, html, text };
};
