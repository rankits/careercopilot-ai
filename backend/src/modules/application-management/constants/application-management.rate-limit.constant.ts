/** Authenticated CRUD on applications/notes/tasks - generous ceiling that only bites scripted abuse of one account. */
export const APPLICATION_MANAGEMENT_RATE_LIMIT = {
  windowMinutes: 15,
  max: 60,
} as const;
