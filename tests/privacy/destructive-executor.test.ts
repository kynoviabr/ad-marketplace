import { describe, it, expect } from 'vitest'
import {
  assertSyntheticLifecycleSubject,
  verifyEnvironmentKillSwitch,
  calculatePlanFingerprint,
  SyntheticGateViolationError,
  KillSwitchViolationError,
  EnvironmentViolationError,
  EXPECTED_DEV_PROJECT_REF,
} from '@/modules/privacy/lifecycle-gates'
import type { LifecyclePlan } from '@/modules/privacy/lifecycle-types'
import { LIFECYCLE_EXECUTION_PHASES } from '@/modules/privacy/lifecycle-execution-types'

describe('LGPD-02B — Synthetic Destructive Lifecycle Executor', () => {
  describe('1. Synthetic-Only Hard Gate (assertSyntheticLifecycleSubject)', () => {
    const validSyntheticSubject = {
      email: 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid',
      role: 'ADVERTISER',
      stageName: '[SYNTHETIC-LGPD] Bella Test Model',
      metadata: {
        synthetic: true,
        fixture: 'LGPD-02A.1',
      },
      authUserId: 'c7ffa62a-3463-44a6-891a-8d5e412a727f',
      accountAuthUserId: 'c7ffa62a-3463-44a6-891a-8d5e412a727f',
      accountUserId: 'f8c28445-3d21-4028-bb73-d14885b40ce2',
      profileAccountUserId: 'f8c28445-3d21-4028-bb73-d14885b40ce2',
    }

    it('passes for a fully valid synthetic advertiser fixture', () => {
      expect(() =>
        assertSyntheticLifecycleSubject(validSyntheticSubject)
      ).not.toThrow()
    })

    it('rejects a real subject email domain', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          email: 'realuser@gmail.com',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects a real subject without synthetic prefix', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          email: 'advertiser@ad-marketplace-synthetic.invalid',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects ADMIN role unconditionally', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          role: 'ADMIN',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects CLIENT role without synthetic advertiser setup', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          role: 'CLIENT',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects missing or false synthetic metadata', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          metadata: { synthetic: false, fixture: 'LGPD-02A.1' },
        })
      ).toThrow(SyntheticGateViolationError)

      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          metadata: {},
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects missing or non-LGPD fixture tag', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          metadata: { synthetic: true, fixture: 'OTHER-FIXTURE' },
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects profile without [SYNTHETIC-LGPD] stage prefix', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          stageName: 'Bella Real Model',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects mismatched authUserId and accountAuthUserId', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          authUserId: 'c7ffa62a-3463-44a6-891a-8d5e412a727f',
          accountAuthUserId: '11111111-2222-3333-4444-555555555555',
        })
      ).toThrow(SyntheticGateViolationError)
    })

    it('rejects mismatched accountUserId and profileAccountUserId', () => {
      expect(() =>
        assertSyntheticLifecycleSubject({
          ...validSyntheticSubject,
          accountUserId: 'f8c28445-3d21-4028-bb73-d14885b40ce2',
          profileAccountUserId: '99999999-8888-7777-6666-555555555555',
        })
      ).toThrow(SyntheticGateViolationError)
    })
  })

  describe('2. Kill Switch & DEV Environment Enforcement (verifyEnvironmentKillSwitch)', () => {
    it('rejects when LGPD_DESTRUCTIVE_EXECUTION_ENABLED is not set', () => {
      expect(() =>
        verifyEnvironmentKillSwitch({
          overrideEnabled: false,
          overrideSyntheticOnly: true,
          supabaseUrl: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`,
        })
      ).toThrow(KillSwitchViolationError)
    })

    it('rejects when LGPD_SYNTHETIC_EXECUTION_ONLY is not set', () => {
      expect(() =>
        verifyEnvironmentKillSwitch({
          overrideEnabled: true,
          overrideSyntheticOnly: false,
          supabaseUrl: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`,
        })
      ).toThrow(KillSwitchViolationError)
    })

    it('rejects when Supabase URL does not match DEV project ref', () => {
      expect(() =>
        verifyEnvironmentKillSwitch({
          overrideEnabled: true,
          overrideSyntheticOnly: true,
          supabaseUrl: 'https://production-project-ref.supabase.co',
        })
      ).toThrow(EnvironmentViolationError)
    })

    it('passes when both kill switches are true and DEV project ref matches', () => {
      expect(() =>
        verifyEnvironmentKillSwitch({
          overrideEnabled: true,
          overrideSyntheticOnly: true,
          supabaseUrl: `https://${EXPECTED_DEV_PROJECT_REF}.supabase.co`,
        })
      ).not.toThrow()
    })
  })

  describe('3. Deterministic Plan Fingerprint & Staleness Detection', () => {
    const mockPlan: LifecyclePlan = {
      subjectAccountId: 'f8c28445-3d21-4028-bb73-d14885b40ce2',
      subjectRole: 'ADVERTISER',
      subjectEmail: 'synthetic-lgpd-advertiser-01@ad-marketplace-synthetic.invalid',
      profileId: '2602cf9c-d2a6-419a-8367-43bc2289c12d',
      stageName: '[SYNTHETIC-LGPD] Bella Test Model',
      generatedAt: '2026-09-12T00:00:00Z',
      mode: 'DRY_RUN',
      executionAllowed: false,
      summary: {
        DELETE: 12,
        ANONYMIZE: 2,
        DETACH: 0,
        RETAIN: 0,
        EXTERNAL_ERASURE: 1,
        REVIEW_REQUIRED: 8,
        byAction: {
          DELETE: { itemCount: 12, recordCount: 34 },
          ANONYMIZE: { itemCount: 2, recordCount: 2 },
          DETACH: { itemCount: 0, recordCount: 0 },
          RETAIN: { itemCount: 0, recordCount: 0 },
          EXTERNAL_ERASURE: { itemCount: 1, recordCount: 1 },
          REVIEW_REQUIRED: { itemCount: 8, recordCount: 13 },
        },
        totalItems: 23,
        totalRecords: 50,
      },
      items: [
        {
          id: 'plan-account-1',
          system: 'SUPABASE_POSTGRES',
          target: 'public.account_users',
          recordCount: 1,
          identifiers: ['f8c28445-3d21-4028-bb73-d14885b40ce2'],
          action: 'DELETE',
          rationale: 'Core account identity record',
          legalBasisStatus: 'SOURCE_CONFIRMED',
          retentionStatus: 'UNDEFINED',
        },
      ],
      storageDiscovered: {
        photoCount: 1,
        videoCount: 2,
        photoPaths: ['2602cf9c-d2a6-419a-8367-43bc2289c12d/synthetic-photo-01.jpg'],
        videoPaths: [
          'profiles/2602cf9c-d2a6-419a-8367-43bc2289c12d/video-poster.jpg',
          'profiles/2602cf9c-d2a6-419a-8367-43bc2289c12d/video.mp4',
        ],
      },
      warnings: [],
      auditStatement: 'LGPD-02A.2 Plan',
    }

    it('generates a deterministic 64-character SHA-256 fingerprint', () => {
      const fp1 = calculatePlanFingerprint(mockPlan)
      const fp2 = calculatePlanFingerprint(mockPlan)
      expect(fp1).toHaveLength(64)
      expect(fp1).toBe(fp2)
    })

    it('detects changes in plan items and alters fingerprint', () => {
      const fp1 = calculatePlanFingerprint(mockPlan)
      const alteredPlan: LifecyclePlan = {
        ...mockPlan,
        items: [
          ...mockPlan.items,
          {
            id: 'plan-new-item',
            system: 'SUPABASE_POSTGRES',
            target: 'public.unexpected_table',
            recordCount: 1,
            identifiers: ['new-id'],
            action: 'DELETE',
            rationale: 'New unexpected row',
            legalBasisStatus: 'UNKNOWN',
            retentionStatus: 'UNDEFINED',
          },
        ],
      }
      const fp2 = calculatePlanFingerprint(alteredPlan)
      expect(fp1).not.toBe(fp2)
    })

    it('detects changes in storage paths and alters fingerprint', () => {
      const fp1 = calculatePlanFingerprint(mockPlan)
      const alteredStorage: LifecyclePlan = {
        ...mockPlan,
        storageDiscovered: {
          ...mockPlan.storageDiscovered,
          photoPaths: [
            ...mockPlan.storageDiscovered.photoPaths,
            '2602cf9c-d2a6-419a-8367-43bc2289c12d/additional-photo.jpg',
          ],
        },
      }
      const fp2 = calculatePlanFingerprint(alteredStorage)
      expect(fp1).not.toBe(fp2)
    })
  })

  describe('4. Phased Execution Architecture & Safety Invariants', () => {
    it('enforces canonical lifecycle phases including AUTH_DELETION_STARTED and AUTH_DELETION_COMPLETED', () => {
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('PLANNED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('VALIDATED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('ACCESS_BLOCKED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('ANONYMIZATION_STARTED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('ANONYMIZATION_COMPLETED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('STORAGE_DELETION_STARTED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('STORAGE_DELETION_COMPLETED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('DATABASE_DELETION_STARTED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('DATABASE_DELETION_COMPLETED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('EXTERNAL_ERASURE_SIMULATED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('AUTH_DELETION_STARTED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('AUTH_DELETION_COMPLETED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('COMPLETED')
      expect(LIFECYCLE_EXECUTION_PHASES).toContain('FAILED')
    })

    it('guarantees Auth deletion phase occurs AFTER storage and database deletion', () => {
      const storageIdx = LIFECYCLE_EXECUTION_PHASES.indexOf('STORAGE_DELETION_COMPLETED')
      const dbIdx = LIFECYCLE_EXECUTION_PHASES.indexOf('DATABASE_DELETION_COMPLETED')
      const authStartIdx = LIFECYCLE_EXECUTION_PHASES.indexOf('AUTH_DELETION_STARTED')
      const authCompIdx = LIFECYCLE_EXECUTION_PHASES.indexOf('AUTH_DELETION_COMPLETED')

      expect(authStartIdx).toBeGreaterThan(storageIdx)
      expect(authStartIdx).toBeGreaterThan(dbIdx)
      expect(authCompIdx).toBeGreaterThan(authStartIdx)
    })
  })
})
