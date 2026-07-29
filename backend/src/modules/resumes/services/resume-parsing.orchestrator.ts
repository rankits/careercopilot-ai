import { ResumeStatus } from "@prisma/client";
import { createResumeParser } from "@/modules/resumes/parsers/parser.factory.js";
import { resumeFieldMapper } from "@/modules/resumes/mappers/resume-field.mapper.js";
import { resumeRepository } from "@/modules/resumes/repositories/resume.repository.js";
import { textExtractionService } from "@/modules/resumes/services/text-extraction.service.js";
import { extractionQualityService } from "@/modules/resumes/services/extraction-quality.service.js";
import { jobsLogger } from "@/shared/utils/logger.js";

export interface ResumeParseInput {
  resumeId: string;
  userId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export const resumeParsingOrchestrator = {
  async parseUploadedResume(input: ResumeParseInput): Promise<void> {
    await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.PROCESSING);

    try {
      const extractedText = await textExtractionService.extractText({
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });

      const quality = extractionQualityService.analyze(extractedText);

      jobsLogger.info(
        {
          resumeId: input.resumeId,
          extractedTextLength: extractedText.length,
          quality,
        },
        "Resume text extracted",
      );

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
        confidenceScore: parsed.confidenceScore ?? quality.score,
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

      jobsLogger.error(
        {
          resumeId: input.resumeId,
          userId: input.userId,
          error: message,
        },
        "Resume parsing orchestration failed",
      );
    }
  },
};

