import { createHash } from 'node:crypto';

import type { AiMailDraftRepository } from '@/modules/ai-mail/contracts/ai-mail-draft.repository.js';
import { CandidateProfileContextBuilder } from '@/modules/ai-mail/application/candidate-profile-context.builder.js';
import { JobContextBuilder } from '@/modules/ai-mail/application/job-context.builder.js';
import { JobDescriptionNormalizer } from '@/modules/ai-mail/application/job-description-normalizer.js';
import { MailGenerationContextBuilder } from '@/modules/ai-mail/application/mail-generation-context.builder.js';
import { ResumeContextLoader } from '@/modules/ai-mail/application/resume-context.builder.js';
import type { CandidateProfileContextRepository } from '@/modules/ai-mail/contracts/candidate-profile-context.repository.js';
import type {
  AiMailGenerationReadinessDto,
  AiMailProfileSummaryDto,
  AiMailReadinessIssue,
  AiMailResumeListDto,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { logger } from '@/shared/logger/logger.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userHash = (userId: string): string =>
  createHash('sha256').update(userId, 'utf8').digest('hex').slice(0, 16);

export class AiMailGenerationReadinessService {
  constructor(
    private readonly drafts: AiMailDraftRepository,
    private readonly profiles: CandidateProfileContextRepository,
    private readonly profileBuilder: CandidateProfileContextBuilder,
    private readonly resumes: ResumeContextLoader,
    private readonly jobNormalizer: JobDescriptionNormalizer,
    private readonly jobBuilder: JobContextBuilder,
    private readonly contextBuilder: MailGenerationContextBuilder,
  ) {}

  listResumes(userId: string): Promise<AiMailResumeListDto> {
    return this.resumes.listForUser(userId);
  }

  async profileSummary(userId: string): Promise<AiMailProfileSummaryDto> {
    return this.profileBuilder.summarize(await this.profiles.findForUser(userId));
  }

  async evaluate(userId: string, draftId: string): Promise<AiMailGenerationReadinessDto> {
    const started = Date.now();
    const blockers: AiMailReadinessIssue[] = [];
    const warnings: AiMailReadinessIssue[] = [];
    let errorCode: string | undefined;
    try {
      const draft = await this.drafts.findByIdForUser(draftId, userId);
      if (!draft) throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');

      const source = await this.profiles.findForUser(userId);
      const profile = this.profileBuilder.summarize(source);
      let candidate;
      try {
        candidate = source ? this.profileBuilder.build(source) : undefined;
      } catch {
        blockers.push({
          code: 'AI_MAIL_PROFILE_CONTEXT_UNAVAILABLE',
          message: 'Candidate profile context could not be prepared.',
          field: 'profile',
        });
      }
      if (!source) {
        blockers.push({
          code: 'AI_MAIL_PROFILE_NOT_FOUND',
          message: 'Create a candidate profile before generating mail.',
          field: 'profile',
        });
      } else if (profile.completenessPercent < 50) {
        warnings.push({
          code: 'AI_MAIL_PROFILE_INCOMPLETE',
          message: 'Adding more profile details can improve generation quality.',
          field: 'profile',
        });
      }
      if (source && profile.achievementCount === 0) {
        warnings.push({
          code: 'AI_MAIL_NO_ACHIEVEMENTS',
          message: 'Profile has no verified achievements.',
          field: 'profile',
        });
      }

      let resume;
      try {
        resume = await this.resumes.loadForUser(draft.resumeId, userId);
        if (resume.parseStatus === 'NEEDS_REVIEW') {
          warnings.push({
            code: 'AI_MAIL_RESUME_NEEDS_REVIEW',
            message: 'Review resume-derived claims before sending.',
            field: 'resumeId',
          });
        }
        if (!resume.summary) {
          warnings.push({
            code: 'AI_MAIL_NO_PROFESSIONAL_SUMMARY',
            message: 'Selected resume has no professional summary.',
            field: 'resumeId',
          });
        }
      } catch (error) {
        const code = error instanceof AppError ? error.code : undefined;
        const allowed = [
          'AI_MAIL_RESUME_NOT_FOUND',
          'AI_MAIL_RESUME_NOT_OWNED',
          'AI_MAIL_RESUME_PROCESSING',
          'AI_MAIL_RESUME_FAILED',
          'AI_MAIL_RESUME_NOT_PARSED',
        ] as const;
        blockers.push({
          code: allowed.includes(code as (typeof allowed)[number])
            ? (code as (typeof allowed)[number])
            : 'AI_MAIL_RESUME_NOT_FOUND',
          message: error instanceof Error ? error.message : 'Resume is unavailable.',
          field: 'resumeId',
        });
      }

      let job;
      if (!draft.jobDescription.trim()) {
        blockers.push({
          code: 'AI_MAIL_JOB_DESCRIPTION_MISSING',
          message: 'A job description is required.',
          field: 'jobDescription',
        });
      } else {
        try {
          job = this.jobBuilder.build(draft, this.jobNormalizer.normalize(draft.jobDescription));
          if (job.suspiciousInstructionsDetected) {
            warnings.push({
              code: 'AI_MAIL_SUSPICIOUS_JOB_INSTRUCTIONS',
              message: 'The job description contains instruction-like text; it will remain inert.',
              field: 'jobDescription',
            });
          }
          if (!draft.companyName?.trim() && job.inferredCompanyName) {
            warnings.push({
              code: 'AI_MAIL_COMPANY_INFERRED',
              message: 'Company name was inferred from the job description.',
              field: 'companyName',
            });
          } else if (!draft.companyName?.trim() && !job.companyName) {
            warnings.push({
              code: 'AI_MAIL_COMPANY_UNDETECTED',
              message: 'Company name could not be detected.',
              field: 'companyName',
            });
          }
          if (
            candidate &&
            resume &&
            candidate.skills.length + resume.skills.length > 0 &&
            job.technologies.length > 0
          ) {
            const known = new Set(
              [...candidate.skills, ...resume.skills].map((skill) => skill.toLocaleLowerCase()),
            );
            const overlap = job.technologies.some((tech) => known.has(tech.toLocaleLowerCase()));
            if (!overlap) {
              warnings.push({
                code: 'AI_MAIL_NO_SKILLS_OVERLAP',
                message: 'No explicit skills overlap was detected with the job description.',
              });
            }
          }
        } catch (error) {
          if (error instanceof AppError && error.code === 'AI_MAIL_JOB_DESCRIPTION_TOO_LARGE') {
            blockers.push({
              code: 'AI_MAIL_JOB_DESCRIPTION_TOO_LARGE',
              message: error.message,
              field: 'jobDescription',
            });
          } else if (error instanceof AppError) {
            blockers.push({
              code: 'AI_MAIL_JOB_DESCRIPTION_INVALID',
              message: 'Job description could not be normalized.',
              field: 'jobDescription',
            });
          } else {
            throw error;
          }
        }
      }
      if (!emailPattern.test(draft.recruiterEmail)) {
        blockers.push({
          code: 'AI_MAIL_RECRUITER_EMAIL_INVALID',
          message: 'Enter a valid recruiter email address.',
          field: 'recruiterEmail',
        });
      }
      if (!draft.recruiterName?.trim()) {
        warnings.push({
          code: 'AI_MAIL_RECRUITER_NAME_MISSING',
          message: 'Recruiter name is unavailable.',
          field: 'recruiterName',
        });
      }

      let built;
      if (candidate && resume && job) {
        try {
          built = this.contextBuilder.build({
            candidate,
            resume,
            job,
            constraints: draft.constraints,
          });
        } catch {
          blockers.push({
            code: 'AI_MAIL_CONTEXT_BUILD_FAILED',
            message: 'Generation context could not be prepared.',
          });
        }
      }

      const resumeList = await this.resumes.listForUser(userId);
      const response: AiMailGenerationReadinessDto = {
        ready: blockers.length === 0,
        blockers,
        warnings,
        resume: resumeList.items.find((item) => item.id === draft.resumeId),
        profile,
        detectedJobMetadata: {
          roleTitle: job?.roleTitle,
          companyName: job?.companyName,
          recruiterName: job?.recruiterName,
        },
        suggestedJobMetadata: {
          roleTitle: !draft.roleTitle?.trim() ? job?.inferredRoleTitle : undefined,
          companyName: !draft.companyName?.trim() ? job?.inferredCompanyName : undefined,
        },
        counts: {
          profileSkills: candidate?.skills.length ?? 0,
          resumeSkills: resume?.skills.length ?? 0,
          experienceEntries:
            (candidate?.experience.length ?? 0) || (resume?.experience.length ?? 0),
          jobRequirements: job?.requirements.length ?? 0,
          jobResponsibilities: job?.responsibilities.length ?? 0,
          jobKeywords: job?.keywords.length ?? 0,
        },
        contextHash: built?.context.contextHash,
      };
      logger.info(
        {
          userHash: userHash(userId),
          draftId,
          resumeId: draft.resumeId,
          counts: response.counts,
          contextHash: response.contextHash,
          durationMs: Date.now() - started,
        },
        'AI Mail generation readiness evaluated',
      );
      return response;
    } catch (error) {
      errorCode = error instanceof AppError ? error.code : 'AI_MAIL_READINESS_FAILED';
      logger.error(
        {
          userHash: userHash(userId),
          draftId,
          durationMs: Date.now() - started,
          errorCode,
        },
        'AI Mail generation readiness failed',
      );
      throw error;
    }
  }

  async buildGenerationContext(
    userId: string,
    draftId: string,
  ): Promise<import('@/modules/ai-mail/domain/ai-mail.types.js').MailGenerationContextBuildResult> {
    const draft = await this.drafts.findByIdForUser(draftId, userId);
    if (!draft) throw new AppError('AI Mail draft not found', 404, 'AI_MAIL_DRAFT_NOT_FOUND');

    const source = await this.profiles.findForUser(userId);
    if (!source) {
      throw new AppError('Candidate profile not found', 422, 'AI_MAIL_PROFILE_NOT_FOUND');
    }

    const candidate = this.profileBuilder.build(source);
    const resume = await this.resumes.loadForUser(draft.resumeId, userId);
    const job = this.jobBuilder.build(draft, this.jobNormalizer.normalize(draft.jobDescription));

    return this.contextBuilder.build({
      candidate,
      resume,
      job,
      constraints: draft.constraints,
    });
  }
}
