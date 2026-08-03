import {
  CandidateProfile,
  Prisma,
  Resume,
  ResumeExtraction,
  ResumeParseRun,
  ResumeParseStatus as PrismaResumeParseStatus,
  ResumeStatus,
  ResumeStorageDriver,
} from '@prisma/client';
import { prisma } from '@/shared/config/db.conf.js';
import {
  OnboardingProfilePayload,
  ParsedResumeData,
  UpdateCandidateProfileInput,
} from '@/modules/resumes/types/resume.types.js';
import { ResumeParseStatus } from '@/modules/resumes/domain/resume-parser-status.js';

export interface CreateResumeRecordInput {
  id: string;
  userId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string;
  storageKey: string;
  storageDriver: ResumeStorageDriver;
}

export interface CreateResumeParseRunInput {
  resumeId: string;
  status: ResumeParseStatus;
  attemptNumber: number;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  sourceHash?: string;
  extractedTextHash?: string;
  parsedData?: unknown;
  confidence?: number;
  warnings?: string[];
  requiresReview?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UpdateResumeParseRunInput {
  status?: ResumeParseStatus;
  parsedData?: unknown;
  confidence?: number;
  warnings?: string[];
  requiresReview?: boolean;
  extractedTextHash?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

const sanitizeText = (value: string): string => value.replace(/\u0000/g, '');

export const resumeRepository = {
  createResume(input: CreateResumeRecordInput): Promise<Resume> {
    return prisma.resume.create({
      data: {
        id: input.id,
        userId: input.userId,
        fileName: input.fileName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        fileUrl: input.fileUrl,
        storageKey: input.storageKey,
        storageDriver: input.storageDriver,
      },
    });
  },

  findResumeById(id: string): Promise<Resume | null> {
    return prisma.resume.findUnique({ where: { id } });
  },

  listResumes(userId?: string): Promise<Resume[]> {
    return prisma.resume.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { uploadedAt: 'desc' },
      take: 25,
    });
  },

  findLatestExtraction(resumeId: string): Promise<ResumeExtraction | null> {
    return prisma.resumeExtraction.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
  },

  findLatestParseRun(
    resumeId: string,
  ): Promise<(ResumeParseRun & { extraction: ResumeExtraction | null }) | null> {
    return prisma.resumeParseRun.findFirst({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      include: {
        extraction: true,
      },
    });
  },

  createParseRun(input: CreateResumeParseRunInput): Promise<ResumeParseRun> {
    return prisma.resumeParseRun.create({
      data: {
        resumeId: input.resumeId,
        status: input.status as PrismaResumeParseStatus,
        attemptNumber: input.attemptNumber,
        provider: input.provider,
        model: input.model,
        promptVersion: input.promptVersion,
        schemaVersion: input.schemaVersion,
        sourceHash: input.sourceHash,
        extractedTextHash: input.extractedTextHash,
        parsedData: input.parsedData as Prisma.InputJsonValue | undefined,
        confidence: input.confidence,
        warnings: input.warnings as Prisma.InputJsonValue | undefined,
        requiresReview: input.requiresReview,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      },
    });
  },

  updateParseRun(id: string, input: UpdateResumeParseRunInput): Promise<ResumeParseRun> {
    return prisma.resumeParseRun.update({
      where: { id },
      data: {
        status: input.status as PrismaResumeParseStatus | undefined,
        parsedData: input.parsedData as Prisma.InputJsonValue | undefined,
        confidence: input.confidence,
        warnings: input.warnings as Prisma.InputJsonValue | undefined,
        requiresReview: input.requiresReview,
        extractedTextHash: input.extractedTextHash,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      },
    });
  },

  updateResumeStatus(id: string, status: ResumeStatus, failureReason?: string): Promise<Resume> {
    return prisma.resume.update({
      where: { id },
      data: {
        status,
        failureReason,
        processedAt:
          status === ResumeStatus.PROCESSED || status === ResumeStatus.FAILED ? new Date() : null,
      },
    });
  },

  createExtraction(input: {
    resumeId: string;
    parseRunId?: string;
    extractedText: string;
    extractedData: ParsedResumeData;
    parserVersion: string;
    confidenceScore?: number;
  }): Promise<ResumeExtraction> {
    return prisma.resumeExtraction.create({
      data: {
        resumeId: input.resumeId,
        parseRunId: input.parseRunId,
        extractedText: sanitizeText(input.extractedText),
        extractedData: input.extractedData as unknown as Prisma.InputJsonValue,
        parserVersion: input.parserVersion,
        confidenceScore: input.confidenceScore,
      },
    });
  },

  findCandidateProfileByUserId(userId: string): Promise<CandidateProfile | null> {
    return prisma.candidateProfile.findUnique({ where: { userId } });
  },

  updateCandidateProfile(
    userId: string,
    data: UpdateCandidateProfileInput,
  ): Promise<CandidateProfile> {
    return prisma.candidateProfile.update({
      where: { userId },
      data: {
        personalDetails: data.personalDetails as Prisma.InputJsonValue | undefined,
        experience: data.experience as Prisma.InputJsonValue | undefined,
        education: data.education as Prisma.InputJsonValue | undefined,
        skills: data.skills as Prisma.InputJsonValue | undefined,
        certifications: data.certifications as Prisma.InputJsonValue | undefined,
      },
    });
  },

  upsertCandidateProfile(payload: OnboardingProfilePayload): Promise<CandidateProfile> {
    return prisma.candidateProfile.upsert({
      where: { userId: payload.userId },
      create: {
        userId: payload.userId,
        personalDetails: payload.personalDetails as Prisma.InputJsonValue,
        experience: payload.experience as Prisma.InputJsonValue,
        education: payload.education as Prisma.InputJsonValue,
        skills: payload.skills as Prisma.InputJsonValue,
        certifications: payload.certifications as Prisma.InputJsonValue,
        sourceResumeId: payload.sourceResumeId,
        confirmedAt: new Date(),
      },
      update: {
        personalDetails: payload.personalDetails as Prisma.InputJsonValue,
        experience: payload.experience as Prisma.InputJsonValue,
        education: payload.education as Prisma.InputJsonValue,
        skills: payload.skills as Prisma.InputJsonValue,
        certifications: payload.certifications as Prisma.InputJsonValue,
        sourceResumeId: payload.sourceResumeId,
        confirmedAt: new Date(),
      },
    });
  },
};

export default resumeRepository;
