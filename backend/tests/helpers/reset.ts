import { fakeDb } from "./app.js";
import { cacheService } from "../../src/infrastructure/cache/index.js";
import { publishEventMock } from "./messaging-mock.js";

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
