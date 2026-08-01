import { describe, expect, it } from 'vitest';
import { InMemoryRecommendationUnitOfWork } from '@/modules/recommendations/repositories/in-memory-recommendation.unit-of-work.js';
import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';

const sampleJob = (id: string): JobListDto => ({
  id,
  title: 'Engineer',
  company: { slug: 'acme', name: 'Acme', logoUrl: null, verified: true },
  location: { formatted: 'Remote', remoteType: 'REMOTE' },
  employmentType: 'FULL_TIME',
  salary: { minimum: null, maximum: null, currency: null },
  skills: ['TypeScript'],
  publishedAt: null,
  applyUrl: null,
});

describe('recommendation repository IDOR guards', () => {
  it('scopes findById to the owning user', async () => {
    const uow = new InMemoryRecommendationUnitOfWork();
    const run = await uow.execute(({ runs }) =>
      runs.create({ userId: 'owner', sourceType: 'PROFILE' }),
    );
    const [record] = await uow.execute(({ recommendations }) =>
      recommendations.createMany(run.userId, run.id, [
        {
          job: sampleJob('job-1'),
          category: 'GOOD_MATCH',
          matchType: 'RELATED',
          scoreResult: {
            overallScore: 0.7,
            components: {
              requiredSkills: 0.7,
              title: 0.7,
              experience: 0.7,
              responsibilities: 0.7,
              preferredSkills: 0.7,
              location: 0.7,
              industry: 0.7,
              salary: 0.7,
              qualifications: 0.7,
            },
            matchedSkills: [],
            relatedSkills: [],
            missingSkills: [],
            reasons: [],
          },
        },
      ]),
    );

    const ownerView = await uow.execute(({ recommendations }) =>
      recommendations.findById('owner', record!.id),
    );
    const intruderView = await uow.execute(({ recommendations }) =>
      recommendations.findById('intruder', record!.id),
    );

    expect(ownerView?.id).toBe(record!.id);
    expect(intruderView).toBeNull();
  });
});
