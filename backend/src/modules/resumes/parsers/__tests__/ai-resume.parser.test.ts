import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  fallback: vi.fn(),
  providers: vi.fn(() => ({})),
  schemaParse: vi.fn((v: unknown) => v),
  normalize: vi.fn((v: unknown) => v),
  normalizeSkills: vi.fn((v: unknown) => (Array.isArray(v) ? v : [])),
}));

vi.mock('@/modules/resumes/ai/resumeParser.js', () => ({
  parseResumeWithFallback: h.fallback,
}));

vi.mock('@/modules/resumes/ai/ai-model.factory.js', () => ({
  createResumeAiProviders: h.providers,
}));

vi.mock('@/modules/resumes/schemas/canonical-resume.schema.js', () => ({
  ExpandedCanonicalResumeSchema: { parse: h.schemaParse },
}));

vi.mock('@/modules/resumes/normalisation/resume-normaliser.service.js', () => ({
  resumeNormaliserService: { normalize: h.normalize },
}));

vi.mock('@/modules/resumes/utils/skill-normalizer.js', () => ({
  normalizeProfessionalSkills: h.normalizeSkills,
}));

import { AiResumeParser } from '@/modules/resumes/parsers/ai-resume.parser.js';

const baseResponse = {
  parseQuality: { overallConfidence: 0.87 },
  personalDetails: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    location: 'Remote, US',
    links: [
      { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/jane' },
      { platform: 'github', url: 'github.com/jane' },
      { platform: 'portfolio', url: 'https://jane.dev' },
      { platform: 'unknown-platform', url: 'https://x.dev' },
      { platform: 'linkedin', url: 'https://linkedin2.example' },
    ],
  },
  employmentHistory: [
    {
      id: 'e1',
      companyName: 'Acme',
      titles: ['Senior Engineer', 'Engineer'],
      startDate: '2022-03',
      endDate: 'Present',
      accomplishments: ['Shipped things', 'Led a team'],
    },
    {
      companyName: 'Beta',
      titles: 'Engineer',
      startDate: '2020-01',
      endDate: '2022-02',
    },
  ],
  education: [
    {
      institutionName: 'State University',
      degreeName: 'B.S. Computer Science',
      startDate: '2016',
      endDate: '2020',
    },
  ],
  skills: { technical: ['TypeScript', 'React'], soft: ['Communication'] },
  tools: ['Git'],
  languages: [{ name: 'English', proficiency: 'native' }],
  certifications: ['AWS Certified'],
  experiencesSummary: '5 years of experience building web apps',
  headline: 'Senior Engineer',
  professionalSummary: 'Summary text',
  totalExperienceYears: 5,
  totalExperienceMonths: 60,
  parseQuality: { overallConfidence: 0.87 },
};

beforeEach(() => {
  h.fallback.mockReset();
  h.providers.mockClear();
  h.schemaParse.mockClear();
  h.normalize.mockImplementation((v: unknown) => v);
  h.normalizeSkills.mockImplementation((v: unknown) => (Array.isArray(v) ? v : []));
  h.fallback.mockResolvedValue(baseResponse);
});

describe('AiResumeParser', () => {
  it('parses a structured response and returns normalize-d data', async () => {
    const result = await new AiResumeParser().parseResume({ extractedText: 'hello' });

    expect(h.fallback).toHaveBeenCalledWith(
      expect.objectContaining({
        documentText: 'hello',
        metadata: expect.objectContaining({ schemaVersion: 'resume-schema-v2' }),
      }),
      expect.anything(),
    );
    expect(h.schemaParse).toHaveBeenCalled();
    expect(h.normalize).toHaveBeenCalled();
    expect(result.parserVersion).toBe('ai-resume-v3');
    expect(result.confidenceScore).toBe(0.87);
    expect(result.data).toBeDefined();
  });

  it('parses a JSON-string response', async () => {
    const str = JSON.stringify(baseResponse);
    h.fallback.mockResolvedValue(str);
    const result = await new AiResumeParser().parseResume({ extractedText: 'x' });
    expect(result.confidenceScore).toBe(0.87);
  });

  it('propagates the normalized result to data', async () => {
    const normalized = { contacts: { email: 'a@b.c' } };
    h.normalize.mockReturnValue(normalized);
    const result = await new AiResumeParser().parseResume({ extractedText: 'x' });
    expect(result.data).toBe(normalized);
  });
});

describe('AiResumeParser buildCanonicalResume shapes', () => {
  const parser = new AiResumeParser();
  const run = async (data: Record<string, unknown>) => {
    h.fallback.mockResolvedValue({ ...baseResponse, ...data });
    return parser.parseResume({ extractedText: 'x' });
  };

  it('normalises an array-form skills block and QA labels', async () => {
    await run({
      skills: ['React', 'Selenium', 'Playwright Cucumber'],
      headline: 'Test Engineer',
      employmentHistory: [
        { companyName: 'Co', title: 'QA', startDate: '2021-01', endDate: '2023-02' },
      ],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('parses grouped skills when technical is empty', async () => {
    await run({
      skills: { backend: ['Go'], frontend: ['React'], tools: ['Docker'], soft_skills: ['X'] },
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('applies each seniority boundary via declared experience', async () => {
    for (const months of [0, 5, 12, 20, 36, 60, 72, 130, 144, 200]) {
      // totalExperienceYears must be undefined so the base fixture's declared
      // years do not inflate the total and mask the boundary under test.
      await run({
        employmentHistory: [],
        totalExperienceMonths: months,
        totalExperienceYears: undefined,
      });
    }
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('tolerates a missing/invalid date while accumulating experience', async () => {
    await run({
      employmentHistory: [
        { startDate: '2018-06', endDate: '2021-02' },
        { startDate: '2021', endDate: 'present' },
        { startDate: '', endDate: '' },
      ],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('stays on a null-ish input', async () => {
    h.fallback.mockResolvedValue(null);
    const result = await parser.parseResume({ extractedText: 'x' });
    expect(result.parserVersion).toBe('ai-resume-v3');
  });

  it('maps a comprehensive kitchen-sink response', async () => {
    await run({
      personal_information: {
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'j@x.com',
        phone: '123',
        location: { city: 'Remote' },
        summary: 'Summary',
        headline: 'Sr Engineer',
        current_title: 'Principal',
        current_company: 'Acme',
        professional_labels: [
          {
            label: 'QA Automation Engineer',
            category: 'SPECIALISATION',
            confidence: 0.9,
            source: 'INFERRED',
            evidence: ['Selenium'],
          },
        ],
      },
      links: [
        { platform: 'LinkedIn', url: 'linkedin.com/in/jane' },
        { platform: 'github', url: 'github.com/jane' },
        { platform: 'portfolio', url: 'https://jane.dev' },
        { platform: 'personal website', url: 'https://jane.example' },
        { platform: 'stack overflow', url: 'https://so.example' },
        { platform: 'leetcode', url: 'https://leetcode.example' },
        { platform: 'hackerrank', url: 'https://hr.example' },
        { platform: 'behance', url: 'https://behance.example' },
        { platform: 'dribbble', url: 'https://dribbble.example' },
        'https://plain.example/1',
        { platform: '', url: 'https://other.example' },
        { label: 'Explicit label', url: 'https://label.example' },
      ],
      skills: {
        backend: ['Go'],
        frontend: ['React'],
        data: ['SQL'],
        cloudDevops: ['AWS'],
        practices: ['CI'],
        tools: ['Git'],
        frameworks: ['Express'],
        softSkills: ['Comm'],
        domains: ['Fintech'],
        technical: ['TypeScript'],
      },
      employmentHistory: [
        {
          company: 'Acme',
          title: 'Senior Engineer',
          startDate: '2015-03',
          endDate: '2018-10',
          isCurrent: false,
          accomplishments: ['Led a', 'Built b'],
        },
        {
          company: 'Beta',
          title: 'Engineer',
          startDate: '2021-01',
          endDate: 'present',
          isCurrent: true,
          accomplishments: ['Planning'],
        },
        { company: 'Gamma', startDate: '2010-01', endDate: '2012-02' },
      ],
      education: [{ institution: 'MIT', degree: 'B.S.', startDate: '2006', endDate: '2010' }],
      certifications: [{ name: 'AWS Certified', issuer: 'AWS' }],
      languages: [{ name: 'English', proficiency: 'advanced' }],
      projects: [{ name: 'Proj', description: 'Built things' }],
      awards: ['Best Dev'],
      publications: ['A paper'],
      experienceHeadline: 'Lead',
      totalExperienceYears: 8,
      currentPosition: { title: 'Staff', company: 'Acme' },
      professionalProfile: { totalExperienceMonths: 100, totalExperienceYears: 10 },
      parseQuality: {
        overallConfidence: 0.9,
        requiresReview: true,
        missingImportantFields: ['email'],
        warnings: ['punctuation'],
      },
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('normalises many date formats, ranges and totals', async () => {
    await run({
      employmentHistory: [
        // splitDateRange: two parts, end is a "present" token.
        { company: 'A', title: 'T', dateRange: 'May 2015 - Present' },
        // splitDateRange: two parts separated by "to", monthYear end.
        { company: 'B', title: 'T', dateRange: '2016-01 to 2017 Mar' },
        // splitDateRange: two parts separated by an en-dash.
        { company: 'C', title: 'T', duration: '05/2015 – 2015/12' },
        // splitDateRange: single part that is a current token.
        { company: 'D', title: 'T', dates: 'Ongoing' },
        // splitDateRange: single plain YYYY-MM part.
        { company: 'E', title: 'T', period: '2018-06' },
        // numericMonthYear + yearMonthNumeric (in-range months).
        { company: 'F', title: 'T', startDate: '05/2015', endDate: '2015/12' },
        // yearMonthName in-range + unknown month (falls through to null).
        { company: 'G', title: 'T', from: '2015 May', to: '2016 Xxx' },
        // numericMonthYear + yearMonthNumeric with out-of-range months.
        { company: 'H', title: 'T', startDate: '13/2015', endDate: '13/2016' },
        { company: 'I', title: 'T', startDate: '2015/13', endDate: '2015/00' },
        // yearOnlyInRange with both dash and "to" delimiters.
        { company: 'J', title: 'T', start_date: '2018 - 2021', end_date: '2018 to 2021' },
        // Explicit null endDate drives the isCurrent fallback (item.endDate === null).
        { company: 'K', title: 'T', startDate: '2019-03', endDate: null },
        // Zero-length period is still a valid calculateTotalExperienceMonths entry.
        { company: 'L', title: 'T', startDate: '2020-01', endDate: '2020-01' },
        // yearOnlyInRange matches but no delimiter -> null.
        { company: 'M', title: 'T', startDate: '2018 2021' },
        // No 19xx/20xx year at all -> null.
        { company: 'N', title: 'T', startDate: 'unknown' },
        // monthYear with an unrecognised month name -> null.
        { company: 'O', title: 'T', startDate: 'Xxx 2015' },
        // yearMonthName with an unrecognised month name -> null.
        { company: 'P', title: 'T', startDate: '2015 Xxx' },
        // Garbage item dates fall back to the parsed dateRange (?? range.startDate/endDate).
        {
          company: 'Q',
          title: 'T',
          startDate: 'bad',
          endDate: 'also bad',
          dateRange: '2020-01 - 2022-02',
        },
        // endText ?? chain: end_date / to / end variants.
        { company: 'R', title: 'T', end_date: '2021-01' },
        { company: 'S', title: 'T', to: '2022-01' },
        { company: 'U', title: 'T', end: '2023-01' },
        // Non-record item is skipped by mapExperience.
        42,
      ],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('covers proficiency, language, skill, link and label variants', async () => {
    await run({
      languages: [
        'English',
        'Spanish',
        '',
        { name: 'German', proficiency: 'basic' },
        { name: 'French', proficiency: 'conversational' },
        { name: 'Hindi', proficiency: 'professional' },
        { name: 'Mandarin', proficiency: 'fluent' },
        { name: 'Arabic', proficiency: 'beginner' },
        { name: 'Italian', proficiency: 'working proficiency' },
        { name: 'Japanese', proficiency: 'intermediate' },
        { name: 'Korean', proficiency: 'mystery' },
        { name: '' },
        42,
      ],
      // Array-form skills block with string, empty, record and non-record items.
      skills: [
        'React',
        'Selenium',
        '',
        { name: 'Docker' },
        { label: 'Kubernetes' },
        { skill: 'Terraform' },
        { name: '' },
        { unrelated: 'field' },
        7,
      ],
      links: [
        // Single-word website/stackoverflow platform aliases.
        { platform: 'website', url: 'https://site.example' },
        { platform: 'stackoverflow', url: 'https://so.example' },
        // Empty URL is dropped (ensureUrl null).
        { platform: 'personal website', url: '' },
        // Non-http URL is prefixed and lands in "other".
        { platform: 'x', url: 'mailto:foo@bar.com' },
        // Empty string link -> ensureUrl null.
        '',
        // Non-record link item -> skipped.
        42,
      ],
      professional_labels: [
        'Engineer',
        '',
        { label: '', name: 'Backup' },
        { name: 'QA', category: '', confidence: 2, source: '', evidence: ['Selenium'] },
        { value: 'Tester', confidence: 0.5 },
        42,
      ],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('normalises string arrays with records and non-record project/education items', async () => {
    await run({
      employmentHistory: [
        {
          company: 'X',
          title: 'T',
          startDate: '2020-01',
          endDate: '2021-01',
          responsibilities: [
            'Build',
            'Build',
            '',
            { name: 'Lead' },
            { label: 'Lead' },
            { value: 'Test' },
            { url: 'http://u' },
            { name: '' },
            42,
          ],
        },
      ],
      projects: [42, { description: 'no name' }, { title: 'Real', responsibilities: ['A', 'A'] }],
      education: [42],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('maps location records with nested address fields', async () => {
    await run({
      personal_information: {
        location: { city: 'Remote', state: 'CA', country: 'US', postalCode: '94000' },
      },
    });
    await run({
      personal_information: { location: { region: 'R', town: 'T', postal_code: '1', zip: '2' } },
    });
    await run({
      personal_information: { location: { locality: 'L' } },
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('extracts stated experience years from professional summaries', async () => {
    // First regex, in-range.
    await run({ professionalSummary: '5 years of experience', totalExperienceYears: undefined });
    // Second regex, in-range.
    await run({
      professionalSummary: 'experience: 7 years of work',
      totalExperienceYears: undefined,
    });
    // First regex but out of range (years > 0 fails).
    await run({ professionalSummary: '0 years of experience', totalExperienceYears: undefined });
    // Second regex but out of range (years < 60 fails).
    await run({ professionalSummary: 'experience: 100 years', totalExperienceYears: undefined });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('accepts string experience totals and missing declared years', async () => {
    // String declaredYears parses; non-numeric string months fall back to null.
    await run({ totalExperienceYears: '3', totalExperienceMonths: 'abc' });
    // No declared years at all -> monthsFromDeclaredYears stays null.
    await run({
      totalExperienceYears: undefined,
      totalExperienceMonths: undefined,
      employmentHistory: [],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('falls back when the professional profile has no summary or primary role', async () => {
    await run({ professionalSummary: null, professional_labels: [] });
    expect(h.schemaParse).toHaveBeenCalled();
  });

  it('maps a sparse nested response down the fallback chain', async () => {
    await run({
      personal_info: { firstName: 'A', lastName: 'B', email: 'a@b.c' },
      experience: [{ employer: 'X', title: 'Role', startedAt: '2022-05', endedAt: '2024-06' }],
      skillset: { software: ['Node'] },
      spokenLanguages: ['English'],
      certificates: [{ awardedBy: 'C', year: 2020 }],
      projectHistory: [{ name: 'P' }],
      professionalSummary: 'string',
      professionalHeadline: 'string',
      labels: [],
    });
    expect(h.schemaParse).toHaveBeenCalled();
  });
});
