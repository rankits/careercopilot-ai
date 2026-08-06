import crypto from 'node:crypto';
import path from 'node:path';
import { ResumeStorageDriver } from '@prisma/client';
import { authRepository } from '@/modules/auth/repositories/auth.repository.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import {
  allowedResumeExtensions,
  allowedResumeMimeTypes,
} from '@/modules/resumes/config/resume.config.js';
import type { CandidateProfile, Resume } from '@prisma/client';
import { resumeRepository } from '@/modules/resumes/repositories/resume.repository.js';
import { createResumeStorage } from '@/modules/resumes/storage/resume-storage.factory.js';
import {
  CandidateProfileResponse,
  ParsedResumeData,
  UpdateCandidateProfileInput,
} from '@/modules/resumes/types/resume.types.js';
import { resumeProcessingService } from '@/modules/resumes/services/resume-processing.service.js';
import { resumeParsingOrchestrator } from '@/modules/resumes/services/resume-parsing.orchestrator.js';
import { ResumeParseStatus } from '@/modules/resumes/domain/resume-parser-status.js';
import { invalidateUserRecommendationState } from '@/modules/recommendations/services/recommendation-lifecycle.service.js';
import { logger } from '@/shared/logger/logger.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toParsedResumeData = (value: unknown): ParsedResumeData => {
  const data = isRecord(value) ? value : {};
  const personalDetails = isRecord(data.personalDetails) ? { ...data.personalDetails } : {};
  const professionalProfile = isRecord(data.professionalProfile) ? data.professionalProfile : {};
  const experience = Array.isArray(data.experience)
    ? (data.experience as Array<Record<string, unknown>>)
    : [];
  const firstExperience = isRecord(experience[0]) ? experience[0] : {};

  // The raw extraction doesn't always carry these under `personalDetails`
  // (the AI parser writes them to `professionalProfile`/top-level instead;
  // the RULE_BASED fallback parser - the default - doesn't extract them at
  // all). Backfill from wherever the parser actually put them so a
  // first-time confirm still produces a reasonably complete profile even
  // when the caller didn't submit reviewed form values (see `confirmProfile`).
  if (typeof personalDetails.summary !== 'string') {
    const summary = professionalProfile.summary ?? data.professionalSummary;
    if (typeof summary === 'string') personalDetails.summary = summary;
  }
  if (typeof personalDetails.designation !== 'string') {
    const designation =
      firstExperience.title ?? professionalProfile.currentTitle ?? personalDetails.currentTitle;
    if (typeof designation === 'string') personalDetails.designation = designation;
  }
  if (typeof personalDetails.currentCompany !== 'string') {
    const currentCompany = firstExperience.company ?? firstExperience.companyName;
    if (typeof currentCompany === 'string') personalDetails.currentCompany = currentCompany;
  }
  if (
    personalDetails.totalExperience === undefined &&
    typeof data.totalExperienceYears === 'number'
  ) {
    personalDetails.totalExperience = data.totalExperienceYears;
  }

  return {
    personalDetails,
    experience,
    education: Array.isArray(data.education)
      ? (data.education as Array<Record<string, unknown>>)
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.filter((skill): skill is string => typeof skill === 'string')
      : [],
    certifications: Array.isArray(data.certifications)
      ? (data.certifications as Array<Record<string, unknown>>)
      : [],
  };
};

const toCandidateProfileResponse = (profile: CandidateProfile): CandidateProfileResponse => ({
  userId: profile.userId,
  personalDetails: isRecord(profile.personalDetails) ? profile.personalDetails : {},
  experience: Array.isArray(profile.experience)
    ? (profile.experience as Array<Record<string, unknown>>)
    : [],
  education: Array.isArray(profile.education)
    ? (profile.education as Array<Record<string, unknown>>)
    : [],
  skills: Array.isArray(profile.skills)
    ? profile.skills.filter((skill): skill is string => typeof skill === 'string')
    : [],
  certifications: Array.isArray(profile.certifications)
    ? (profile.certifications as Array<Record<string, unknown>>)
    : [],
  sourceResumeId: profile.sourceResumeId,
  confirmedAt: profile.confirmedAt,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

/** Throws (as a 404, indistinguishable from a non-existent id) unless `resumeId`
 * belongs to `principalId` - callers must never branch on "exists but not mine"
 * vs. "doesn't exist" to avoid leaking resume existence via IDOR probing. */
const assertOwnedResume = async (resumeId: string, principalId: string) => {
  const resume = await resumeRepository.findResumeById(resumeId);
  if (!resume || resume.userId !== principalId) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }
  return resume;
};

export const resumeService = {
  async uploadResume(input: { file?: Express.Multer.File; userId: string }) {
    if (!input.file) {
      throw new AppError('Resume file is required', 400);
    }

    const extension = path.extname(input.file.originalname).toLowerCase();
    if (
      !allowedResumeExtensions.has(extension) ||
      !allowedResumeMimeTypes.has(input.file.mimetype)
    ) {
      throw new AppError('Only PDF, DOC, and DOCX resume files are allowed', 400);
    }

    const resumeId = crypto.randomUUID();
    const userId = input.userId;
    const fileName = `${resumeId}${extension}`;
    const storageKey = `users/${userId}/resumes/${fileName}`;
    const storage = createResumeStorage();
    const stored = await storage.store({
      buffer: input.file.buffer,
      key: storageKey,
      contentType: input.file.mimetype,
    });

    const resume = await resumeRepository.createResume({
      id: resumeId,
      userId,
      fileName,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      fileUrl: stored.url,
      storageKey: stored.key,
      storageDriver: stored.driver === 'S3' ? ResumeStorageDriver.S3 : ResumeStorageDriver.LOCAL,
    });

    setImmediate(() => {
      void resumeProcessingService.processUploadedResume({
        resumeId,
        userId,
        buffer: input.file!.buffer,
        mimeType: input.file!.mimetype,
        fileName: input.file!.originalname,
      });
    });

    return resume;
  },

  async getResumeStatus(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    return {
      id: resume.id,
      status: resume.status,
      failureReason: resume.failureReason,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt,
    };
  },

  async listResumes(input: { userId: string }): Promise<Resume[]> {
    return resumeRepository.listResumes(input.userId);
  },

  async deleteResume(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    try {
      await createResumeStorage().delete(resume.storageKey);
    } catch (err) {
      // The DB row is the source of truth for "this resume is gone" from the
      // user's perspective - an orphaned storage object is a cleanup concern,
      // not a reason to fail the delete.
      logger.warn(
        { err, resumeId, storageKey: resume.storageKey },
        'Failed to delete resume file from storage',
      );
    }

    await resumeRepository.deleteResume(resumeId);
    return { id: resumeId };
  },

  async downloadResume(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);
    const storage = createResumeStorage();

    try {
      const buffer = await storage.retrieve(resume.storageKey);
      return {
        buffer,
        mimeType: resume.mimeType,
        originalName: resume.originalName,
      };
    } catch {
      throw new AppError('Resume file could not be retrieved', 404, 'RESUME_FILE_NOT_FOUND');
    }
  },

  async getParsedData(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    const parseRun = await resumeRepository.findLatestParseRun(resumeId);
    if (!parseRun) {
      throw new AppError('Resume parsed data is not available yet', 404);
    }

    return {
      resumeId,
      status: resume.status,
      parseRunId: parseRun.id,
      parserVersion: parseRun.extraction?.parserVersion ?? parseRun.model,
      confidenceScore: parseRun.confidence ?? parseRun.extraction?.confidenceScore ?? null,
      extractedData: parseRun.parsedData ?? parseRun.extraction?.extractedData ?? null,
      createdAt: parseRun.createdAt,
    };
  },

  async getParseStatus(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    const parseRun = await resumeRepository.findLatestParseRun(resumeId);
    if (!parseRun) {
      throw new AppError('Resume has not been parsed yet', 404);
    }

    const stepByStatus: Record<ResumeParseStatus, string> = {
      QUEUED: 'QUEUED',
      EXTRACTING_TEXT: 'EXTRACTING_TEXT',
      CHECKING_EXTRACTION: 'CHECKING_EXTRACTION',
      PARSING: 'PARSING',
      VALIDATING: 'VALIDATING',
      NORMALISING: 'NORMALISING',
      COMPLETED: 'COMPLETED',
      NEEDS_REVIEW: 'NEEDS_REVIEW',
      FAILED: 'FAILED',
    };

    const progressByStatus: Record<ResumeParseStatus, number> = {
      QUEUED: 5,
      EXTRACTING_TEXT: 20,
      CHECKING_EXTRACTION: 35,
      PARSING: 60,
      VALIDATING: 80,
      NORMALISING: 90,
      COMPLETED: 100,
      NEEDS_REVIEW: 100,
      FAILED: 100,
    };

    return {
      resumeId,
      parseRunId: parseRun.id,
      status: parseRun.status,
      currentStep: stepByStatus[parseRun.status],
      progress: progressByStatus[parseRun.status],
      requiresReview: parseRun.requiresReview,
      warnings: parseRun.warnings,
      startedAt: parseRun.startedAt,
      completedAt: parseRun.completedAt,
      updatedAt: parseRun.updatedAt,
      resumeStatus: resume.status,
    };
  },

  async startParse(resumeId: string, principalId: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    const extraction = await resumeRepository.findLatestExtraction(resumeId);
    if (!extraction?.extractedText) {
      throw new AppError('Resume parsed data is not available yet', 404);
    }

    await invalidateUserRecommendationState({
      userId: principalId,
      sourceType: 'RESUME',
      sourceId: resumeId,
    });

    const fileName = resume.fileName;
    const mimeType = resume.mimeType;

    setImmediate(() => {
      void resumeParsingOrchestrator.parseExistingResume({
        resumeId,
        userId: principalId,
        extractedText: extraction.extractedText ?? '',
        mimeType,
        fileName,
      });
    });

    return {
      resumeId,
      status: 'QUEUED' as const,
    };
  },

  async reparseResume(resumeId: string, principalId: string, reason?: string) {
    const resume = await assertOwnedResume(resumeId, principalId);

    const extraction = await resumeRepository.findLatestExtraction(resumeId);
    if (!extraction?.extractedText) {
      throw new AppError('Resume parsed data is not available yet', 404);
    }

    await invalidateUserRecommendationState({
      userId: principalId,
      sourceType: 'RESUME',
      sourceId: resumeId,
    });

    setImmediate(() => {
      void resumeParsingOrchestrator.parseExistingResume({
        resumeId,
        userId: principalId,
        extractedText: extraction.extractedText ?? '',
        mimeType: resume.mimeType,
        fileName: resume.fileName,
        reason,
      });
    });

    return {
      resumeId,
      status: 'QUEUED' as const,
      reason,
    };
  },

  async getCandidateProfile(userId: string) {
    const profile = await resumeRepository.findCandidateProfileByUserId(userId);
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    return {
      ...toCandidateProfileResponse(profile),
      isComplete: Boolean(profile.confirmedAt),
    };
  },

  async updateCandidateProfile(
    userId: string,
    input: UpdateCandidateProfileInput,
  ): Promise<CandidateProfileResponse> {
    const existing = await resumeRepository.findCandidateProfileByUserId(userId);
    if (!existing) {
      throw new AppError(
        'Candidate profile not found. Upload and confirm a resume to create one first.',
        404,
      );
    }

    // `personalDetails` is a single JSON column - Prisma/Postgres replace it
    // wholesale on write, so a caller updating just `phone` would otherwise
    // silently blank out summary/designation/etc. Merge onto what's already
    // stored so a partial edit only touches the keys it actually sent.
    const personalDetails = input.personalDetails
      ? {
          ...(isRecord(existing.personalDetails) ? existing.personalDetails : {}),
          ...input.personalDetails,
        }
      : undefined;

    const updated = await resumeRepository.updateCandidateProfile(userId, {
      ...input,
      personalDetails,
    });
    await invalidateUserRecommendationState(userId);
    return toCandidateProfileResponse(updated);
  },

  async confirmProfile(input: {
    userId: string;
    resumeId: string;
    personalDetails?: Record<string, unknown>;
    experience?: Array<Record<string, unknown>>;
    education?: Array<Record<string, unknown>>;
    skills?: string[];
    certifications?: Array<Record<string, unknown>>;
  }) {
    // Ownership must be re-asserted here, not just at the route layer: this
    // is what stops caller A from confirming their own profile using
    // caller B's resumeId (the path param alone only proves A owns `userId`).
    await assertOwnedResume(input.resumeId, input.userId);

    const extraction = await resumeRepository.findLatestExtraction(input.resumeId);
    if (!extraction) {
      throw new AppError('Resume parsed data is not available yet', 404);
    }

    // Prefer what the caller actually reviewed and confirmed (the FE always
    // sends this - see the frontend's resume.service.ts#confirmProfile) so
    // edits made in the review form aren't silently discarded; fall back to
    // the raw extraction for any field a direct API caller didn't send.
    const fallback = toParsedResumeData(extraction.extractedData);
    const profile = await resumeRepository.upsertCandidateProfile({
      userId: input.userId,
      sourceResumeId: input.resumeId,
      personalDetails: input.personalDetails ?? fallback.personalDetails,
      experience: input.experience ?? fallback.experience,
      education: input.education ?? fallback.education,
      skills: input.skills ?? fallback.skills,
      certifications: input.certifications ?? fallback.certifications,
    });

    await authRepository.markProfileCreated(Number(input.userId));
    await invalidateUserRecommendationState(input.userId);

    return profile;
  },
};
