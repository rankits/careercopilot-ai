import { describe, expect, it } from 'vitest';

import { mapJobListDtoToCard } from './mapJobToCard';

describe('mapJobListDtoToCard', () => {
  it('maps JobListDto fields into JobCardData without fabricated match scores', () => {
    const card = mapJobListDtoToCard({
      id: 'abc',
      title: 'Backend Engineer',
      company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
      location: { formatted: 'Remote', remoteType: 'REMOTE' },
      employmentType: 'FULL_TIME',
      salary: { minimum: 100000, maximum: 140000, currency: 'USD' },
      skills: ['Go', 'Postgres'],
      publishedAt: new Date().toISOString(),
      applyUrl: 'https://acme.test/jobs/1',
    });

    expect(card.id).toBe('abc');
    expect(card.title).toBe('Backend Engineer');
    expect(card.company).toBe('Acme');
    expect(card.logo).toBe('A');
    expect(card.logoUrl).toBeUndefined();
    expect(card.applyUrl).toBe('https://acme.test/jobs/1');
    expect(card.tags).toContain('remote');
    expect(card.match).toBeUndefined();
    expect(card.isRecommended).toBeUndefined();
  });

  it('uses missing-value fallbacks for salary skills logo and unknown work mode', () => {
    const card = mapJobListDtoToCard({
      id: 'sparse',
      title: 'Engineer',
      company: { slug: 'x', name: '', logoUrl: null, verified: false },
      location: { formatted: '', remoteType: 'TELEPORT' },
      employmentType: null,
      salary: { minimum: null, maximum: null, currency: null },
      skills: [],
      publishedAt: null,
      applyUrl: null,
    });

    expect(card.company).toBe('Company not listed');
    expect(card.logo).toBe('?');
    expect(card.location).toBe('Location not listed');
    expect(card.salary).toBe('Not disclosed');
    expect(card.skills).toEqual([]);
    expect(card.applyUrl).toBeNull();
    expect(card.type).toBe('Work mode unknown');
  });
});
