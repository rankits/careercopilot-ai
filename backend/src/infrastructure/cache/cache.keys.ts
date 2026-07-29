export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  SEVEN_DAYS: 604800,
} as const;

export const CacheKeys = {
  AUTH: {
    USER_SESSION: (userId: string) => `careercopilot:auth:session:${userId}`,
    USER_PERMISSIONS: (userId: string) => `careercopilot:auth:permissions:${userId}`,
    FAILED_ATTEMPTS: (email: string) => `careercopilot:auth:failed_attempts:${email}`,
    PREFIX: "careercopilot:auth:*",
  },
  USER: {
    PROFILE: (userId: string) => `careercopilot:user:profile:${userId}`,
    PREFIX: "careercopilot:user:*",
  },
} as const;
