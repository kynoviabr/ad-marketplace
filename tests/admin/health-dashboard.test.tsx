/**
 * Tests: Admin System Health Dashboard — PX1C
 *
 * Verifies:
 * 1. Admin authorization barriers (ADMIN allowed; CLIENT, ADVERTISER, Anonymous denied).
 * 2. Overall health status rendering (HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN) with non-color icons.
 * 3. Dynamic subsystem probe cards (criticality, mode, latency, reason codes).
 * 4. CONFIG_ONLY semantics (never claims external reachability).
 * 5. Safe metadata policy (strict allowlist, zero secrets/tokens/URLs/buckets).
 * 6. Error state handling when snapshot evaluator fails.
 * 7. Manual refresh action behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HealthDashboard } from '@/components/admin/health/health-dashboard'
import { HealthCard } from '@/components/admin/health/health-card'
import { formatSafeProbeMetadata } from '@/components/admin/health/safe-metadata'
import type { SystemHealthSnapshot, HealthProbeResult } from '@/modules/observability/health'

// Mock server-only modules
vi.mock('server-only', () => ({}))

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (_h: string) => 'pt-BR',
  }),
}))

const mockRequireAccount = vi.fn()
vi.mock('@/modules/auth/dal', () => ({
  requireAccount: () => mockRequireAccount(),
}))

const mockGetSystemHealthSnapshot = vi.fn()
vi.mock('@/modules/observability/health', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/observability/health')>()
  return {
    ...actual,
    getSystemHealthSnapshot: (opts?: any) => mockGetSystemHealthSnapshot(opts),
  }
})

describe('PX1C: Admin System Health Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // 1. Authorization Barrier Tests (Section 41)
  // ---------------------------------------------------------------------------
  describe('Admin Authorization Barrier', () => {
    it('CASE A: allows ADMIN accounts to access /admin/health', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const adminAccount = await requireAdmin()
      expect(adminAccount.role).toBe('ADMIN')
      expect(redirectMock).not.toHaveBeenCalled()
    })

    it('CASE B: denies ADVERTISER accounts and redirects to /dashboard', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'advertiser-user-1',
        role: 'ADVERTISER',
        status: 'ACTIVE',
        onboarding_status: 'COMPLETED',
      })

      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/dashboard')
    })

    it('CASE C: denies CLIENT accounts and redirects to /cliente', async () => {
      const { requireAdmin } = await import('@/modules/moderation/guards')
      mockRequireAccount.mockResolvedValueOnce({
        id: 'client-user-1',
        role: 'CLIENT',
        status: 'ACTIVE',
      })

      await requireAdmin()
      expect(redirectMock).toHaveBeenCalledWith('/cliente')
    })

    it('CASE D: denies anonymous users (requireAccount redirects to /login)', async () => {
      mockRequireAccount.mockImplementationOnce(() => {
        redirectMock('/login')
        throw new Error('NEXT_REDIRECT')
      })

      const { requireAdmin } = await import('@/modules/moderation/guards')
      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT')
      expect(redirectMock).toHaveBeenCalledWith('/login')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Overall Status Rendering Tests (Section 42)
  // ---------------------------------------------------------------------------
  describe('Overall Status Representation', () => {
    const createSnapshotWithStatus = (status: SystemHealthSnapshot['status']): SystemHealthSnapshot => ({
      status,
      timestamp: '2026-09-05T19:50:00.000Z',
      totalLatencyMs: 120,
      summary: {
        healthyCount: status === 'HEALTHY' ? 7 : 5,
        degradedCount: status === 'DEGRADED' ? 2 : 0,
        unhealthyCount: status === 'UNHEALTHY' ? 1 : 0,
        unknownCount: status === 'UNKNOWN' ? 1 : 0,
        totalCount: 7,
      },
      probes: {
        'supabase-database': {
          name: 'supabase-database',
          subsystem: 'DATABASE',
          status: status === 'UNHEALTHY' ? 'UNHEALTHY' : 'HEALTHY',
          criticality: 'CRITICAL',
          mode: 'ACTIVE',
          reasonCode: status === 'UNHEALTHY' ? 'DATABASE_QUERY_FAILED' : 'OK',
          latencyMs: 12,
          timestamp: '2026-09-05T19:50:00.000Z',
        },
      },
      correlationId: 'test-corr-abc-123',
    })

    it('renders HEALTHY with non-color icon ✓ and positive copy', () => {
      const snapshot = createSnapshotWithStatus('HEALTHY')
      const markup = renderToStaticMarkup(<HealthDashboard initialSnapshot={snapshot} locale="pt-BR" />)

      expect(markup).toContain('✓')
      expect(markup).toContain('Saudável — Operação Normal')
      expect(markup).toContain('Todos os subsistemas críticos e secundários estão operando')
    })

    it('renders DEGRADED with non-color icon ! and operational attention copy', () => {
      const snapshot = createSnapshotWithStatus('DEGRADED')
      const markup = renderToStaticMarkup(<HealthDashboard initialSnapshot={snapshot} locale="pt-BR" />)

      expect(markup).toContain('!')
      expect(markup).toContain('Degradado — Requer Atenção Operacional')
      expect(markup).toContain('A plataforma permanece operacional')
    })

    it('renders UNHEALTHY with non-color icon ✕ and critical failure copy', () => {
      const snapshot = createSnapshotWithStatus('UNHEALTHY')
      const markup = renderToStaticMarkup(<HealthDashboard initialSnapshot={snapshot} locale="pt-BR" />)

      expect(markup).toContain('✕')
      expect(markup).toContain('Não Saudável — Falha de Infraestrutura Crítica')
      expect(markup).toContain('Falha em subsistema crítico')
    })

    it('renders UNKNOWN with non-color icon ? and unverifiable state copy', () => {
      const snapshot = createSnapshotWithStatus('UNKNOWN')
      const markup = renderToStaticMarkup(<HealthDashboard initialSnapshot={snapshot} locale="pt-BR" />)

      expect(markup).toContain('?')
      expect(markup).toContain('Desconhecido — Estado Não Verificável')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Subsystem Probe Cards & Presentation (Sections 43 & 44)
  // ---------------------------------------------------------------------------
  describe('Subsystem Probe Cards', () => {
    it('renders probe card with friendly title, criticality, mode, duration, and reason', () => {
      const probe: HealthProbeResult = {
        name: 'supabase-database',
        subsystem: 'DATABASE',
        status: 'HEALTHY',
        criticality: 'CRITICAL',
        mode: 'ACTIVE',
        reasonCode: 'OK',
        latencyMs: 45,
        timestamp: '2026-09-05T19:50:00.000Z',
      }

      const markup = renderToStaticMarkup(<HealthCard probe={probe} locale="pt-BR" />)

      expect(markup).toContain('Banco de Dados (Supabase PostgreSQL)')
      expect(markup).toContain('DATABASE')
      expect(markup).toContain('Criticidade: Crítico')
      expect(markup).toContain('Modo: Consulta Ativa')
      expect(markup).toContain('45 ms')
      expect(markup).toContain('OK')
    })

    it('CONFIG_ONLY probe visibly communicates that external reachability was not tested', () => {
      const diditProbe: HealthProbeResult = {
        name: 'didit-kyc',
        subsystem: 'KYC',
        status: 'HEALTHY',
        criticality: 'IMPORTANT',
        mode: 'CONFIG_ONLY',
        reasonCode: 'OK',
        latencyMs: 1,
        timestamp: '2026-09-05T19:50:00.000Z',
      }

      const markup = renderToStaticMarkup(<HealthCard probe={diditProbe} locale="pt-BR" />)

      expect(markup).toContain('Apenas Configuração')
      expect(markup).toContain('não testa conectividade externa')
      // Must NOT claim external API was reached or is online
      expect(markup).not.toContain('API online')
      expect(markup).not.toContain('conectividade confirmada')
    })

    it('renders timeout notice accurately when reason is PROBE_TIMEOUT', () => {
      const timeoutProbe: HealthProbeResult = {
        name: 'supabase-storage',
        subsystem: 'STORAGE',
        status: 'DEGRADED',
        criticality: 'IMPORTANT',
        mode: 'ACTIVE',
        reasonCode: 'PROBE_TIMEOUT',
        latencyMs: 3000,
        timestamp: '2026-09-05T19:50:00.000Z',
      }

      const markup = renderToStaticMarkup(<HealthCard probe={timeoutProbe} locale="pt-BR" />)

      expect(markup).toContain('Tempo Esgotado')
      expect(markup).toContain('PROBE_TIMEOUT')
      expect(markup).toContain('não respondeu dentro do limite de tempo')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Safe Metadata Policy (Section 47)
  // ---------------------------------------------------------------------------
  describe('Safe Metadata Sanitization', () => {
    it('strictly filters out secrets, tokens, URLs, and bucket names from probe metadata', () => {
      const contaminatedMetadata = {
        // Forbidden fields:
        apiKey: 'sk_live_very_secret_key_12345',
        secret: 'didit_webhook_secret_9999',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        bucketUrl: 'https://storage.supabase.co/v1/s/profile-media',
        bucket: 'profile-media',
        connectionString: 'postgres://postgres:password@db.example.com:5432/postgres',

        // Safe allowlisted fields:
        mockMode: true,
        provider: 'MOCK',
        authServiceReady: true,
        missingCount: 2,
      }

      const entries = formatSafeProbeMetadata(contaminatedMetadata, 'pt-BR')

      // Safe entries present
      const keys = entries.map((e) => e.key)
      expect(keys).toContain('mockMode')
      expect(keys).toContain('provider')
      expect(keys).toContain('authServiceReady')
      expect(keys).toContain('missingCount')

      // Forbidden entries strictly absent
      expect(keys).not.toContain('apiKey')
      expect(keys).not.toContain('secret')
      expect(keys).not.toContain('token')
      expect(keys).not.toContain('bucketUrl')
      expect(keys).not.toContain('bucket')
      expect(keys).not.toContain('connectionString')

      const combinedValues = entries.map((e) => e.value).join(' ')
      expect(combinedValues).not.toContain('sk_live_very_secret_key_12345')
      expect(combinedValues).not.toContain('didit_webhook_secret_9999')
      expect(combinedValues).not.toContain('password')
      expect(combinedValues).not.toContain('profile-media')
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Server Component & Error Handling (Sections 48 & 46)
  // ---------------------------------------------------------------------------
  describe('Admin Health Page & Error State', () => {
    it('renders safe operator error UI when getSystemHealthSnapshot throws', async () => {
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      mockGetSystemHealthSnapshot.mockRejectedValueOnce(
        new Error('Database cluster partition catastrophic failure')
      )

      const AdminHealthPage = (await import('@/app/(admin)/admin/health/page')).default
      const pageElement = await AdminHealthPage()
      const markup = renderToStaticMarkup(pageElement)

      expect(markup).toContain('Falha na Avaliação de Saúde do Sistema')
      expect(markup).toContain('ID de Correlação')
      expect(markup).toContain('Tentar Novamente')

      // Crucial security requirement: NEVER expose raw exception message or stack in UI
      expect(markup).not.toContain('Database cluster partition catastrophic failure')
    })

    it('refreshHealthSnapshotAction obtains a fresh canonical snapshot', async () => {
      mockRequireAccount.mockResolvedValueOnce({
        id: 'admin-user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const mockSnapshot: SystemHealthSnapshot = {
        status: 'HEALTHY',
        timestamp: '2026-09-05T22:30:00.000Z',
        totalLatencyMs: 95,
        summary: {
          healthyCount: 7,
          degradedCount: 0,
          unhealthyCount: 0,
          unknownCount: 0,
          totalCount: 7,
        },
        probes: {},
        correlationId: 'recheck-123',
      }

      mockGetSystemHealthSnapshot.mockResolvedValueOnce(mockSnapshot)

      const { refreshHealthSnapshotAction } = await import('@/app/(admin)/admin/health/actions')
      const result = await refreshHealthSnapshotAction()

      expect(result).toEqual(mockSnapshot)
      expect(mockGetSystemHealthSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          timeoutMs: 4000,
        })
      )
    })
  })
})
