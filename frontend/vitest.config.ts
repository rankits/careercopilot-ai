import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  test: {
    coverage: {
      exclude: ['dist/**', 'node_modules/**', 'src/types/**', 'src/test/**'],
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
    environment: 'jsdom',
    // Playwright specs live under e2e/ and must not be collected by Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // fileParallelism: false,
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Page tests fill large forms under parallel suite load; default 5s is too tight on Windows CI.
    testTimeout: 30_000,
  },
});
