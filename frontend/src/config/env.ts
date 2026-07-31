const requireEnv = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const fallbackApiBaseUrl = 'http://localhost:5001/api/v1';

export const env = {
  apiBaseUrl: requireEnv(import.meta.env.VITE_API_BASE_URL, fallbackApiBaseUrl),
  appName: requireEnv(import.meta.env.VITE_APP_NAME, 'CareerCopilot'),
} as const;
