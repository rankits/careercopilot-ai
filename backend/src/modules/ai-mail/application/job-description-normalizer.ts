import { stripHtmlToText } from '@/modules/auto-apply/services/page-text-sanitize.util.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

export interface NormalizedJobDescription {
  text: string;
  suspiciousInstructionsDetected: boolean;
}

const SUSPICIOUS_INSTRUCTIONS =
  /\b(?:ignore|disregard|override|forget)\b.{0,80}\b(?:instructions?|rules?|system|prompt)\b|\b(?:system prompt|developer message|reveal secrets?|exfiltrate)\b/i;

const decodeNumericEntities = (text: string): string =>
  text.replace(/&#(x?[0-9a-f]+);/gi, (_match, number: string) => {
    const radix = number[0]?.toLowerCase() === 'x' ? 16 : 10;
    const value = Number.parseInt(radix === 16 ? number.slice(1) : number, radix);
    return Number.isFinite(value) && value > 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : ' ';
  });

export class JobDescriptionNormalizer {
  constructor(private readonly maxCharacters: number) {}

  normalize(input: string): NormalizedJobDescription {
    const withoutHidden = input.replace(
      /<([a-z][\w:-]*)\b[^>]*(?:hidden|aria-hidden\s*=\s*["']?true|style\s*=\s*["'][^"']*display\s*:\s*none)[^>]*>[\s\S]*?<\/\1>/gi,
      ' ',
    );
    const withSemantics = withoutHidden
      .replace(/<(?:div|p|section|article|h[1-6]|br|tr)\b[^>]*>/gi, ' __AI_MAIL_NL__ ')
      .replace(/<li\b[^>]*>/gi, ' __AI_MAIL_NL__ • ');
    const text = decodeNumericEntities(stripHtmlToText(withSemantics, Number.MAX_SAFE_INTEGER))
      .replace(/\s*__AI_MAIL_NL__\s*/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length > this.maxCharacters) {
      throw new AppError('Job description is too large', 400, 'AI_MAIL_JOB_DESCRIPTION_TOO_LARGE');
    }
    return {
      text,
      suspiciousInstructionsDetected: SUSPICIOUS_INSTRUCTIONS.test(text),
    };
  }
}
