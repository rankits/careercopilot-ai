import { createHash } from "node:crypto";
import { ResumeStatus } from "@prisma/client";
import { resumeConfig } from "@/modules/resumes/config/resume.config.js";
import { createResumeParser } from "@/modules/resumes/parsers/parser.factory.js";
import { resumeFieldMapper } from "@/modules/resumes/mappers/resume-field.mapper.js";
import { resumeNormaliserService } from "@/modules/resumes/normalisation/resume-normaliser.service.js";
import { resumeRepository } from "@/modules/resumes/repositories/resume.repository.js";
import { textExtractionService } from "@/modules/resumes/services/text-extraction.service.js";
import { extractionQualityService } from "@/modules/resumes/services/extraction-quality.service.js";
import { jobsLogger } from "@/shared/utils/logger.js";
import { ResumeParseStatus } from "@/modules/resumes/domain/resume-parser-status.js";

export interface ResumeParseInput {
  resumeId: string;
  userId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface ResumeReparseInput {
  resumeId: string;
  userId: string;
  extractedText: string;
  mimeType: string;
  fileName: string;
  reason?: string;
}

const sanitizeExtractedText = (value: string): string => value.replace(/\u0000/g, "");

const runParsingPipeline = async (input: {
  resumeId: string;
  userId: string;
  extractedText: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sourceHash: string;
}): Promise<void> => {
  const extractedText = sanitizeExtractedText(input.extractedText);
  const parserVersion =
    resumeConfig.parserEngine === "AI"
      ? `${resumeConfig.ai.provider}:${resumeConfig.ai.model}`
      : "rule-based-v1";

  const parseRun = await resumeRepository.createParseRun({
    resumeId: input.resumeId,
    status: ResumeParseStatus.QUEUED,
    attemptNumber: 1,
    provider: resumeConfig.parserEngine === "AI" ? resumeConfig.ai.provider : "rule-based",
    model: parserVersion,
    promptVersion: resumeConfig.parserEngine === "AI" ? "resume-parser-v1" : "rule-based-v1",
    schemaVersion: "resume-schema-v1",
    sourceHash: input.sourceHash,
    startedAt: new Date(),
  });

  try {
    await resumeRepository.updateParseRun(parseRun.id, {
      status: ResumeParseStatus.EXTRACTING_TEXT,
    });

    const quality = extractionQualityService.analyze(extractedText);

    await resumeRepository.updateParseRun(parseRun.id, {
      status: ResumeParseStatus.CHECKING_EXTRACTION,
      extractedTextHash: createHash("sha256").update(extractedText).digest("hex"),
      confidence: quality.score,
      warnings: quality.warnings,
      requiresReview: quality.requiresReview,
    });

    jobsLogger.info(
      {
        resumeId: input.resumeId,
        extractedTextLength: extractedText.length,
        quality,
      },
      "Resume text extracted",
    );

    await resumeRepository.updateParseRun(parseRun.id, {
      status: ResumeParseStatus.PARSING,
    });

    const parser = createResumeParser();
    const parsed = await parser.parseResume({
      extractedText,
      document: {
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
      },
    });

    const normalizedData = resumeNormaliserService.normalize(parsed.data);

    await resumeRepository.updateParseRun(parseRun.id, {
      status: ResumeParseStatus.VALIDATING,
      parsedData: normalizedData,
      confidence: parsed.confidenceScore ?? quality.score,
    });

    await resumeRepository.createExtraction({
      resumeId: input.resumeId,
      parseRunId: parseRun.id,
      extractedText,
      extractedData: normalizedData,
      parserVersion: parsed.parserVersion,
      confidenceScore: parsed.confidenceScore ?? quality.score,
    });

    const onboardingPayload = resumeFieldMapper.toOnboardingProfile({
      userId: input.userId,
      resumeId: input.resumeId,
      parsedData: normalizedData,
    });

    await resumeRepository.updateParseRun(parseRun.id, {
      status: quality.requiresReview ? ResumeParseStatus.NEEDS_REVIEW : ResumeParseStatus.NORMALISING,
      completedAt: new Date(),
    });

    await resumeRepository.upsertCandidateProfile(onboardingPayload);
    await resumeRepository.updateParseRun(parseRun.id, {
      status: quality.requiresReview ? ResumeParseStatus.NEEDS_REVIEW : ResumeParseStatus.COMPLETED,
      requiresReview: quality.requiresReview,
      completedAt: new Date(),
    });
    await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.PROCESSED);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume processing failed";
    await resumeRepository
      .updateParseRun(parseRun.id, {
        status: ResumeParseStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      })
      .catch(() => undefined);
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
};

export const resumeParsingOrchestrator = {
  async parseUploadedResume(input: ResumeParseInput): Promise<void> {
    await resumeRepository.updateResumeStatus(input.resumeId, ResumeStatus.PROCESSING);

    try {
      const extractedText = await textExtractionService.extractText({
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
      });

      await runParsingPipeline({
        resumeId: input.resumeId,
        userId: input.userId,
        extractedText: sanitizeExtractedText(extractedText),
        buffer: input.buffer,
        mimeType: input.mimeType,
        fileName: input.fileName,
        sourceHash: createHash("sha256").update(input.buffer).digest("hex"),
      });
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
  async parseExistingResume(input: ResumeReparseInput): Promise<void> {
    await runParsingPipeline({
      resumeId: input.resumeId,
      userId: input.userId,
      extractedText: sanitizeExtractedText(input.extractedText),
      buffer: Buffer.from(sanitizeExtractedText(input.extractedText), "utf8"),
      mimeType: input.mimeType,
      fileName: input.fileName,
      sourceHash: createHash("sha256").update(sanitizeExtractedText(input.extractedText)).digest("hex"),
    });
  },
};
