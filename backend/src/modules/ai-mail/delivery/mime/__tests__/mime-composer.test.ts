import { describe, expect, it } from 'vitest';

import { composeMimeMessage } from '@/modules/ai-mail/delivery/mime/mime-composer.js';

describe('composeMimeMessage', () => {
  it('builds a plain-text message with encoded subject', () => {
    const mime = composeMimeMessage({
      fromEmail: 'from@example.com',
      toEmail: 'to@example.com',
      subject: 'Hello recruiter',
      bodyText: 'Plain body',
    });

    expect(mime).toContain('From: from@example.com');
    expect(mime).toContain('To: to@example.com');
    expect(mime).toContain('Subject: Hello recruiter');
    expect(mime).toContain('Content-Type: text/plain');
    expect(mime).toContain('Plain body');
  });

  it('includes multipart alternative and attachment when provided', () => {
    const mime = composeMimeMessage({
      fromEmail: 'from@example.com',
      toEmail: 'to@example.com',
      subject: 'With attach',
      bodyText: 'Text',
      bodyHtml: '<p>Html</p>',
      attachment: {
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        content: Buffer.from('%PDF-1.4'),
      },
    });

    expect(mime).toContain('multipart/mixed');
    expect(mime).toContain('multipart/alternative');
    expect(mime).toContain('filename="resume.pdf"');
    expect(mime).toContain('application/pdf');
    expect(mime).toContain(Buffer.from('%PDF-1.4').toString('base64'));
  });
});
