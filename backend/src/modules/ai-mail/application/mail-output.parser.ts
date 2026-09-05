import {
  AI_MAIL_OUTPUT_SCHEMA_VERSION,
  generatedMailOutputSchemaV1,
} from '@/modules/ai-mail/domain/mail-output.schema.js';
import type { GeneratedMailOutput } from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

export class MailOutputParser {
  parse(raw: unknown, schemaVersion = AI_MAIL_OUTPUT_SCHEMA_VERSION): GeneratedMailOutput {
    if (schemaVersion !== AI_MAIL_OUTPUT_SCHEMA_VERSION) {
      throw new AppError(
        'Unsupported AI Mail output schema version',
        422,
        'AI_MAIL_OUTPUT_INVALID',
        {
          schemaVersion,
        },
      );
    }

    const parsed = generatedMailOutputSchemaV1.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(
        'AI Mail provider output failed validation',
        422,
        'AI_MAIL_OUTPUT_INVALID',
        {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      );
    }

    const output = parsed.data;
    return {
      subject: output.subject.trim(),
      bodyText: output.bodyText.trim(),
      bodyHtml: output.bodyHtml?.trim() || undefined,
      detectedContext: output.detectedContext,
      highlightedQualifications: output.highlightedQualifications.map((item) => ({
        claim: item.claim.trim(),
        evidenceCategory: item.evidenceCategory,
      })),
      warnings: output.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        field: warning.field,
      })),
    };
  }

  sanitizeHtmlIfPresent(output: GeneratedMailOutput): GeneratedMailOutput {
    if (!output.bodyHtml) return output;
    return {
      ...output,
      bodyHtml: stripHtml(output.bodyHtml),
    };
  }
}

export const mailOutputParser = new MailOutputParser();
