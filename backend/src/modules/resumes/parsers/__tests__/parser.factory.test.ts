import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const makeClass = (name: string) =>
    class {
      static label = name;
    };
  return {
    config: { parserEngine: 'RULE_BASED' },
    RuleBased: makeClass('RuleBasedResumeParser'),
    Ai: makeClass('AiResumeParser'),
  };
});

vi.mock('@/modules/resumes/config/resume.config.js', () => ({ resumeConfig: h.config }));

vi.mock('@/modules/resumes/parsers/rule-based-resume.parser.js', () => ({
  RuleBasedResumeParser: h.RuleBased,
}));

vi.mock('@/modules/resumes/parsers/ai-resume.parser.js', () => ({
  AiResumeParser: h.Ai,
}));

import { createResumeParser } from '@/modules/resumes/parsers/parser.factory.js';
import { RuleBasedResumeParser } from '@/modules/resumes/parsers/rule-based-resume.parser.js';
import { AiResumeParser } from '@/modules/resumes/parsers/ai-resume.parser.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

beforeEach(() => {
  h.config.parserEngine = 'RULE_BASED';
});

describe('createResumeParser', () => {
  it('returns a rule-based parser when configured for RULE_BASED', () => {
    h.config.parserEngine = 'RULE_BASED';
    const parser = createResumeParser();
    expect(parser).toBeInstanceOf(RuleBasedResumeParser);
  });

  it('returns an AI parser when configured for AI', () => {
    h.config.parserEngine = 'AI';
    const parser = createResumeParser();
    expect(parser).toBeInstanceOf(AiResumeParser);
  });

  it('throws a 501 AppError for an unsupported engine', () => {
    h.config.parserEngine = 'MAGIC';
    try {
      createResumeParser();
      throw new Error('expected createResumeParser to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(501);
      expect((error as AppError).message).toContain('Unsupported resume parser engine');
    }
  });
});
