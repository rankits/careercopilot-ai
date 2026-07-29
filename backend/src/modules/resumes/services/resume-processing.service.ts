import { ResumeStatus } from "@prisma/client";
import { resumeFieldMapper } from "@/modules/resumes/mappers/resume-field.mapper.js";
import { createResumeParser } from "@/modules/resumes/parsers/parser.factory.js";
import { resumeRepository } from "@/modules/resumes/repositories/resume.repository.js";
import { textExtractionService } from "@/modules/resumes/services/text-extraction.service.js";

export const resumeProcessingService = {
  async processUploadedResume(input: {
    resumeId: string;
    userId: string;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<void> {
    try {
      await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.PROCESSING);

      const extractedText = await textExtractionService.extractText({
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });
      const parser = createResumeParser();
      const parsed = await parser.parseResume({
        document: {
          buffer: input.buffer,
          mimeType: input.mimeType,
          fileName: input.fileName,
        },
        extractedText,
      });

      await resumeRepository.createExtraction({
        resumeId: input.resumeId,
        extractedText,
        extractedData: parsed.data,
        parserVersion: parsed.parserVersion,
        confidenceScore: parsed.confidenceScore,
      });

      const onboardingPayload = resumeFieldMapper.toOnboardingProfile({
        userId: input.userId,
        resumeId: input.resumeId,
        parsedData: parsed.data,
      });

      await resumeRepository.upsertCandidateProfile(onboardingPayload);
      await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.PROCESSED);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume processing failed";
      await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.FAILED, message);
    }
  },
};
