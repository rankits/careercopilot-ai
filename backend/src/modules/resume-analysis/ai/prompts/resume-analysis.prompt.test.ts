import { describe, expect, it } from 'vitest';
import {
  RESUME_ANALYSIS_COMPACT_SYSTEM_PROMPT,
  buildResumeAnalysisPrompt,
} from '@/modules/resume-analysis/ai/prompts/resume-analysis.prompt.js';

describe('resume-analysis.prompt', () => {
  it('builds full prompt by default', () => {
    const prompt = buildResumeAnalysisPrompt('Resume text', 'Java Developer', 'mid', 'Need Java');
    expect(prompt.systemPrompt).toContain('ATS resume analyst');
    expect(prompt.userMessage).toContain('Java Developer');
    expect(prompt.userMessage).toContain('Need Java');
  });

  it('builds compact prompt when requested', () => {
    const prompt = buildResumeAnalysisPrompt('Resume text', 'Java Developer', 'mid', undefined, {
      compact: true,
    });
    expect(prompt.systemPrompt).toBe(RESUME_ANALYSIS_COMPACT_SYSTEM_PROMPT);
    expect(prompt.userMessage).toContain('Return ONLY the JSON');
  });
});
