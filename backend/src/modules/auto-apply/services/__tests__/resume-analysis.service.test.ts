import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    jobApplicationResumeAnalysis: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    job: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/shared/config/db.conf.js';
import { ResumeAnalysisService } from '@/modules/auto-apply/services/resume-analysis.service.js';
import type { IResumeContentResolver } from '@/modules/auto-apply/services/resume-content-resolver.service.js';
import {
  RESUME_JOB_ANALYZER_SCHEMA_VERSION,
  RESUME_JOB_ANALYZER_VERSION,
  ResumeJobAnalyzer,
} from '@/modules/auto-apply/services/resume-job-analyzer.js';

describe('ResumeAnalysisService quality + cache versioning', () => {
  const userId = 'user-1';
  const appId = 'app-1';
  const jobId = 'job-1';
  const resumeVersionId = 'rv-1';

  let applications: { findById: ReturnType<typeof vi.fn> };
  let resumeVersions: { findById: ReturnType<typeof vi.fn> };
  let consents: { findActiveByType: ReturnType<typeof vi.fn> };
  let analysisRepository: { findLatestByJobId: ReturnType<typeof vi.fn> };
  let contentResolver: { resolve: ReturnType<typeof vi.fn> };
  let service: ResumeAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    applications = {
      findById: vi.fn().mockResolvedValue({
        id: appId,
        userId,
        jobId,
        jobTitle: 'Data Scientist',
        resumeVersionId,
        status: 'READY_FOR_REVIEW',
      }),
    };
    resumeVersions = {
      findById: vi.fn().mockResolvedValue({
        id: resumeVersionId,
        userId,
        resumeId: 'r1',
        label: 'LABEL_NOT_BODY',
        category: 'general',
        tags: ['tag-not-body'],
        isActive: true,
      }),
    };
    consents = {
      findActiveByType: vi.fn().mockResolvedValue({ id: 'c1', consentType: 'RESUME_USAGE' }),
    };
    analysisRepository = {
      findLatestByJobId: vi.fn().mockResolvedValue({
        id: 'a1',
        analyzedAt: '2026-08-01T00:00:00.000Z',
        outcomeStatus: 'COMPLETE',
        requirements: [
          {
            code: 'WORK_REGION',
            assertion: 'REQUIRES',
            required: true,
            sourceText: 'Must be US-based',
          },
          {
            code: 'TOTAL_EXPERIENCE_YEARS',
            assertion: 'REQUIRES',
            required: true,
            importance: 'REQUIRED',
            sourceText: 'Experience with Python and machine learning',
          },
        ],
      }),
    };
    contentResolver = {
      resolve: vi.fn().mockResolvedValue({
        approvedResumeVersionId: resumeVersionId,
        resumeId: 'r1',
        source: 'UPLOADED_EXTRACTION',
        text: 'Data scientist with Python and machine learning projects delivering models to production.',
        contentHash: 'hash-resume-body-1',
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      }),
    };
    vi.mocked(prisma.jobApplicationResumeAnalysis.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.jobApplicationResumeAnalysis.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.job.findFirst).mockResolvedValue({
      title: 'Data Scientist',
      descriptionText: 'Python and machine learning. US based.',
      company: { name: 'Acme' },
    } as never);

    service = new ResumeAnalysisService(
      applications as never,
      resumeVersions as never,
      consents as never,
      analysisRepository as never,
      contentResolver as unknown as IResumeContentResolver,
      new ResumeJobAnalyzer(),
    );
  });

  it('does not surface WORK_REGION as missing resume evidence', async () => {
    const result = await service.analyze(userId, appId, { forceRefresh: true });
    expect(result.missingEvidence.join(' ')).not.toMatch(/WORK[_\s]?REGION/i);
    expect(result.excludedRequirements?.some((e) => e.code === 'WORK_REGION')).toBe(true);
    expect(result.schemaVersion).toBe(RESUME_JOB_ANALYZER_SCHEMA_VERSION);
    expect(result.analyzerVersion).toBe(RESUME_JOB_ANALYZER_VERSION);
  });

  it('invalidates stale schemaVersion 1 cache entries', async () => {
    vi.mocked(prisma.jobApplicationResumeAnalysis.findUnique).mockResolvedValue({
      result: {
        strengths: [],
        concerns: [],
        missingEvidence: ['The resume does not clearly demonstrate “WORK REGION”'],
        unknowns: [],
        confidence: 'HIGH',
        analyzedAt: '2026-08-01T00:00:00.000Z',
        overallAlignment: 0,
        schemaVersion: 1,
        analyzerVersion: 'deterministic-evidence-v1',
      },
    } as never);

    const result = await service.analyze(userId, appId);
    expect(result.cached).toBe(false);
    expect(result.schemaVersion).toBe(2);
    expect(result.missingEvidence.join(' ')).not.toMatch(/WORK REGION/);
    expect(prisma.jobApplicationResumeAnalysis.upsert).toHaveBeenCalled();
  });

  it('forceRefresh bypasses cache', async () => {
    await service.analyze(userId, appId, { forceRefresh: true });
    expect(prisma.jobApplicationResumeAnalysis.findUnique).not.toHaveBeenCalled();
  });

  it('does not return confident zero when only eligibility requirements exist', async () => {
    analysisRepository.findLatestByJobId.mockResolvedValue({
      id: 'a1',
      analyzedAt: '2026-08-01T00:00:00.000Z',
      outcomeStatus: 'COMPLETE',
      requirements: [
        { code: 'WORK_REGION', required: true, sourceText: 'US only' },
        { code: 'SPONSORSHIP', required: true, sourceText: 'No sponsorship' },
      ],
    });
    const result = await service.analyze(userId, appId, { forceRefresh: true });
    expect(result.overallAlignment).toBeNull();
    expect(result.confidence).toBe('LOW');
    expect(result.status).toBe('LIMITED');
  });
});
