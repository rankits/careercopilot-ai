import {
  CandidateProfileContextBuilder,
  type CandidateProfileLimits,
} from '@/modules/ai-mail/application/candidate-profile-context.builder.js';
import type {
  ResumeContextRepository,
  SafeResumeRecord,
} from '@/modules/ai-mail/contracts/resume-context.repository.js';
import type {
  AiMailResumeAvailability,
  AiMailResumeListDto,
  AiMailResumeListItem,
  ResumeContext,
} from '@/modules/ai-mail/domain/ai-mail.types.js';
import { asObject, firstText, textArray } from '@/modules/ai-mail/domain/context-normalization.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

const hasStructuredData = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.length > 0
    : value !== null && typeof value === 'object' && Object.keys(value).length > 0;

export const resumeAvailability = (record: SafeResumeRecord): AiMailResumeAvailability => {
  if (record.status === 'FAILED') return 'failed';
  if (record.status !== 'PROCESSED') return 'processing';
  const parse = record.latestParse;
  if (!parse) return 'not_parsed';
  if (parse.status === 'FAILED') return 'failed';
  if (!['COMPLETED', 'NEEDS_REVIEW'].includes(parse.status)) return 'processing';
  if (!hasStructuredData(parse.parsedData) && !hasStructuredData(parse.extractedData))
    return 'not_parsed';
  return parse.status === 'NEEDS_REVIEW' ? 'needs_review' : 'eligible';
};

const errorFor = (availability: AiMailResumeAvailability): AppError => {
  switch (availability) {
    case 'processing':
      return new AppError('Resume is still processing', 409, 'AI_MAIL_RESUME_PROCESSING');
    case 'failed':
      return new AppError('Resume processing failed', 409, 'AI_MAIL_RESUME_FAILED');
    case 'not_parsed':
      return new AppError('Resume has no structured parse', 409, 'AI_MAIL_RESUME_NOT_PARSED');
    default:
      return new AppError('Resume is unavailable', 404, 'AI_MAIL_RESUME_NOT_FOUND');
  }
};

export class ResumeContextBuilder {
  private readonly profileBuilder: CandidateProfileContextBuilder;

  constructor(limits: CandidateProfileLimits) {
    this.profileBuilder = new CandidateProfileContextBuilder(limits);
  }

  build(record: SafeResumeRecord): ResumeContext {
    const availability = resumeAvailability(record);
    if (!['eligible', 'needs_review'].includes(availability)) throw errorFor(availability);
    const parse = record.latestParse!;
    const root = asObject(
      hasStructuredData(parse.parsedData) ? parse.parsedData : parse.extractedData,
    );
    const personal = asObject(root.personalDetails ?? root.contact ?? root.basics);
    const professional = asObject(root.professionalProfile ?? root.profile);
    const context = this.profileBuilder.build({
      personalDetails: {
        ...personal,
        currentRole:
          personal.currentRole ??
          professional.currentRole ??
          professional.headline ??
          root.currentRole,
        projects: root.projects,
      },
      experience: root.experience ?? root.workExperience ?? root.employment,
      education: root.education ?? root.academicHistory,
      skills: root.skills ?? root.technicalSkills ?? root.coreCompetencies,
      certifications: root.certifications ?? root.certificates,
      links: root.links,
    });
    return {
      resumeId: record.id,
      fileName: record.fileName,
      summary:
        firstText(professional, ['summary', 'profile', 'objective'], 2000) ??
        firstText(root, ['summary', 'professionalSummary', 'objective'], 2000),
      skills: context.skills,
      experience: context.experience,
      verifiedAchievements: textArray(root.achievements ?? root.accomplishments ?? root.awards, 20),
      projects: context.projects,
      education: context.education,
      certifications: context.certifications,
      parseStatus: parse.status as 'COMPLETED' | 'NEEDS_REVIEW',
    };
  }
}

export class ResumeContextLoader {
  constructor(
    private readonly repository: ResumeContextRepository,
    private readonly builder: ResumeContextBuilder,
  ) {}

  async loadForUser(resumeId: string, userId: string): Promise<ResumeContext> {
    const record = await this.repository.findForUser(resumeId, userId);
    if (!record) throw new AppError('Resume not found', 404, 'AI_MAIL_RESUME_NOT_FOUND');
    return this.builder.build(record);
  }

  async listForUser(userId: string): Promise<AiMailResumeListDto> {
    const [records, hints] = await Promise.all([
      this.repository.listForUser(userId),
      this.repository.selectionHints(userId),
    ]);
    const eligibleIds = new Set(
      records
        .filter((record) => ['eligible', 'needs_review'].includes(resumeAvailability(record)))
        .map((record) => record.id),
    );
    const primaryResumeId =
      (hints.sourceResumeId && eligibleIds.has(hints.sourceResumeId)
        ? hints.sourceResumeId
        : undefined) ??
      (hints.activeApprovedResumeId && eligibleIds.has(hints.activeApprovedResumeId)
        ? hints.activeApprovedResumeId
        : undefined) ??
      records.find((record) => eligibleIds.has(record.id))?.id;
    const ineligibleReason = (availability: AiMailResumeAvailability): string | undefined => {
      switch (availability) {
        case 'processing':
          return 'Resume is still processing.';
        case 'failed':
          return 'Resume processing failed.';
        case 'not_parsed':
          return 'Resume has no structured parse yet.';
        case 'needs_review':
          return undefined;
        default:
          return undefined;
      }
    };
    const items: AiMailResumeListItem[] = records.map((record) => {
      const availability = resumeAvailability(record);
      const eligibleForAiMail = availability === 'eligible' || availability === 'needs_review';
      return {
        id: record.id,
        fileName: record.fileName,
        label: record.originalName || record.fileName,
        uploadedAt: record.uploadedAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        processedAt: record.processedAt?.toISOString(),
        processingStatus: record.status,
        parseStatus: record.latestParse?.status,
        availability,
        eligibleForAiMail,
        ineligibleReason: eligibleForAiMail ? undefined : ineligibleReason(availability),
        isPrimary: record.id === primaryResumeId,
        warning:
          availability === 'needs_review'
            ? 'Resume parse needs review; verify generated claims.'
            : undefined,
      };
    });
    return { items, primaryResumeId };
  }
}
