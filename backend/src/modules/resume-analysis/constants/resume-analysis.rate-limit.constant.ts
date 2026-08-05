/** Guards the AI-cost endpoints (/analyze, /recheck) - authenticated + owned, so this is defense-in-depth against a single account hammering the AI provider. */
export const RESUME_ANALYSIS_RATE_LIMIT = {
  windowMinutes: 15,
  max: 60,
} as const;
