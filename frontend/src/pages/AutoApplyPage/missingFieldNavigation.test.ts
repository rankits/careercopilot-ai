import { describe, expect, it } from 'vitest';

import {
  answerKeyForMissingField,
  resolveMissingFieldFixActions,
  resolveReadinessFixActions,
} from './missingFieldNavigation';

describe('resolveMissingFieldFixActions', () => {
  it('maps known missing fields to the correct Auto Apply tabs', () => {
    const actions = resolveMissingFieldFixActions([
      'workAuthorization',
      'yearsOfExperience',
      'resumeVersionId',
    ]);

    expect(actions).toEqual([
      expect.objectContaining({
        field: 'workAuthorization',
        label: 'Add work authorization',
        destination: { kind: 'tab', tab: 'answers' },
      }),
      expect.objectContaining({
        field: 'yearsOfExperience',
        label: 'Add years of experience',
        destination: { kind: 'tab', tab: 'answers' },
      }),
      expect.objectContaining({
        field: 'resumeVersionId',
        label: 'Approve a resume',
        destination: { kind: 'tab', tab: 'resumes' },
      }),
    ]);
  });

  it('deduplicates fields and falls back for unknown keys', () => {
    const actions = resolveMissingFieldFixActions(['custom_field', 'custom_field']);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(
      expect.objectContaining({
        field: 'custom_field',
        destination: { kind: 'tab', tab: 'answers' },
        label: 'Fix custom field',
      }),
    );
  });
});

describe('resolveReadinessFixActions', () => {
  it('maps match-score blockers to For You even without unresolvedQuestions', () => {
    const actions = resolveReadinessFixActions(
      [
        {
          code: 'MATCH_SCORE_MISSING',
          message: 'No match score yet for this job.',
          severity: 'WARNING',
        },
      ],
      [],
    );

    expect(actions).toEqual([
      expect.objectContaining({
        id: 'MATCH_SCORE_MISSING',
        label: 'Open For You',
        destination: { kind: 'route', href: '/for-you' },
      }),
    ]);
  });
});

describe('answerKeyForMissingField', () => {
  it('maps camelCase planner fields to snake_case answer keys', () => {
    expect(answerKeyForMissingField('workAuthorization')).toBe('work_authorization');
    expect(answerKeyForMissingField('yearsOfExperience')).toBe('years_of_experience');
  });
});
