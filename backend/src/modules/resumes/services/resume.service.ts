import crypto from "node:crypto";
import path from "node:path";
import { ResumeStorageDriver } from "@prisma/client";
import { AppError } from "@/shared/utils/errors/AppError.js";
import { allowedResumeExtensions, allowedResumeMimeTypes } from "@/modules/resumes/config/resume.config.js";
import { resumeRepository } from "@/modules/resumes/repositories/resume.repository.js";
import { createResumeStorage } from "@/modules/resumes/storage/resume-storage.factory.js";
import { ParsedResumeData } from "@/modules/resumes/types/resume.types.js";
import { resumeProcessingService } from "@/modules/resumes/services/resume-processing.service.js";

const PUBLIC_USER_ID = "public";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toParsedResumeData = (value: unknown): ParsedResumeData => {
  const data = isRecord(value) ? value : {};

  return {
    personalDetails: isRecord(data.personalDetails) ? data.personalDetails : {},
    experience: Array.isArray(data.experience) ? (data.experience as Array<Record<string, unknown>>) : [],
    education: Array.isArray(data.education) ? (data.education as Array<Record<string, unknown>>) : [],
    skills: Array.isArray(data.skills) ? data.skills.filter((skill): skill is string => typeof skill === "string") : [],
    certifications: Array.isArray(data.certifications)
      ? (data.certifications as Array<Record<string, unknown>>)
      : [],
  };
};

export const resumeService = {
  async uploadResume(input: { file?: Express.Multer.File; userId?: string }) {
    if (!input.file) {
      throw new AppError("Resume file is required", 400);
    }

    const extension = path.extname(input.file.originalname).toLowerCase();
    if (!allowedResumeExtensions.has(extension) || !allowedResumeMimeTypes.has(input.file.mimetype)) {
      throw new AppError("Only PDF, DOC, and DOCX resume files are allowed", 400);
    }

    const resumeId = crypto.randomUUID();
    const userId = input.userId?.trim() || PUBLIC_USER_ID;
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
      storageDriver: stored.driver === "S3" ? ResumeStorageDriver.S3 : ResumeStorageDriver.LOCAL,
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

  async getResumeStatus(resumeId: string) {
    const resume = await resumeRepository.findResumeById(resumeId);
    if (!resume) {
      throw new AppError("Resume not found", 404);
    }

    return {
      id: resume.id,
      status: resume.status,
      failureReason: resume.failureReason,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt,
    };
  },

  async getParsedData(resumeId: string) {
    const resume = await resumeRepository.findResumeById(resumeId);
    if (!resume) {
      throw new AppError("Resume not found", 404);
    }

    const extraction = await resumeRepository.findLatestExtraction(resumeId);
    if (!extraction) {
      throw new AppError("Resume parsed data is not available yet", 404);
    }

    return {
      resumeId,
      status: resume.status,
      parserVersion: extraction.parserVersion,
      confidenceScore: extraction.confidenceScore,
      extractedData: extraction.extractedData,
      createdAt: extraction.createdAt,
    };
  },

  async confirmProfile(input: { userId: string; resumeId: string }) {
    const extraction = await resumeRepository.findLatestExtraction(input.resumeId);
    if (!extraction) {
      throw new AppError("Resume parsed data is not available yet", 404);
    }

    return resumeRepository.upsertCandidateProfile({
      userId: input.userId,
      sourceResumeId: input.resumeId,
      ...toParsedResumeData(extraction.extractedData),
    });
  },
};
