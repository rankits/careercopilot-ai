const readRequiredViteEnv = (value: unknown, name: string): string => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  throw new Error(`${name} is not configured`);
};

const readOptionalViteEnv = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

export const env = {
  apiBaseUrl: readRequiredViteEnv(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL'),
  appName: readOptionalViteEnv(import.meta.env.VITE_APP_NAME, 'CareerCopilot'),
  appEnv: readOptionalViteEnv(import.meta.env.VITE_APP_ENV, 'development'),
  publicAppUrl: readOptionalViteEnv(import.meta.env.VITE_PUBLIC_APP_URL, ''),
} as const;
