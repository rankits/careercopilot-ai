import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ResumeAnalysisService } from '@/modules/auto-apply/services/resume-analysis.service.js';
import { READINESS_REASON_CODES } from '@/modules/auto-apply/constants/readiness-reason-codes.js';

describe('ResumeAnalysisService (AA-061)', () => {
  const userId = 'user-1';
  const appId = 'app-1';
  const jobId = 'job-1';
  const resumeVersionId = 'rv-1';

  let applications: {
    findById: ReturnType<typeof vi.fn>;
  };
  let resumeVersions: {
    findById: ReturnType<typeof vi.fn>;
  };
  let consents: {
    findActiveByType: ReturnType<typeof vi.fn>;
  };
  let analysisRepository: {
    findLatestByJobId: ReturnType<typeof vi.fn>;
  };
  let service: ResumeAnalysisService;

  beforeEach(() => {
    applications = {
      findById: vi.fn().mockResolvedValue({
        id: appId,
        userId,
        jobId,
        resumeVersionId,
        status: 'READY_FOR_REVIEW',
      }),
    };
    resumeVersions = {
      findById: vi.fn().mockResolvedValue({
        id: resumeVersionId,
        userId,
        resumeId: 'r1',
        label: 'Backend Engineer Kubernetes Docker',
        category: 'general',
        tags: ['kubernetes', 'docker', 'typescript'],
        isActive: true,
      }),
    };
    consents = {
      findActiveByType: vi.fn().mockResolvedValue({ id: 'c1', consentType: 'RESUME_USAGE' }),
    };
    analysisRepository = {
      findLatestByJobId: vi.fn().mockResolvedValue({
        id: 'a1',
        requirements: [
          {
            code: 'KUBERNETES',
            assertion: 'REQUIRED',
            required: true,
            sourceText: 'Experience with Kubernetes required',
          },
          {
            code: 'PUBLIC_SPEAKING',
            assertion: 'REQUIRED',
            required: true,
            sourceText: 'Public speaking experience preferred',
          },
        ],
      }),
    };
    service = new ResumeAnalysisService(
      applications as never,
      resumeVersions as never,
      consents as never,
      analysisRepository as never,
    );
  });

  it('requires RESUME_USAGE consent', async () => {
    consents.findActiveByType.mockResolvedValue(null);
    await expect(service.analyze(userId, appId)).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
      statusCode: 403,
    });
  });

  it('returns 404 for missing application', async () => {
    applications.findById.mockResolvedValue(null);
    await expect(service.analyze(userId, appId)).rejects.toMatchObject({
      code: 'APPLICATION_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('produces strengths/concerns without blocking structure', async () => {
    // Bypass prisma cache by forcing the compare path via mocked prisma failure →
    // instead spy compare indirectly: when prisma throws, we get degraded.
    // Call compare via a successful path with forceRefresh and mocked upsert.
    const { prisma } = await import('@/shared/config/db.conf.js');
    vi.spyOn(prisma.jobApplicationResumeAnalysis, 'findUnique').mockResolvedValue(null as never);
    vi.spyOn(prisma.jobApplicationResumeAnalysis, 'upsert').mockResolvedValue({} as never);

    const result = await service.analyze(userId, appId, { forceRefresh: true });
    expect(result.degraded).toBeFalsy();
    expect(result.confidence).toBeTruthy();
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.concerns)).toBe(true);
    expect(result.strengths.length + result.concerns.length).toBeGreaterThan(0);
    void READINESS_REASON_CODES;
  });

  it('degrades gracefully when analysis pipeline throws unexpectedly', async () => {
    analysisRepository.findLatestByJobId.mockRejectedValue(new Error('provider down'));
    const result = await service.analyze(userId, appId);
    expect(result.degraded).toBe(true);
    expect(result.confidence).toBe('LOW');
    expect(result.strengths).toEqual([]);
  });
});
