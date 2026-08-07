/**
 * Shared drain sequence for RabbitMQ workers (AA-008).
 * Cancel consumers → await in-flight (with timeout) → close bus → disconnect DB → exit.
 */

export type WorkerDrainLog = {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
};

export interface WorkerDrainDeps {
  cancelConsumers: () => Promise<void>;
  waitForInFlight: (timeoutMs: number) => Promise<'idle' | 'timeout'>;
  closeMessageBus: () => Promise<void>;
  disconnectDatabase: () => Promise<void>;
  drainTimeoutMs: number;
  log: WorkerDrainLog;
  exit: (code: number) => void;
}

export async function drainWorker(signal: string, deps: WorkerDrainDeps): Promise<void> {
  deps.log.info(
    { signal, drainTimeoutMs: deps.drainTimeoutMs },
    'Worker drain started — cancelling consumers',
  );

  await deps.cancelConsumers();

  const waitResult = await deps.waitForInFlight(deps.drainTimeoutMs);
  if (waitResult === 'timeout') {
    deps.log.warn(
      { signal, drainTimeoutMs: deps.drainTimeoutMs },
      'Worker drain timed out with in-flight work still running — exiting; reclaim is the backstop',
    );
  } else {
    deps.log.info({ signal }, 'Worker in-flight work drained');
  }

  await deps.closeMessageBus();
  await deps.disconnectDatabase();
  deps.log.info({ signal }, 'Worker shutdown complete');
  deps.exit(0);
}
