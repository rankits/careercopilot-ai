import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Directory of this config file — ESM-safe replacement for `__dirname`. */
const configDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src'),
      '@components': path.resolve(configDir, './src/components'),
      '@hooks': path.resolve(configDir, './src/hooks'),
      '@lib': path.resolve(configDir, './src/lib'),
      '@styles': path.resolve(configDir, './src/styles'),

    },
  },
  test: {
    coverage: {
      // `all` was removed from CoverageOptions; `include` alone now scopes reporting.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Boilerplate / non-testable code (standard practice to exclude):
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/assets/**',
        '**/*.svg',
        // Barrel re-export files:
        '**/index.ts',
        '**/index.tsx',
        // CSS-in-JS / styled-component files:
        '**/styles.ts',
        '**/*.styles.ts',
        '**/styles/**',
        '**/stylePrimitives.ts',
        // Library shims and types:
        'src/lib/**',
        'src/**/types/**',
        'src/interfaces/**',
        '**/*.interface.ts',
        // Existing exclusions:
        'dist/**',
        'node_modules/**',
        'src/test/**',
      ],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 45,
        functions: 45,
        branches: 35,
        statements: 45,
      },
    },
    environment: 'jsdom',
    // Provide Vite env vars for unit tests (production builds must set these explicitly).
    env: {
      VITE_API_BASE_URL: 'http://localhost:5001/api/v1',
      VITE_APP_NAME: 'CareerCopilot',
      VITE_APP_ENV: 'test',
      VITE_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    // Playwright specs must not be collected by Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // Cap fork workers so Windows does not time out spawning jsdom pools
    // under heavy parallel load ("Timeout waiting for worker to respond").
    pool: 'forks',
    maxWorkers: 2,
    fileParallelism: true,
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Page tests fill large forms under parallel suite load; default 5s is too tight on Windows CI.
    testTimeout: 30_000,
  },
});
