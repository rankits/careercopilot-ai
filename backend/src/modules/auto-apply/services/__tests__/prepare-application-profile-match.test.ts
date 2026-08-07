import { describe, expect, it, vi } from 'vitest';
import { PrepareApplicationService } from '@/modules/auto-apply/services/prepare-application.service.js';
import type { ApplicationPageAnalysisDto } from '@/modules/auto-apply/types/application-page-analysis.types.js';
import type { ProfileJobMatchResult } from '@/modules/auto-apply/types/profile-job-match.types.js';

const analysis = {
  id: 'analysis-1',
  jobId: 'job-1',
  provider: 'ASHBY',
  submissionCapability: 'EXTERNAL_MANUAL',
  requirements: [],
} as unknown as ApplicationPageAnalysisDto;

const profileMatch = {
  overallAlignment: 0.72,
  eligibility: { status: 'ELIGIBLE', blockers: [] },
  schemaVersion: 1,
} as unknown as ProfileJobMatchResult;

describe('PrepareApplicationService profile match wiring', () => {
  it('persists profile match and stamps matchScore from overallAlignment, not recommendation cache', async () => {
    const analyzer = {
      analyzeOrGetFresh: vi.fn().mockResolvedValue(analysis),
    };
    const matchPort = {
      ensureMatch: vi.fn().mockResolvedValue({
        status: 'CACHED',
        overallScore: 0.91,
        displayScore: 91,
        jobId: 'job-1',
        source: 'RECOMMENDATIONS',
      }),
    };
    const readiness = {
      evaluate: vi.fn().mockResolvedValue({
        ready: true,
        decision: 'READY',
        blockingReasons: [],
        warnings: [],
      }),
    };
    const jobApplications = {
      updateMatchScore: vi.fn().mockResolvedValue({}),
      findById: vi.fn().mockResolvedValue({ id: 'app-1', jobId: 'job-1' }),
      findByUserIdAndJobId: vi.fn(),
    };
    const profileJobMatch = {
      ensureMatch: vi.fn().mockResolvedValue(profileMatch),
    };

    const service = new PrepareApplicationService(
      analyzer as never,
      matchPort as never,
      readiness as never,
      jobApplications as never,
      profileJobMatch as never,
    );

    const result = await service.prepare({
      userId: 'user-1',
      jobId: 'job-1',
      jobApplicationId: 'app-1',
      applyMode: 'ASSISTED',
    });

    expect(profileJobMatch.ensureMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        jobApplicationId: 'app-1',
        analysis,
        recommendationScoreFallback: 0.91,
      }),
    );
    expect(jobApplications.updateMatchScore).toHaveBeenCalledWith('user-1', 'app-1', 0.72);
    expect(result.profileMatch?.overallAlignment).toBe(0.72);
    expect(result.package.overallScore).toBe(0.72);
    expect(result.package.recommendationScoreFallback).toBe(0.91);
  });
});
