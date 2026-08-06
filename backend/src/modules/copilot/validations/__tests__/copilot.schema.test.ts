import { describe, expect, it } from 'vitest';

import { copilotChatSchema } from '@/modules/copilot/validations/copilot.schema.js';

const validBody = {
  message: 'How should I improve my resume?',
  page: 'dashboard',
};

const parse = (body: unknown, query: unknown = {}, params: unknown = {}) =>
  copilotChatSchema.parse({ body, query, params });

describe('copilotChatSchema', () => {
  it('parses a minimal valid payload and defaults context to {}', () => {
    const result = parse(validBody);
    expect(result.body.message).toBe(validBody.message);
    expect(result.body.page).toBe('dashboard');
    expect(result.body.context).toEqual({});
  });

  it('parses a fully populated context', () => {
    const body = {
      message: 'Compare with this job',
      page: 'job/:id',
      context: {
        jobId: '123e4567-e89b-12d3-a456-426614174000',
        job: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Engineer',
          company: 'Acme',
          skills: ['Node', 'TS'],
          benefits: ['Health'],
          description: 'Do things',
          employmentType: 'Full-time',
          location: 'Remote',
        },
        applications: [{ company: 'Acme', status: 'applied', title: 'Engineer' }],
        resume: { skills: ['Node'] },
        profile: { fullName: 'Ada' },
        extra: { region: 'US' },
      },
    };
    const result = parse(body);
    expect(result.body.context.jobId).toBe(body.context.jobId);
    expect(result.body.context.applications).toHaveLength(1);
    expect(result.body.context.extra).toEqual({ region: 'US' });
  });

  it('trims surrounding whitespace from message and page', () => {
    const result = parse({ message: '  hello  ', page: '  home  ' });
    expect(result.body.message).toBe('hello');
    expect(result.body.page).toBe('home');
  });

  it('rejects an empty message', () => {
    expect(() => parse({ message: '   ', page: 'home' })).toThrow(/Message is required/i);
  });

  it('rejects a missing page', () => {
    expect(() => parse({ message: 'hello' })).toThrow(/page/i);
  });

  it('rejects an invalid job id uuid', () => {
    expect(() =>
      parse({ message: 'hi', page: 'p', context: { job: { id: 'not-a-uuid' } } }),
    ).toThrow(/uuid/i);
  });

  it('rejects an oversized message', () => {
    expect(() => parse({ message: 'x'.repeat(4001), page: 'p' })).toThrow();
  });
});
