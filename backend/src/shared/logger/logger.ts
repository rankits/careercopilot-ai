import pino from "pino";
import { env, isProduction } from "@/shared/config/env.conf.js";

/**
 * Application-wide structured logger. Secrets/credentials are redacted so
 * they never end up in log output or an aggregator.
 */
export const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.code",
      "req.body.refreshToken",
      "res.headers[\"set-cookie\"]",
      "*.passwordHash",
      "*.passwordSalt",
      "*.password",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const createChildLogger = (bindings: Record<string, unknown>): pino.Logger =>
  logger.child(bindings);
