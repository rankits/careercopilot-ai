import { describe, expect, it } from 'vitest';
import {
  buildJobListingCorpus,
  mergeAnalysisCorpus,
} from '@/modules/auto-apply/utils/merge-analysis-corpus.util.js';

describe('buildJobListingCorpus', () => {
  it('includes title, company, skills, and description', () => {
    const corpus = buildJobListingCorpus({
      title: 'Business Development Representative, MEA',
      companyName: 'Notion',
      companySlug: 'notion',
      employmentType: 'FULL_TIME',
      remoteType: 'REMOTE',
      skills: ['Salesforce', 'Outbound'],
      tags: ['sales'],
      descriptionText:
        'We are looking for a BDR based in the Middle East and Africa region. ' +
        'Must have 2+ years of SaaS outbound experience.',
    });

    expect(corpus).toContain('Business Development Representative, MEA at Notion');
    expect(corpus).toContain('Employment type: FULL_TIME');
    expect(corpus).toContain('Work mode: REMOTE');
    expect(corpus).toContain('Skills: Salesforce, Outbound');
    expect(corpus).toContain('Tags: sales');
    expect(corpus).toContain('Must have 2+ years of SaaS outbound experience');
  });

  it('falls back to companySlug when name is missing', () => {
    const corpus = buildJobListingCorpus({
      title: 'Engineer',
      companySlug: 'openai',
      descriptionText: 'Build cool things.',
    });
    expect(corpus).toContain('Engineer at openai');
  });
});

describe('mergeAnalysisCorpus', () => {
  const richJd =
    'Business Development Representative, MEA at Notion\n' +
    'Employment type: FULL_TIME\n\n' +
    'We are hiring a BDR for the Middle East and Africa region. ' +
    'Requirements include 2+ years SaaS outbound experience, fluency in English, ' +
    'and willingness to travel within the MEA region. Candidates must be based in UAE.';

  it('keeps the job listing when the Ashby application page is a thin form shell', () => {
    const page =
      'Apply for Business Development Representative\n' +
      'Submit application\nFirst name\nLast name\nEmail\nResume upload';

    const merged = mergeAnalysisCorpus({ listingText: richJd, pageText: page });
    expect(merged).toBe(richJd);
    expect(merged).toContain('2+ years SaaS outbound');
    expect(merged).not.toContain('Resume upload');
  });

  it('combines listing and page when both are substantial and distinct', () => {
    const page = [
      'Application questions for Notion BDR MEA role.',
      'Why do you want to join Notion? Please describe your experience selling',
      'productivity software into enterprise accounts across EMEA. Include quota',
      'attainment for the last two years and any languages spoken.',
      'Also confirm you can work from Dubai or Riyadh and have a valid work visa.',
      'Describe a complex multi-stakeholder deal you supported from first touch',
      'through close, including CRM hygiene and forecasting accuracy.',
      'List any certifications (e.g. Salesforce Admin) and outbound tools used.',
    ].join(' ');

    expect(page.length).toBeGreaterThanOrEqual(400);

    const merged = mergeAnalysisCorpus({ listingText: richJd, pageText: page });
    expect(merged).toContain('=== Job listing ===');
    expect(merged).toContain('=== Application page ===');
    expect(merged).toContain('2+ years SaaS outbound');
    expect(merged).toContain('quota attainment');
  });

  it('does not duplicate when the page already contains the listing', () => {
    const page = `${richJd}\n\nApply now`;
    const merged = mergeAnalysisCorpus({ listingText: richJd, pageText: page });
    expect(merged).toBe(page);
    expect(merged.match(/Business Development Representative/g)?.length).toBe(1);
  });

  it('falls back to page text when listing is empty', () => {
    expect(mergeAnalysisCorpus({ listingText: '', pageText: 'Page only content' })).toBe(
      'Page only content',
    );
  });

  it('falls back to listing when page is empty', () => {
    expect(mergeAnalysisCorpus({ listingText: richJd, pageText: '' })).toBe(richJd);
  });
});
