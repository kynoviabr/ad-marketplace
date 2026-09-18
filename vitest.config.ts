import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export const INTEGRATION_TEST_PATTERNS = [
  '**/integration.test.ts',
  '**/*.integration.test.ts',
  'tests/search/benchmark.test.ts',
  'tests/r10/live-vip-validation.test.ts',
  'tests/security/location-cross-city.test.ts',
  'tests/security/publication-eligibility.test.ts',
  'tests/security/storage-security.test.ts',
  'tests/dashboard/professional-dashboard-foundation.test.ts',
  'tests/profiles/public-profile-route.test.ts',
  'tests/analytics/after-search.test.ts',
  'tests/analytics/aggregation-idempotency.test.ts',
  'tests/analytics/boost-activated-idempotency.test.ts',
]

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', ...INTEGRATION_TEST_PATTERNS],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'server-only': resolve(__dirname, './tests/mocks/server-only.ts'),
    },
  },
})
