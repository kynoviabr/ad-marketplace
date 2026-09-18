import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { INTEGRATION_TEST_PATTERNS } from './vitest.config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: INTEGRATION_TEST_PATTERNS,
    exclude: ['node_modules', '.next'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'server-only': resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
})
