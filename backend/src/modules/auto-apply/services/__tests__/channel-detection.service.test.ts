import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChannelDetectionService } from '@/modules/auto-apply/services/channel-detection.service.js';
import { IChannelDetectionJobLookup } from '@/modules/auto-apply/contracts/channel-detection.contract.js';

describe('ChannelDetectionService', () => {
  let jobLookup: IChannelDetectionJobLookup;
  let service: ChannelDetectionService;

  beforeEach(() => {
    jobLookup = {
      findJobChannelSnapshot: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'ACTIVE',
        applyUrl: 'https://acme.com/careers/backend-engineer',
      }),
    };
    service = new ChannelDetectionService(jobLookup);
  });

  it('returns EXTERNAL_MANUAL for an active job with a safe apply URL', async () => {
    const result = await service.detectChannel('job-1');
    expect(result.channel).toBe('EXTERNAL_MANUAL');
  });

  it('returns UNSUPPORTED when the job cannot be found', async () => {
    vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue(null);
    const result = await service.detectChannel('missing-job');
    expect(result.channel).toBe('UNSUPPORTED');
  });

  it('returns UNSUPPORTED for a non-ACTIVE job even with a valid apply URL', async () => {
    vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue({
      id: 'job-1',
      status: 'CLOSED',
      applyUrl: 'https://acme.com/careers/backend-engineer',
    });
    const result = await service.detectChannel('job-1');
    expect(result.channel).toBe('UNSUPPORTED');
  });

  it('returns UNSUPPORTED when the job has no safe apply URL', async () => {
    vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue({
      id: 'job-1',
      status: 'ACTIVE',
      applyUrl: null,
    });
    const result = await service.detectChannel('job-1');
    expect(result.channel).toBe('UNSUPPORTED');
  });

  it('never returns ATS_API, EMAIL, or BROWSER_ASSISTED — no backing capability exists yet', async () => {
    // Exhaustively probes every branch this service can reach; none of them
    // may ever produce these three channels until their respective wave
    // lands (AJA-ARCH-003 "no false capability signals").
    const scenarios = [
      null,
      { id: 'job-1', status: 'ACTIVE', applyUrl: 'https://acme.com/apply' },
      { id: 'job-1', status: 'CLOSED', applyUrl: 'https://acme.com/apply' },
      { id: 'job-1', status: 'ACTIVE', applyUrl: null },
    ];
    for (const scenario of scenarios) {
      vi.mocked(jobLookup.findJobChannelSnapshot).mockResolvedValue(scenario);
      const result = await service.detectChannel('job-1');
      expect(['EXTERNAL_MANUAL', 'UNSUPPORTED']).toContain(result.channel);
    }
  });
});
