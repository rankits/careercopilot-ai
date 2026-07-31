import type { Server } from 'node:http';
import app from '@/app.js';
import { env } from '@/shared/config/env.conf.js';
import { logger } from '@/shared/logger/logger.js';
import { connectDatabase, disconnectDatabase } from '@/shared/config/db.conf.js';
import { startEmailWorker } from '@/workers/email.worker.js';

const PORT = env.PORT;
const BASE_URL = env.BASE_URL || `http://localhost:${PORT}`;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000;

let httpServer: Server | undefined;
let shuttingDown = false;

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  // Optionally run database seeds automatically on startup. This is
  // intended for local development/demo environments only and is
  // controlled via the RUN_SEEDS_ON_STARTUP env var.
  if (env.RUN_SEEDS_ON_STARTUP) {
    try {
      // Importing the seed entrypoint executes the orchestrator and
      // returns once it's complete. Allow any errors to surface so
      // startup fails loudly if seeding cannot complete.
      await import('./seed.js');
      logger.info('Database seeding complete (startup hook)');
    } catch (err) {
      logger.error({ err }, 'Database seeding failed during startup');
      throw err;
    }
  }

  if (env.ENABLE_EMAIL_WORKER) {
    try {
      await startEmailWorker();
    } catch (err) {
      // RabbitMQ being unavailable in local dev shouldn't block the API
      // from serving requests that don't need the message bus.
      logger.warn({ err }, 'Email worker failed to start - continuing without it');
    }
  }

  httpServer = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`${env.APP_NAME} listening on port ${PORT} [${env.NODE_ENV}]`);
    logger.info(`Server is running on ${BASE_URL}`);
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down gracefully...');

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDatabase();
    clearTimeout(forceExitTimer);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
