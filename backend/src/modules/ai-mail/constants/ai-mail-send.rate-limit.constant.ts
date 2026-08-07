/** Stricter limiter for real Gmail sends (cost + abuse). */
export const AI_MAIL_SEND_RATE_LIMIT = {
  windowMinutes: 60,
  max: 10,
} as const;
