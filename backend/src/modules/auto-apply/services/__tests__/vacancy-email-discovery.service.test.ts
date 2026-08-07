import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VacancyEmailDiscoveryService } from '@/modules/auto-apply/services/vacancy-email-discovery.service.js';
import { IJobDescriptionLookup } from '@/modules/auto-apply/contracts/vacancy-email.contract.js';

describe('VacancyEmailDiscoveryService', () => {
  let jobDescriptionLookup: IJobDescriptionLookup;
  let service: VacancyEmailDiscoveryService;

  beforeEach(() => {
    jobDescriptionLookup = {
      findDescriptionText: vi.fn().mockResolvedValue('Apply to careers@acme.com to be considered.'),
    };
    service = new VacancyEmailDiscoveryService(jobDescriptionLookup);
  });

  it('returns the best candidate found in the job description', async () => {
    const result = await service.discoverForJob('job-1');
    expect(result.bestCandidate?.email).toBe('careers@acme.com');
    expect(result.candidates).toHaveLength(1);
  });

  it('returns no candidates when the job has no description', async () => {
    vi.mocked(jobDescriptionLookup.findDescriptionText).mockResolvedValue(null);
    const result = await service.discoverForJob('missing-job');
    expect(result.bestCandidate).toBeNull();
    expect(result.candidates).toEqual([]);
  });

  it('returns no candidates when the description has no email', async () => {
    vi.mocked(jobDescriptionLookup.findDescriptionText).mockResolvedValue('No contact info here.');
    const result = await service.discoverForJob('job-1');
    expect(result.bestCandidate).toBeNull();
  });
});
