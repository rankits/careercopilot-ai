import type { Logger } from 'pino';
import { logger as defaultLogger } from '@/shared/logger/logger.js';

/**
 * In-process Pre-Application Intelligence metrics (pino + counters).
 * Never log resumes, Answer Vault values, or raw narrative answers.
 */

let fetchAttempts = 0;
let fetchSuccesses = 0;
let fetchFailures = 0;
let analysisDurationTotalMs = 0;
let analysisCount = 0;
let extractionFailures = 0;
let requirementsTotal = 0;
let reviewRequiredTotal = 0;
let staleAnalysisHits = 0;
let readinessChangedByAnalysis = 0;
let providerCounts: Record<string, number> = {};
let aiExtractionSuccess = 0;
let aiExtractionFailure = 0;
let headlessAttempts = 0;
let headlessSuccesses = 0;
let headlessFailures = 0;

export function resetAnalysisMetricsForTests(): void {
  fetchAttempts = 0;
  fetchSuccesses = 0;
  fetchFailures = 0;
  analysisDurationTotalMs = 0;
  analysisCount = 0;
  extractionFailures = 0;
  requirementsTotal = 0;
  reviewRequiredTotal = 0;
  staleAnalysisHits = 0;
  readinessChangedByAnalysis = 0;
  providerCounts = {};
  aiExtractionSuccess = 0;
  aiExtractionFailure = 0;
  headlessAttempts = 0;
  headlessSuccesses = 0;
  headlessFailures = 0;
}

export function getAnalysisMetricsSnapshot() {
  return {
    fetchAttempts,
    fetchSuccesses,
    fetchFailures,
    fetchSuccessRate: fetchAttempts === 0 ? null : fetchSuccesses / fetchAttempts,
    analysisCount,
    analysisDurationAvgMs:
      analysisCount === 0 ? null : Math.round(analysisDurationTotalMs / analysisCount),
    extractionFailures,
    requirementsPerAnalysis:
      analysisCount === 0 ? null : Number((requirementsTotal / analysisCount).toFixed(2)),
    reviewRequiredTotal,
    staleAnalysisHits,
    readinessChangedByAnalysis,
    providerCounts: { ...providerCounts },
    aiExtractionSuccess,
    aiExtractionFailure,
    headlessAttempts,
    headlessSuccesses,
    headlessFailures,
  };
}

export function recordAnalysisFetch(event: {
  success: boolean;
  provider?: string;
  durationMs?: number;
  log?: Logger;
}): void {
  fetchAttempts += 1;
  if (event.success) fetchSuccesses += 1;
  else fetchFailures += 1;
  if (event.provider) {
    providerCounts[event.provider] = (providerCounts[event.provider] ?? 0) + 1;
  }
  (event.log ?? defaultLogger).info(
    {
      metric: 'auto_apply.analysis.fetch',
      success: event.success,
      provider: event.provider,
      durationMs: event.durationMs,
    },
    'Job page analysis fetch',
  );
}

export function recordAnalysisCompleted(event: {
  durationMs: number;
  provider: string;
  requirementCount: number;
  reviewRequiredCount: number;
  fromCache?: boolean;
  log?: Logger;
}): void {
  analysisCount += 1;
  analysisDurationTotalMs += event.durationMs;
  requirementsTotal += event.requirementCount;
  reviewRequiredTotal += event.reviewRequiredCount;
  providerCounts[event.provider] = (providerCounts[event.provider] ?? 0) + 1;
  (event.log ?? defaultLogger).info(
    {
      metric: 'auto_apply.analysis.completed',
      durationMs: event.durationMs,
      provider: event.provider,
      requirementCount: event.requirementCount,
      reviewRequiredCount: event.reviewRequiredCount,
      fromCache: event.fromCache === true,
    },
    'Job page analysis completed',
  );
}

export function recordAnalysisAiExtraction(event: {
  success: boolean;
  durationMs: number;
  requirementCount: number;
  reviewRequiredCount: number;
  failureCode?: string;
  log?: Logger;
}): void {
  if (event.success) aiExtractionSuccess += 1;
  else {
    aiExtractionFailure += 1;
    extractionFailures += 1;
  }
  (event.log ?? defaultLogger).info(
    {
      metric: 'auto_apply.analysis.ai_extraction',
      success: event.success,
      durationMs: event.durationMs,
      requirementCount: event.requirementCount,
      reviewRequiredCount: event.reviewRequiredCount,
      failureCode: event.failureCode,
    },
    'AI requirement extraction',
  );
}

export function recordStaleAnalysis(event?: { log?: Logger }): void {
  staleAnalysisHits += 1;
  (event?.log ?? defaultLogger).info(
    { metric: 'auto_apply.analysis.stale' },
    'Stale analysis detected during readiness',
  );
}

export function recordReadinessChangedByAnalysis(event?: { log?: Logger }): void {
  readinessChangedByAnalysis += 1;
  (event?.log ?? defaultLogger).info(
    { metric: 'auto_apply.analysis.readiness_influenced' },
    'Readiness decision influenced by page analysis',
  );
}

export function recordHeadlessSnapshot(event: {
  success: boolean;
  durationMs: number;
  textLength?: number;
  failureCode?: string;
  log?: Logger;
}): void {
  headlessAttempts += 1;
  if (event.success) headlessSuccesses += 1;
  else headlessFailures += 1;
  (event.log ?? defaultLogger).info(
    {
      metric: 'auto_apply.analysis.headless_snapshot',
      success: event.success,
      durationMs: event.durationMs,
      textLength: event.textLength,
      failureCode: event.failureCode,
    },
    'Headless job page snapshot',
  );
}
