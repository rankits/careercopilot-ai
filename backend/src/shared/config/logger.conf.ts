const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const isDevelopment = process.env.NODE_ENV !== "production";

export const loggerConfig = {
  enabled: parseBoolean(process.env.LOGGING_ENABLED, true),
  level: process.env.LOG_LEVEL || "info",
  pretty: parseBoolean(process.env.LOG_PRETTY, isDevelopment),
};
