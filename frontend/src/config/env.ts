const requireEnv = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

export const env = {
  apiBaseUrl: requireEnv(import.meta.env.VITE_API_BASE_URL, '/api/v1'),
  appName: requireEnv(import.meta.env.VITE_APP_NAME, 'CareerCopilot'),
} as const;
