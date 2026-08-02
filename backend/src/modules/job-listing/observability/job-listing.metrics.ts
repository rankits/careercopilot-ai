import { jobsLogger } from '@/shared/utils/logger.js';

export type JobListingMetricOutcome = 'success' | 'empty' | 'error';

export interface JobListingMetricEvent {
  name: 'job_listing_request';
  outcome: JobListingMetricOutcome;
  statusCode: number;
  durationMs: number;
  /** Whether any non-default filter was applied (never includes query text). */
  hasFilters: boolean;
  resultCount?: number;
}

export interface JobListingMetricsSnapshot {
  requests: number;
  emptyResults: number;
  errors5xx: number;
  /** Raw samples for tests; production consumers should use logs/APM. */
  latencyMs: number[];
}

type MetricSink = (event: JobListingMetricEvent) => void;

const defaultSink: MetricSink = (event) => {
  jobsLogger.info({ metric: event }, 'job_listing_metric');
};

let sink: MetricSink = defaultSink;

const snapshot: JobListingMetricsSnapshot = {
  requests: 0,
  emptyResults: 0,
  errors5xx: 0,
  latencyMs: [],
};

export function recordJobListingRequest(
  input: Omit<JobListingMetricEvent, 'name'>,
): JobListingMetricEvent {
  const event: JobListingMetricEvent = {
    name: 'job_listing_request',
    ...input,
    durationMs: Math.max(0, Math.round(input.durationMs)),
  };

  snapshot.requests += 1;
  snapshot.latencyMs.push(event.durationMs);
  if (event.outcome === 'empty') snapshot.emptyResults += 1;
  if (event.statusCode >= 500) snapshot.errors5xx += 1;

  sink(event);
  return event;
}

export function getJobListingMetricsSnapshot(): JobListingMetricsSnapshot {
  return {
    requests: snapshot.requests,
    emptyResults: snapshot.emptyResults,
    errors5xx: snapshot.errors5xx,
    latencyMs: [...snapshot.latencyMs],
  };
}

export function resetJobListingMetricsForTests(): void {
  snapshot.requests = 0;
  snapshot.emptyResults = 0;
  snapshot.errors5xx = 0;
  snapshot.latencyMs = [];
  sink = defaultSink;
}

export function setJobListingMetricsSinkForTests(next: MetricSink | null): void {
  sink = next ?? defaultSink;
}
