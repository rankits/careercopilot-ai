import { createHash } from 'node:crypto';

export interface AiMailContentHashInput {
  recruiterEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  resumeId: string;
  version: number;
}

const normalizeText = (value: string): string => value.replace(/\r\n?/gu, '\n').trim();

export const normalizeBodyHtml = (value?: string): string =>
  value ? normalizeText(value).replace(/>\s+</gu, '><') : '';

export const hashAiMailContent = (input: AiMailContentHashInput): string => {
  const canonical = JSON.stringify({
    recipient: input.recruiterEmail.trim().toLocaleLowerCase(),
    subject: normalizeText(input.subject),
    bodyText: normalizeText(input.bodyText),
    bodyHtml: normalizeBodyHtml(input.bodyHtml),
    resumeId: input.resumeId,
    version: input.version,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
};
