import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isDistributedRateLimited } from '@/modules/security/rate-limiter'
import { isConciergeDistributedRateLimited } from '@/modules/concierge/rate-limiter'
import { SAFE_RATE_LIMIT_REPLY } from '@/modules/concierge/constants'
import type { ConciergeConversation } from '@/modules/concierge/types'

// Mock dependencies for testing failure isolation
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/concierge/provider', () => ({
  generateConciergeReply: vi.fn(),
}))

vi.mock('@/modules/concierge/tools', () => ({
  executeConciergeToolsBatch: vi.fn(),
}))

vi.mock('@/modules/concierge/dal', () => ({
  assertPublicConciergeEligibility: vi.fn().mockResolvedValue(true),
  getConversationMessages: vi.fn().mockResolvedValue([]),
  saveConciergeMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
  getConciergeSettings: vi.fn().mockResolvedValue({ enabled: true }),
  getConciergeFaqs: vi.fn().mockResolvedValue([]),
  getPublicProfileContextFacts: vi.fn().mockResolvedValue({ stageName: 'Test' }),
  updateConversationQualification: vi.fn().mockResolvedValue(undefined),
  updateConversationStatus: vi.fn().mockResolvedValue(undefined),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { generateConciergeReply } from '@/modules/concierge/provider'
import { executeConciergeToolsBatch } from '@/modules/concierge/tools'
import { saveConciergeMessage } from '@/modules/concierge/dal'
import { processConciergeTurn } from '@/modules/concierge/runtime'

describe('PX7.1 — Distributed Rate Limiter Failure Semantics & Fail-Closed Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Core Fail-Closed vs Fail-Open Semantics', () => {
    it('fails closed when backend returns database error with failClosed: true', async () => {
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'connection pool timeout', code: '57P01' },
        }),
      } as any)

      const blocked = await isDistributedRateLimited('test:fail_closed:key', 10, 60, {
        failClosed: true,
      })

      // Must be blocked (true) when failClosed is enabled
      expect(blocked).toBe(true)
    })

    it('fails closed when backend throws network exception with failClosed: true', async () => {
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockRejectedValue(new Error('ETIMEDOUT: database unreachable')),
      } as any)

      const blocked = await isDistributedRateLimited('test:network_fail:key', 10, 60, {
        failClosed: true,
      })

      expect(blocked).toBe(true)
    })

    it('defaults to fail-closed in isConciergeDistributedRateLimited', async () => {
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'relation "distributed_rate_limits" does not exist' },
        }),
      } as any)

      const blocked = await isConciergeDistributedRateLimited('conv-test-id', 'CONVERSATION_TURN')
      expect(blocked).toBe(true)
    })
  })

  describe('2. Deterministic WEB_PUBLIC Concierge Protection on Rate Limiter Failure', () => {
    const mockWebPublicConversation: ConciergeConversation = {
      id: 'conv-web-public-123456',
      profile_id: 'prof-789012',
      visitor_session_id: 'sess-abc-def-ghi-jkl',
      channel: 'WEB_PUBLIC',
      status: 'ACTIVE',
      is_test: false,
      qualification: {},
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      handoff_at: null,
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('blocks turn, suppresses AI inference, suppresses tool execution, and avoids message spam when limiter backend fails', async () => {
      // Simulate distributed limiter backend complete failure
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: '503: Service Unavailable', code: '503' },
        }),
      } as any)

      const result = await processConciergeTurn({
        conversation: mockWebPublicConversation,
        visitorMessage: 'Olá, você atende amanhã às 15h?',
        isTest: false,
      })

      // 1. Returns safe generic rate limit reply
      expect(result.replyText).toBe(SAFE_RATE_LIMIT_REPLY)
      expect(result.intent).toBe('GENERAL')
      expect(result.handoffRequested).toBe(false)
      expect(result.assistantMessageId).toBe('')

      // 2. AI Provider was NOT called (zero OpenAI tokens consumed)
      expect(generateConciergeReply).not.toHaveBeenCalled()

      // 3. Availability tool was NOT called (zero database agenda side effects)
      expect(executeConciergeToolsBatch).not.toHaveBeenCalled()

      // 4. Visitor message was NOT persisted (zero conversation spam / database pollution)
      expect(saveConciergeMessage).not.toHaveBeenCalled()
    })

    it('processes turn normally and calls AI provider when distributed limiter permits the request', async () => {
      // Simulate distributed limiter backend returning allowed (false = not blocked)
      vi.mocked(createAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: false, // NOT blocked
          error: null,
        }),
      } as any)

      vi.mocked(generateConciergeReply).mockResolvedValue({
        replyText: 'Olá! Sim, atendo mediante agendamento direto.',
        intent: 'AVAILABILITY_INQUIRY',
        handoffRequested: false,
      })

      const result = await processConciergeTurn({
        conversation: mockWebPublicConversation,
        visitorMessage: 'Olá, você atende amanhã às 15h?',
        isTest: false,
      })

      // Normal path: visitor message persisted, AI provider called
      expect(saveConciergeMessage).toHaveBeenCalledWith(
        mockWebPublicConversation.id,
        'VISITOR',
        'Olá, você atende amanhã às 15h?',
        expect.objectContaining({ channel: 'WEB_PUBLIC', is_test: false })
      )
      expect(generateConciergeReply).toHaveBeenCalled()
      expect(result.replyText).toContain('Olá! Sim, atendo mediante agendamento direto.')
    })
  })
})
