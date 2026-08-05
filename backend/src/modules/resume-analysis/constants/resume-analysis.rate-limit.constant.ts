/** Router-wide guardrail: these routes run AI analysis/ATS scoring and currently have no auth middleware in front of them. */
export const RESUME_ANALYSIS_RATE_LIMIT = {
  windowMinutes: 15,
  max: 60,
} as const;
