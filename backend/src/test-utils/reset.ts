import { fakeDb } from "@/test-utils/app.js";
import { cacheService } from "@/infrastructure/cache/index.js";
import { publishEventMock } from "@/test-utils/messaging-mock.js";

/**
 * Resets all test-visible state between cases: the in-memory fake
 * database, the real in-memory cache singleton (session cache + rate
 * limit counters), and the captured message-bus calls (queued emails/
 * domain events) - so one test's state can never leak into an unrelated
 * one.
 */
export const resetTestState = async (): Promise<void> => {
  fakeDb.reset();
  await cacheService.disconnect();
  publishEventMock.mockClear();
};
