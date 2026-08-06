/** Admin-only ingestion trigger - fans out to every external job provider, so keep this tight. */
export const JOBS_INGESTION_RATE_LIMIT = {
  windowMinutes: 15,
  max: 3,
} as const;
