import { describe, expect, it } from 'vitest';

import {
  answerKeyForMissingField,
  buildSetupGapToastMessage,
  destinationToSetupHref,
  resolveMissingFieldFixActions,
  resolveReadinessFixActions,
  resolveSetupGapFixActions,
} from './missingFieldNavigation';

describe('resolveMissingFieldFixActions AA-029', () => {
  it('maps known missing fields to setup sections and fields', () => {
    const actions = resolveMissingFieldFixActions([
      'workAuthorization',
      'yearsOfExperience',
      'resumeVersionId',
      'phone',
    ]);

    expect(actions).toEqual([
      expect.objectContaining({
        field: 'workAuthorization',
        destination: { kind: 'section', sectionId: 'work-auth', fieldId: 'work_authorization' },
      }),
      expect.objectContaining({
        field: 'yearsOfExperience',
        destination: { kind: 'section', sectionId: 'answers', fieldId: 'years_of_experience' },
      }),
      expect.objectContaining({
        field: 'resumeVersionId',
        destination: { kind: 'section', sectionId: 'resumes', fieldId: 'defaultResume' },
      }),
      expect.objectContaining({
        field: 'phone',
        destination: { kind: 'section', sectionId: 'personal', fieldId: 'phone' },
      }),
    ]);
  });

  it('deduplicates fields and falls back for unknown keys', () => {
    const actions = resolveMissingFieldFixActions(['custom_field', 'custom_field']);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(
      expect.objectContaining({
        field: 'custom_field',
        destination: { kind: 'section', sectionId: 'answers', fieldId: 'custom_field' },
      }),
    );
  });

  it('builds single and multi-gap toast copy', () => {
    const single = resolveMissingFieldFixActions(['phone']);
    expect(buildSetupGapToastMessage(single)).toBe('Add your phone number to continue.');

    const multi = resolveMissingFieldFixActions(['phone', 'resumeVersionId', 'consent']);
    expect(buildSetupGapToastMessage(multi)).toBe(
      '3 things needed to continue — starting with your phone number.',
    );
  });

  it('builds setup deep links with section and field params', () => {
    const actions = resolveMissingFieldFixActions(['phone']);
    const href = destinationToSetupHref(actions[0]!.destination);
    expect(href).toBe('/auto-apply?section=personal&field=phone');
  });
});

describe('resolveReadinessFixActions AA-029', () => {
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

  it('maps readiness reason codes to setup sections', () => {
    const actions = resolveReadinessFixActions(
      [
        {
          code: 'CONSENT_REQUIRED',
          message: 'Grant resume usage',
          severity: 'BLOCKING',
        },
        {
          code: 'RESUME_MISSING',
          message: 'Approve a resume',
          severity: 'BLOCKING',
        },
      ],
      [],
    );

    expect(actions[0]?.destination).toEqual({
      kind: 'section',
      sectionId: 'consents',
      fieldId: 'resume-usage',
    });
    expect(actions[1]?.destination).toEqual({
      kind: 'section',
      sectionId: 'resumes',
      fieldId: 'defaultResume',
    });
  });
});

describe('resolveSetupGapFixActions AA-029', () => {
  it('maps setup-status gaps to navigation targets', () => {
    const actions = resolveSetupGapFixActions([
      {
        code: 'PRIVACY_ACKNOWLEDGEMENT',
        label: 'Acknowledge the privacy policy',
        section: 'consents',
      },
    ]);

    expect(actions[0]?.destination).toEqual({
      kind: 'section',
      sectionId: 'consents',
      fieldId: 'privacy-acknowledgement',
    });
  });
});

describe('answerKeyForMissingField', () => {
  it('maps camelCase planner fields to snake_case answer keys', () => {
    expect(answerKeyForMissingField('workAuthorization')).toBe('work_authorization');
    expect(answerKeyForMissingField('yearsOfExperience')).toBe('years_of_experience');
  });
});
