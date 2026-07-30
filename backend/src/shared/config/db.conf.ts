import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/shared/logger/logger.js";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Single shared PrismaClient instance for the whole process. Creating more
 * than one instance exhausts the Postgres connection pool under load, so
 * every repository across every module must import `prisma` from here
 * rather than constructing its own client.
 */
const createPrismaClient = () =>
  new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

const prisma = global.prisma || createPrismaClient();

prisma.$on("query" as never, (event: Prisma.QueryEvent) => {
  logger.debug(
    { query: event.query, params: event.params, durationMs: event.duration },
    "prisma query executed",
  );
});

prisma.$on("warn" as never, (event: Prisma.LogEvent) => {
  logger.warn({ message: event.message }, "prisma warning");
});

prisma.$on("error" as never, (event: Prisma.LogEvent) => {
  logger.error({ message: event.message }, "prisma error");
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info("PostgreSQL connected via Prisma");
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
};

export { prisma };
export default prisma;
