import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@meeting-distiller/shared': `${root}shared/src/index.ts`,
      '@backend': `${root}backend/src`,
      '@frontend': `${root}frontend/src`,
      '@': `${root}frontend/src`,
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['backend/src/**/*.ts', 'shared/src/**/*.ts', 'frontend/src/**/*.{ts,tsx}'],
    },
  },
});
