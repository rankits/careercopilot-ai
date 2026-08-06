/** Upload/parse/reparse trigger file storage + AI extraction - the expensive part of this module. */
export const RESUME_PROCESSING_RATE_LIMIT = {
  windowMinutes: 15,
  max: 10,
} as const;
