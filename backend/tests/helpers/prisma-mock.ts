import { vi } from "vitest";
import type { FakeDb as FakeDbType } from "./fake-prisma.js";

/**
 * `vi.mock` factories are hoisted above this file's own top-level
 * statements, so the factory below must be fully self-contained (a
 * dynamic `import()`, not a reference to an outer `const`) - referencing
 * an already-imported binding here silently breaks this module's own
 * exports under Vitest's hoisting transform. The FakeDb instance is
 * stashed on the mocked client itself; `fakeDb` below is then obtained by
 * importing the (now-mocked) `prisma` export back out and reading it off.
 */
vi.mock("../../src/shared/config/db.conf.js", async () => {
  const { FakeDb } = await import("./fake-prisma.js");
  const instance = new FakeDb();
  const client = instance.toPrismaClient() as unknown as Record<string, unknown>;
  client.__fakeDb = instance;
  return {
    prisma: client,
    default: client,
    connectDatabase: vi.fn(async () => {}),
    disconnectDatabase: vi.fn(async () => {}),
  };
});

// Imported after the `vi.mock` call above (which Vitest hoists ahead of
// this regardless of source order) - resolves to the mocked module, so
// this is the SAME FakeDb instance the Express app will query against.
import { prisma } from "../../src/shared/config/db.conf.js";

export const fakeDb = (prisma as unknown as { __fakeDb: FakeDbType }).__fakeDb;
