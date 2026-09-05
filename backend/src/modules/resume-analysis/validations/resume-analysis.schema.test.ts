import { describe, expect, it } from 'vitest';
import {
  analyzeResumeSchema,
  exportResumeQuerySchema,
  updateAnalysisContentSchema,
} from '@/modules/resume-analysis/validations/resume-analysis.schema.js';

describe('resume-analysis.schema', () => {
  it('requires target role for analyze', () => {
    const parsed = analyzeResumeSchema.safeParse({
      params: { resumeId: '7797e65a-424b-4539-aa28-6bc20d7948ea' },
      body: { targetRole: '', experienceLevel: 'mid' },
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid analyze payload', () => {
    const parsed = analyzeResumeSchema.safeParse({
      params: { resumeId: '7797e65a-424b-4539-aa28-6bc20d7948ea' },
      body: {
        targetRole: 'Java Developer',
        experienceLevel: 'mid',
        jobDescription: 'Need Java Spring Boot',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('validates content update and export format', () => {
    expect(
      updateAnalysisContentSchema.safeParse({
        params: { resumeId: '7797e65a-424b-4539-aa28-6bc20d7948ea' },
        body: { content: 'SKILLS\nJava' },
      }).success,
    ).toBe(true);

    expect(
      exportResumeQuerySchema.safeParse({
        params: { resumeId: '7797e65a-424b-4539-aa28-6bc20d7948ea' },
        query: { format: 'pdf' },
      }).success,
    ).toBe(true);
  });
});
