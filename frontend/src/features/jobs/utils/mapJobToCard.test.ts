import { describe, expect, it } from 'vitest';

import { isWorkModeLabel, mapJobListDtoToCard } from './mapJobToCard';

describe('mapJobListDtoToCard', () => {
  it('maps JobListDto fields into JobCardData without fabricated match scores', () => {
    const card = mapJobListDtoToCard({
      id: 'abc',
      title: 'Backend Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      location: { formatted: 'Berlin, Germany', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 100000, maximum: 140000, currency: 'USD' },
      skills: ['Go', 'Postgres', 'onsite', 'arbeitnow'],
      publishedAt: new Date().toISOString(),
      applyUrl: 'https://acme.test/jobs/1',
    });

    expect(card.id).toBe('abc');
    expect(card.title).toBe('Backend Engineer');
    expect(card.company).toBe('Acme');
    expect(card.logo).toBe('A');
    expect(card.applyUrl).toBe('https://acme.test/jobs/1');
    expect(card.location).toBe('Berlin, Germany');
    expect(card.type).toBe('Remote');
    expect(card.experience).toBe('');
    expect(card.verified).toBe(true);
    expect(card.skills).toEqual(['Go', 'Postgres']);
    expect(card.tags).toContain('remote');
    expect(card.match).toBeUndefined();
    expect(card.isRecommended).toBeUndefined();
  });

  it('omits work-mode-only locations and unknown placeholders', () => {
    const card = mapJobListDtoToCard({
      id: 'sparse',
      title: 'Engineer',
      company: { slug: 'x', name: '', logoUrl: null, verified: false },
      location: { formatted: 'On-site', remoteType: 'ONSITE' },
      employmentType: null,
      salary: { minimum: null, maximum: null, currency: null },
      skills: ['Product & Design', 'onsite', 'arbeitnow'],
      publishedAt: null,
      applyUrl: null,
    });

    expect(card.company).toBe('Company not listed');
    expect(card.logo).toBe('?');
    expect(card.location).toBe('');
    expect(card.type).toBe('On-site');
    expect(card.skills).toEqual(['Product & Design']);
    expect(card.salary).toBe('Not disclosed');
    expect(card.applyUrl).toBeNull();
    expect(card.verified).toBe(false);
  });
});

describe('isWorkModeLabel', () => {
  it('detects remote/hybrid/onsite labels', () => {
    expect(isWorkModeLabel('On-site')).toBe(true);
    expect(isWorkModeLabel('Remote')).toBe(true);
    expect(isWorkModeLabel('Berlin')).toBe(false);
  });
});
