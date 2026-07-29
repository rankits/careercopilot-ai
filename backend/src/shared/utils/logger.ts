import pino from "pino";
import { loggerConfig } from "@/shared/config/logger.conf.js";

export const appLogger = pino({
  name: "career-copilot",
  level: loggerConfig.level,
  enabled: loggerConfig.enabled,
  transport: loggerConfig.pretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: false,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const jobsLogger = appLogger.child({
  scope: "jobs",
});
