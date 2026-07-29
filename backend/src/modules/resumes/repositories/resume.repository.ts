import { CandidateProfile, Prisma, Resume, ResumeExtraction, ResumeStatus, ResumeStorageDriver } from "@prisma/client";
import { prisma } from "@/shared/config/db.conf.js";
import { OnboardingProfilePayload, ParsedResumeData } from "@/modules/resumes/types/resume.types.js";

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

  findLatestExtraction(resumeId: string): Promise<ResumeExtraction | null> {
    return prisma.resumeExtraction.findFirst({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
    });
  },

  updateResumeStatus(id: string, status: ResumeStatus, failureReason?: string): Promise<Resume> {
    return prisma.resume.update({
      where: { id },
      data: {
        status,
        failureReason,
        processedAt: status === ResumeStatus.PROCESSED || status === ResumeStatus.FAILED ? new Date() : null,
      },
    });
  },

  createExtraction(input: {
    resumeId: string;
    extractedText: string;
    extractedData: ParsedResumeData;
    parserVersion: string;
    confidenceScore?: number;
  }): Promise<ResumeExtraction> {
    return prisma.resumeExtraction.create({
      data: {
        resumeId: input.resumeId,
        extractedText: input.extractedText,
        extractedData: input.extractedData as unknown as Prisma.InputJsonValue,
        parserVersion: input.parserVersion,
        confidenceScore: input.confidenceScore,
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
