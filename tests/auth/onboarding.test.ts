/**
 * Tests: Onboarding State — FASE 01
 * Covers: initial state, IN_PROGRESS transition, TypeScript types, dashboard rendering.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')

describe('Onboarding State', () => {
  describe('Initial state', () => {
    it('trigger sets onboarding_status default to NOT_STARTED', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain("DEFAULT 'NOT_STARTED'")
    })

    it('trigger sets onboarding_step default to 0', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('DEFAULT 0')
    })

    it('migration onboarding_status enum has all three values', () => {
      const migration = readFileSync(
        join(ROOT, 'supabase/migrations/20260817000001_account_users.sql'),
        'utf-8'
      )
      expect(migration).toContain('NOT_STARTED')
      expect(migration).toContain('IN_PROGRESS')
      expect(migration).toContain('COMPLETED')
    })
  })

  describe('Transition to IN_PROGRESS', () => {
    it('startOnboardingAction exists in actions.ts', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('startOnboardingAction')
      expect(content).toContain('IN_PROGRESS')
      expect(content).toContain('onboarding_step: 1')
    })

    it('startOnboardingAction uses admin client (not broad RLS update)', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/actions.ts'), 'utf-8')
      expect(content).toContain('createAdminClient()')
    })

    it('dashboard sends incomplete accounts to the canonical onboarding resolver', () => {
      const dashboard = readFileSync(
        join(ROOT, 'app/(dashboard)/dashboard/page.tsx'),
        'utf-8'
      )
      expect(dashboard).toContain("account.onboarding_status !== 'COMPLETED'")
      expect(dashboard).toContain("redirect('/onboarding')")
    })
  })

  describe('TypeScript types', () => {
    it('OnboardingStatus type has all three values', () => {
      const content = readFileSync(join(ROOT, 'modules/auth/types.ts'), 'utf-8')
      expect(content).toContain('NOT_STARTED')
      expect(content).toContain('IN_PROGRESS')
      expect(content).toContain('COMPLETED')
      expect(content).toContain('onboarding_status: OnboardingStatus')
      expect(content).toContain('onboarding_step: number')
    })
  })

  describe('Dashboard resolves onboarding state', () => {
    it('dashboard renders only after COMPLETED and delegates other states', () => {
      const dashboard = readFileSync(
        join(ROOT, 'app/(dashboard)/dashboard/page.tsx'),
        'utf-8'
      )
      expect(dashboard).toContain('onboarding_status')
      expect(dashboard).toContain('COMPLETED')
      expect(dashboard).toContain("redirect('/onboarding')")
    })

    it('shared dashboard header has logout form', () => {
      const header = readFileSync(
        join(ROOT, 'components/dashboard/professional-dashboard-header.tsx'),
        'utf-8'
      )
      expect(header).toContain('logoutAction')
      expect(header).toContain("t('common.logout')")
    })
  })
})
