import { describe, expect, it } from 'vitest';

import {
  RESUME_JOB_ANALYZER_SCHEMA_VERSION,
  ResumeJobAnalyzer,
} from '@/modules/auto-apply/services/resume-job-analyzer.js';

describe('ResumeJobAnalyzer v2', () => {
  const analyzer = new ResumeJobAnalyzer();

  it('excludes WORK_REGION from resume analysis', () => {
    const result = analyzer.analyze({
      resumeText: 'Senior engineer with Python and SQL experience building data pipelines.',
      jobTitle: 'Data Scientist',
      jobDescription: 'Machine learning and Python preferred. Must be US-based.',
      requirements: [
        {
          code: 'WORK_REGION',
          assertion: 'REQUIRES',
          required: true,
          sourceText: 'Must be based in the United States',
        },
        {
          code: 'TOTAL_EXPERIENCE_YEARS',
          assertion: 'REQUIRES',
          required: true,
          sourceText: '5+ years of experience building data products',
          value: 5,
        },
      ],
    });

    expect(result.excludedRequirements.some((e) => e.code === 'WORK_REGION')).toBe(true);
    expect(result.missingEvidence.join(' ')).not.toMatch(/WORK[_\s]?REGION/i);
    expect(result.strengths.join(' ') + result.missingEvidence.join(' ')).not.toMatch(
      /WORK REGION/,
    );
    expect(result.schemaVersion).toBe(RESUME_JOB_ANALYZER_SCHEMA_VERSION);
  });

  it('excludes sponsorship and authorization', () => {
    const result = analyzer.analyze({
      resumeText: 'Backend developer with Go and distributed systems experience.',
      jobTitle: 'Backend Engineer',
      jobDescription: 'Go experience required. Sponsorship not available.',
      requirements: [
        {
          code: 'SPONSORSHIP',
          required: true,
          sourceText: 'Sponsorship is not available',
        },
        {
          code: 'WORK_AUTHORIZATION',
          required: true,
          sourceText: 'Must be authorized to work in the US',
        },
      ],
    });

    expect(result.overallAlignment).toBeNull();
    expect(result.status).toBe('LIMITED');
    expect(result.confidence).toBe('LOW');
    expect(result.warnings.some((w) => w.code === 'NO_RESUME_RELEVANT_REQUIREMENTS')).toBe(true);
  });

  it('includes experience requirements with human-readable titles and evidence', () => {
    const result = analyzer.analyze({
      resumeText:
        'Built ETL data pipelines processing millions of events daily using Python and SQL.',
      jobTitle: 'Data Engineer',
      jobDescription: 'Need data pipelines and Python',
      requirements: [
        {
          code: 'TOTAL_EXPERIENCE_YEARS',
          required: true,
          importance: 'REQUIRED',
          sourceText: 'Experience building data pipelines with Python',
        },
      ],
    });

    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.strengths[0]).toMatch(/Total professional experience|data pipelines|Python/i);
    expect(result.strengths[0]).toMatch(/Evidence:/i);
    expect(result.strengths.join(' ')).not.toMatch(/TOTAL_EXPERIENCE_YEARS/);
    expect(result.keywords.matched.length).toBeGreaterThan(0);
    expect(result.keywords.matched).not.toContain('the');
    expect(result.keywords.matched).not.toContain('and');
  });

  it('returns LIMITED with null alignment when no resume-relevant requirements exist', () => {
    const result = analyzer.analyze({
      resumeText: 'Some long enough resume body text for analysis purposes.',
      jobTitle: 'Role',
      jobDescription: 'US based role',
      requirements: [{ code: 'WORK_REGION', required: true, sourceText: 'US only' }],
    });
    expect(result.overallAlignment).toBeNull();
    expect(result.confidence).toBe('LOW');
    expect(result.status).toBe('LIMITED');
  });
});
