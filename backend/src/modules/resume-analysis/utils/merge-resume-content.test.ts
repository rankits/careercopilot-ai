import { describe, expect, it } from 'vitest';

import {
  buildWorkingResumeContent,
  isIncompleteOptimizedResume,
  mergeJdSkillsIntoResume,
  patchRoleSubtitle,
  replaceSummarySection,
} from '@/modules/resume-analysis/utils/merge-resume-content';

const ORIGINAL = `Alex Rivera
Registered Nurse
alex@example.com
+91 98765 43210

PROFESSIONAL SUMMARY
Compassionate nurse with 5 years of clinical care experience.

WORK EXPERIENCE
City Hospital - Staff Nurse
2020 - Present
- Provided patient care and medication administration
- Coordinated with physicians on treatment plans

SKILLS
Patient Care, Triage, EHR

EDUCATION
B.Sc Nursing, 2019
`;

describe('merge-resume-content', () => {
  it('detects optimized resume missing name as incomplete', () => {
    const optimized = `PROFESSIONAL SUMMARY
Software engineer professional.

SKILLS
Java, Spring Boot
`;
    expect(isIncompleteOptimizedResume(ORIGINAL, optimized)).toBe(true);
  });

  it('keeps original resume and patches role + summary for cross-field', () => {
    const result = buildWorkingResumeContent({
      resumeText: ORIGINAL,
      optimizedText: `PROFESSIONAL SUMMARY
Java developer with transferable strengths.

SKILLS
Java
`,
      targetRole: 'Java Developer',
      improvedSummary:
        'Motivated professional transitioning toward Java development with strong collaboration and care-delivery discipline.',
      preferOriginalBase: true,
    });

    expect(result).toContain('Alex Rivera');
    expect(result).toContain('Java Developer');
    expect(result).toContain('City Hospital');
    expect(result).toContain('Patient Care');
    expect(result).toMatch(/Java development/i);
    expect(result.indexOf('Alex Rivera')).toBeLessThan(result.indexOf('PROFESSIONAL SUMMARY'));
  });

  it('patchRoleSubtitle replaces resume field title', () => {
    expect(patchRoleSubtitle(ORIGINAL, 'Software Engineer')).toContain('Software Engineer');
    expect(patchRoleSubtitle(ORIGINAL, 'Software Engineer')).toContain('Alex Rivera');
  });

  it('replaceSummarySection keeps experience intact', () => {
    const next = replaceSummarySection(
      ORIGINAL,
      'New summary focused on the target software role and collaboration.',
    );
    expect(next).toContain('New summary focused');
    expect(next).toContain('City Hospital');
    expect(next).toContain('Alex Rivera');
  });

  it('auto-merges missing JD skills into the Skills section', () => {
    const next = mergeJdSkillsIntoResume(ORIGINAL, ['Java', 'Spring Boot', 'Patient Care']);
    expect(next).toMatch(/SKILLS[\s\S]*Java/i);
    expect(next).toMatch(/Spring Boot/i);
    expect(next).toContain('Patient Care');
    expect(next).toContain('Alex Rivera');
  });
});
