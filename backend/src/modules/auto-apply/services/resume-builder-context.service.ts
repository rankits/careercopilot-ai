import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { IJobApplicationRepository } from '@/modules/auto-apply/contracts/job-application.contract.js';
import type { IApprovedResumeVersionRepository } from '@/modules/auto-apply/contracts/resume-version.contract.js';
import type { IApplicationConsentRepository } from '@/modules/auto-apply/contracts/application-consent.contract.js';
import type { IApplicationPageAnalysisRepository } from '@/modules/auto-apply/contracts/application-page-analysis.contract.js';
import {
  classifyRequirementDomain,
  humanizeRequirementCode,
} from '@/modules/auto-apply/utils/requirement-domain.util.js';
import { extractJobKeywords } from '@/modules/auto-apply/utils/resume-keyword-extract.util.js';

export type ResumeBuilderContextDto = {
  jobApplicationId: string;
  selectedResume: {
    approvedResumeVersionId: string | null;
    resumeId: string | null;
    builderVersionId: number | null;
  };
  targetRole: string;
  industry: string | null;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  employmentType: string | null;
  skills: string[];
  jobDescription: string;
  requirements: Array<{
    code: string;
    title: string;
    description: string;
    required: boolean;
    importance: string;
    sourceText: string;
    domain: string;
  }>;
  returnTo: string;
};

function inferExperienceLevel(text: string): 'entry' | 'mid' | 'senior' | 'lead' | 'executive' {
  const lower = text.toLowerCase();
  if (/\b(executive|vp|director|c-level|chief)\b/.test(lower)) return 'executive';
  if (/\b(lead|principal|staff)\b/.test(lower)) return 'lead';
  if (/\b(senior|sr\.?)\b/.test(lower)) return 'senior';
  if (/\b(junior|entry|graduate|intern)\b/.test(lower)) return 'entry';
  return 'mid';
}

function skillsFromJob(skillsJson: unknown, jobDescription: string, title: string): string[] {
  const fromJson: string[] = [];
  if (Array.isArray(skillsJson)) {
    for (const item of skillsJson) {
      if (typeof item === 'string' && item.trim()) fromJson.push(item.trim());
      else if (item && typeof item === 'object' && 'name' in item) {
        const name = String((item as { name?: unknown }).name ?? '').trim();
        if (name) fromJson.push(name);
      }
    }
  }
  if (fromJson.length > 0) return fromJson.slice(0, 24);
  return extractJobKeywords({ jobTitle: title, jobDescription }).slice(0, 16);
}

export class ResumeBuilderContextService {
  constructor(
    private readonly applications: IJobApplicationRepository,
    private readonly resumeVersions: IApprovedResumeVersionRepository,
    private readonly consents: IApplicationConsentRepository,
    private readonly analysisRepository: IApplicationPageAnalysisRepository,
  ) {}

  async getContext(userId: string, jobApplicationId: string): Promise<ResumeBuilderContextDto> {
    const consent = await this.consents.findActiveByType(userId, 'RESUME_USAGE');
    if (!consent) {
      throw new AppError(
        'Grant resume usage consent before opening Resume Builder from Assisted Apply.',
        403,
        'CONSENT_REQUIRED',
      );
    }

    const application = await this.applications.findById(userId, jobApplicationId);
    if (!application) {
      throw new AppError('Auto-apply submission not found', 404, 'APPLICATION_NOT_FOUND');
    }
    if (!application.jobId) {
      throw new AppError('This application has no linked job.', 422, 'JOB_MISSING');
    }

    let approvedResumeVersionId: string | null = application.resumeVersionId;
    let resumeId: string | null = null;
    let builderVersionId: number | null = null;

    if (application.resumeVersionId) {
      const approved = await this.resumeVersions.findById(userId, application.resumeVersionId);
      if (approved) {
        resumeId = approved.resumeId;
        builderVersionId = approved.builderResumeVersionId ?? null;
      } else {
        approvedResumeVersionId = null;
      }
    }

    const [job, pageAnalysis] = await Promise.all([
      prisma.job.findFirst({
        where: { id: application.jobId },
        select: {
          title: true,
          descriptionText: true,
          employmentType: true,
          skills: true,
          company: { select: { name: true, industry: true } },
        },
      }),
      this.analysisRepository.findLatestByJobId(application.jobId),
    ]);

    const jobDescription = (job?.descriptionText ?? '').trim();
    const targetRole = (job?.title ?? application.jobTitle ?? '').trim() || 'Target role';
    const industry = job?.company?.industry ?? null;
    const employmentType = job?.employmentType ?? null;
    const skills = skillsFromJob(job?.skills, jobDescription, targetRole);

    const requirements = (pageAnalysis?.requirements ?? []).map((req) => {
      const domain = classifyRequirementDomain({
        code: req.code,
        sourceText: req.sourceText,
        assertion: req.assertion,
      });
      return {
        code: req.code,
        title: humanizeRequirementCode(req.code),
        description: req.sourceText?.trim() || humanizeRequirementCode(req.code),
        required: req.required !== false,
        importance: String(req.importance ?? (req.required ? 'REQUIRED' : 'OPTIONAL')),
        sourceText: req.sourceText?.trim() || '',
        domain,
      };
    });

    return {
      jobApplicationId,
      selectedResume: {
        approvedResumeVersionId,
        resumeId,
        builderVersionId,
      },
      targetRole,
      industry,
      experienceLevel: inferExperienceLevel(`${targetRole}\n${jobDescription}`),
      employmentType,
      skills,
      jobDescription,
      requirements,
      returnTo: `/assisted-apply/${jobApplicationId}?step=resume`,
    };
  }
}
