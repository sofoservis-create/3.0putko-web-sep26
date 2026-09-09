import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Unit/regression tests only. The dev/build config (vite.config.ts) needs
// workflow-provided PORT/BASE_PATH, so tests get a minimal config of their own.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    globals: false,
  },
});
