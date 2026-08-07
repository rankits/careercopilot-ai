import type {
  GeneratedMailOutput,
  GenerationWarning,
  MailGenerationConstraints,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const wordCount = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

const containsTopic = (text: string, topic: string): boolean =>
  text.toLocaleLowerCase().includes(topic.toLocaleLowerCase());

export interface MailConstraintValidationResult {
  output: GeneratedMailOutput;
  warnings: GenerationWarning[];
}

export class MailConstraintValidator {
  validate(
    output: GeneratedMailOutput,
    constraints: MailGenerationConstraints,
  ): MailConstraintValidationResult {
    const warnings: GenerationWarning[] = [...output.warnings];
    const combined = `${output.subject}\n${output.bodyText}`;

    if (constraints.maximumWords) {
      const count = wordCount(output.bodyText);
      const max = constraints.maximumWords;
      const upperBound = Math.ceil(max * 1.05);
      const lowerBound = Math.floor(max * 0.95);
      if (count > upperBound) {
        throw new AppError(
          'Generated mail exceeds maximum word count',
          422,
          'AI_MAIL_CONSTRAINT_VIOLATION',
          {
            maximumWords: max,
            actualWords: count,
          },
        );
      }
      if (count < lowerBound || count > max) {
        warnings.push({
          code: 'WORD_COUNT_TOLERANCE',
          message: `Body word count (${count}) is outside the ±5% tolerance of ${max} words.`,
          field: 'bodyText',
        });
      }
    }

    for (const topic of constraints.avoidTopics) {
      if (containsTopic(combined, topic)) {
        throw new AppError(
          'Generated mail mentions an avoided topic',
          422,
          'AI_MAIL_CONSTRAINT_VIOLATION',
          {
            topic,
          },
        );
      }
    }

    if (constraints.includeCallToAction) {
      const hasCallToAction =
        /\b(let'?s connect|discuss|conversation|speak|chat|follow up|hear from you|available to talk)\b/iu.test(
          output.bodyText,
        );
      if (!hasCallToAction) {
        warnings.push({
          code: 'MISSING_CALL_TO_ACTION',
          message: 'Body may be missing a clear call to action.',
          field: 'bodyText',
        });
      }
    }

    if (constraints.includeResumeMention) {
      const mentionsResume = /\bresume\b/iu.test(output.bodyText);
      if (!mentionsResume) {
        warnings.push({
          code: 'MISSING_RESUME_MENTION',
          message: 'Body may be missing a resume mention.',
          field: 'bodyText',
        });
      }
    }

    return {
      output: { ...output, warnings },
      warnings,
    };
  }
}

export const mailConstraintValidator = new MailConstraintValidator();
