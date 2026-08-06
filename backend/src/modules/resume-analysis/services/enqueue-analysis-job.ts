import { prisma } from '@/shared/config/db.conf.js';
import {
  RESUME_ANALYSIS_REQUESTED_EVENT,
  type ResumeAnalysisRequestedPayload,
} from '@/modules/resume-analysis/events/resume-analysis.events.js';
import { runAnalysisJob } from '@/modules/resume-analysis/services/analysis-job.js';
import type { AnalysisInput } from '@/modules/resume-analysis/types/resume-analysis.types.js';
import { resumeAnalysisConfig } from '@/modules/resume-analysis/config/resume-analysis.config.js';
import { isTest } from '@/shared/config/env.conf.js';

export const shouldRunAnalysisInline = (): boolean => {
  if (isTest) return true;
  // Opt-in durability: set RESUME_ANALYSIS_USE_OUTBOX=true and run worker:resume-analysis.
  return !resumeAnalysisConfig.useOutbox;
};

export const enqueueAnalysisJob = async (
  analysisId: number,
  input: AnalysisInput,
): Promise<void> => {
  const payload: ResumeAnalysisRequestedPayload = {
    analysisId,
    resumeId: input.resumeId,
    userId: input.userId,
    targetRole: input.targetRole,
    experienceLevel: input.experienceLevel,
    jobDescription: input.jobDescription,
  };

  if (shouldRunAnalysisInline()) {
    setImmediate(() => {
      void runAnalysisJob(analysisId, input);
    });
    return;
  }

  await prisma.outboxEvent.create({
    data: {
      aggregateId: String(analysisId),
      eventType: RESUME_ANALYSIS_REQUESTED_EVENT,
      payload,
    },
  });
};
