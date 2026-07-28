import { escapeHtml } from "./html-escape.util.js";
import type { RenderedEmail } from "./otp-email.template.js";

export interface SecurityAlertEmailData {
  firstName: string;
  eventLabel: string;
  occurredAt: Date;
  ipAddress?: string | undefined;
}

/**
 * Used for password-changed / password-reset / logout-all confirmations -
 * anything the account owner should be notified about even though they
 * (presumably) just triggered it themselves, so unauthorized changes are
 * noticed quickly.
 */
export const renderSecurityAlertEmail = (data: SecurityAlertEmailData): RenderedEmail => {
  const subject = `Security alert: ${data.eventLabel}`;
  const when = data.occurredAt.toISOString();

  const text = [
    `Hi ${data.firstName},`,
    "",
    `We're confirming: ${data.eventLabel} at ${when}${data.ipAddress ? ` from IP ${data.ipAddress}` : ""}.`,
    "If this wasn't you, reset your password immediately and contact support.",
    "",
    "- CareerCopilot Security",
  ].join("\n");

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    <h2 style="color: #b91c1c;">Security alert</h2>
    <p>Hi ${escapeHtml(data.firstName)},</p>
    <p>We're confirming: <strong>${escapeHtml(data.eventLabel)}</strong></p>
    <p style="color: #6b7280; font-size: 13px;">${escapeHtml(when)}${data.ipAddress ? ` &middot; IP ${escapeHtml(data.ipAddress)}` : ""}</p>
    <p>If this wasn't you, reset your password immediately and contact support.</p>
  </div>`;

  return { subject, html, text };
};
