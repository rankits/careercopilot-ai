/** Guards the LLM-backed chat endpoint - each request costs real model tokens. */
export const COPILOT_RATE_LIMIT = {
  windowMinutes: 15,
  max: 20,
} as const;
