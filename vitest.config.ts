import { defineConfig } from 'vitest/config';

/**
 * Monorepo Vitest entry for IDE / `npx vitest` from the repo root.
 * Each package keeps its own config (aliases, environment, setup).
 *
 * Prefer package scripts: `npm test` (frontend) or `npm --prefix backend test`.
 */
export default defineConfig({
  test: {
    projects: ['./frontend', './backend'],
  },
});
