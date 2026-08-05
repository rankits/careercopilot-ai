/** Light safety net for authenticated profile reads/writes and the admin directory listing. */
export const USER_RATE_LIMIT = {
  windowMinutes: 15,
  max: 120,
} as const;
