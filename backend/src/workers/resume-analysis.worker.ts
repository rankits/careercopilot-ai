import {
  messageBus,
  MessageExchanges,
  MessageQueues,
  MessageRoutingKeys,
} from '@/infrastructure/messaging/index.js';
import type { ResumeAnalysisRequestedPayload } from '@/modules/resume-analysis/events/resume-analysis.events.js';
import { runAnalysisJob } from '@/modules/resume-analysis/services/resume-analysis.service.js';
import { logger } from '@/shared/logger/logger.js';

const parseResumeAnalysisRequestedPayload = (payload: unknown): ResumeAnalysisRequestedPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid resume analysis event payload');
  }
  const data = payload as Record<string, unknown>;
  const analysisId = Number(data.analysisId);
  const resumeId = String(data.resumeId ?? '');
  const userId = String(data.userId ?? '');
  const targetRole = String(data.targetRole ?? '');
  const experienceLevel = String(data.experienceLevel ?? '');
  if (!Number.isFinite(analysisId) || !resumeId || !userId || !targetRole || !experienceLevel) {
    throw new Error('Resume analysis event payload missing required fields');
  }
  return {
    analysisId,
    resumeId,
    userId,
    targetRole,
    experienceLevel,
    jobDescription: typeof data.jobDescription === 'string' ? data.jobDescription : undefined,
  };
};

export const startResumeAnalysisWorker = async (): Promise<void> => {
  await messageBus.subscribe(
    MessageQueues.RESUME_ANALYSIS_REQUESTS,
    MessageExchanges.DOMAIN_EVENTS,
    MessageRoutingKeys.RESUME_ANALYSIS_REQUESTED,
    async (message) => {
      const event = parseResumeAnalysisRequestedPayload(message.payload);
      logger.info(
        {
          eventId: message.id,
          analysisId: event.analysisId,
          resumeId: event.resumeId,
        },
        'Resume analysis event received',
      );
      await runAnalysisJob(event.analysisId, {
        resumeId: event.resumeId,
        userId: event.userId,
        targetRole: event.targetRole,
        experienceLevel: event.experienceLevel,
        jobDescription: event.jobDescription,
      });
    },
    {
      dlq: true,
      maxRetries: 3,
      retryDelayMs: 15_000,
      prefetch: 2,
      quorum: false,
    },
  );
  logger.info('Resume analysis worker started');
};
