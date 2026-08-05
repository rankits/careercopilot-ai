import { describe, expect, it } from 'vitest';

import { DeterministicRequirementExtractor } from '@/modules/auto-apply/services/deterministic-requirement-extractor.service.js';

describe('DeterministicRequirementExtractor — OpenAI-style location', () => {
  it('extracts US work region from “based in San Francisco, CA”', async () => {
    const text = `
About the Role We’re hiring research scientists and research engineers.
This role is based in San Francisco, CA. In this role, you will design evaluations.
You might thrive if you have research or engineering experience across LLM training.
`;
    const extractor = new DeterministicRequirementExtractor();
    const { requirements } = await extractor.extract({
      sanitizedText: text,
      sourceUrl: 'https://jobs.ashbyhq.com/openai/example',
      provider: 'ASHBY',
    });

    const region = requirements.find((item) => item.code === 'WORK_REGION');
    expect(region?.assertion).toBe('REQUIRES');
    expect(region?.geographic?.normalizedRegion).toBe('UNITED_STATES');
    expect(region?.geographic?.explicitCountries).toContain('US');
    expect(region?.sourceText).toMatch(/San Francisco,\s*CA/i);
  });
});
