import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/infrastructure/email/templates/html-escape.util.js';
import { renderOtpEmail } from '@/infrastructure/email/templates/otp-email.template.js';
import { renderSecurityAlertEmail } from '@/infrastructure/email/templates/security-alert-email.template.js';
import { renderWelcomeEmail } from '@/infrastructure/email/templates/welcome-email.template.js';
// Pulls the barrel re-exports in (email.service etc.) so the infrastructure
// index file counts as executed in coverage.
import '@/infrastructure/email/index.js';

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});

describe('renderOtpEmail', () => {
  const data = {
    firstName: 'Ada <3',
    code: '123456',
    purposeLabel: 'login',
    expiresInMinutes: 10,
  };

  it('builds a subject referencing the code', () => {
    const { subject } = renderOtpEmail(data);
    expect(subject).toBe('Your CareerCopilot verification code: 123456');
  });

  it('renders a plain-text body that is readable without HTML', () => {
    const { text } = renderOtpEmail(data);
    expect(text).toContain('Hi Ada <3,');
    expect(text).toContain('Your login code is 123456.');
    expect(text).toContain('This code expires in 10 minutes');
  });

  it('HTML-escapes interpolated user data', () => {
    const { html } = renderOtpEmail(data);
    expect(html).toContain('Hi Ada &lt;3,');
    expect(html).toContain('Your <strong>login</strong> code is:');
    expect(html).toContain('123456');
    expect(html).toContain('expires in <strong>10 minutes</strong>');
  });
});

describe('renderWelcomeEmail', () => {
  it('greets the user with an HTML-escaped first name', () => {
    const { subject, html, text } = renderWelcomeEmail({ firstName: 'Bob & Sons' });

    expect(subject).toBe('Welcome to CareerCopilot');
    expect(text).toContain('Hi Bob & Sons,');
    expect(html).toContain('Welcome, Bob &amp; Sons!');
    expect(html).toContain('Your email is verified');
  });
});

describe('renderSecurityAlertEmail', () => {
  const base = {
    firstName: 'Carol',
    eventLabel: 'password changed',
    occurredAt: new Date('2026-08-01T12:34:56.000Z'),
  };

  it('includes the ISO timestamp and omits IP when absent', () => {
    const { subject, html, text } = renderSecurityAlertEmail(base);

    expect(subject).toBe('Security alert: password changed');
    expect(text).toContain('password changed at 2026-08-01T12:34:56.000Z.');
    expect(text).not.toContain('from IP');
    expect(html).toContain('2026-08-01T12:34:56.000Z');
    expect(html).not.toContain('&middot; IP');
  });

  it('appends the originating IP when provided', () => {
    const { text, html } = renderSecurityAlertEmail({ ...base, ipAddress: '203.0.113.9' });

    expect(text).toContain('from IP 203.0.113.9.');
    expect(html).toContain('&middot; IP 203.0.113.9');
  });

  it('escapes user-controlled fields', () => {
    const { text, html } = renderSecurityAlertEmail({
      ...base,
      firstName: '<script>',
      eventLabel: 'logout-all "confirmed"',
      ipAddress: '1.2.3.4',
    });

    expect(text).toContain('Hi <script>,');
    expect(html).toContain('Hi &lt;script&gt;,');
    expect(html).toContain('logout-all &quot;confirmed&quot;');
  });
});
