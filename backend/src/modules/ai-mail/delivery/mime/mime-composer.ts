export interface MimeAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

export interface ComposeMimeInput {
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachment?: MimeAttachment;
}

const encodeUtf8Header = (value: string): string => {
  if (/^[\x20-\x7E]*$/u.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
};

const encodeQuotedPrintable = (value: string): string => {
  const normalized = value.replace(/\r\n?/gu, '\n');
  const lines: string[] = [];
  for (const line of normalized.split('\n')) {
    let encoded = '';
    for (const char of Buffer.from(line, 'utf8')) {
      if (char === 0x09 || (char >= 0x20 && char <= 0x3c) || (char >= 0x3e && char <= 0x7e)) {
        encoded += String.fromCharCode(char);
      } else {
        encoded += `=${char.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
    // Soft-wrap at 76 chars per RFC
    while (encoded.length > 75) {
      lines.push(`${encoded.slice(0, 75)}=`);
      encoded = encoded.slice(75);
    }
    lines.push(encoded);
  }
  return lines.join('\r\n');
};

const randomBoundary = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Build an RFC 5322 MIME message suitable for Gmail `users.messages.send` raw.
 * Does not include credentials or log content.
 */
export const composeMimeMessage = (input: ComposeMimeInput): string => {
  const subject = encodeUtf8Header(input.subject.trim());
  const mixedBoundary = randomBoundary('mixed');
  const altBoundary = randomBoundary('alt');

  const textPart = [
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    encodeQuotedPrintable(input.bodyText),
  ].join('\r\n');

  const htmlPart = input.bodyHtml
    ? [
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: quoted-printable`,
        ``,
        encodeQuotedPrintable(input.bodyHtml),
      ].join('\r\n')
    : null;

  const alternativeBody = htmlPart
    ? [`--${altBoundary}`, textPart, `--${altBoundary}`, htmlPart, `--${altBoundary}--`].join(
        '\r\n',
      )
    : textPart;

  const parts: string[] = [
    `From: ${input.fromEmail}`,
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (input.attachment) {
    const filename = input.attachment.filename.replace(/"/gu, '');
    const attachmentPart = [
      `Content-Type: ${input.attachment.mimeType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      input.attachment.content
        .toString('base64')
        .replace(/(.{76})/gu, '$1\r\n')
        .trim(),
    ].join('\r\n');

    parts.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, ``);
    if (htmlPart) {
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        alternativeBody,
      );
    } else {
      parts.push(`--${mixedBoundary}`, textPart);
    }
    parts.push(`--${mixedBoundary}`, attachmentPart, `--${mixedBoundary}--`);
  } else if (htmlPart) {
    parts.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      ``,
      alternativeBody,
    );
  } else {
    parts.push(
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      encodeQuotedPrintable(input.bodyText),
    );
  }

  return parts.join('\r\n');
};
