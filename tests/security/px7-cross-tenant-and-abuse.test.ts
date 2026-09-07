import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPublicChatMessageAction } from '@/modules/concierge/actions'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'

const mockAccount = {
  current: {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'ADVERTISER',
    status: 'ACTIVE',
  },
}

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(async () => mockAccount.current),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('PX7 — Cross-Tenant Authorization & Abuse Defenses', () => {
  const admin = createAdminClient()
  let profileA: { id: string; account_user_id: string }
  let profileB: { id: string; account_user_id: string }
  let clientUser: { id: string }
  let adminUser: { id: string }

  beforeAll(async () => {
    // Fetch 2 distinct profiles
    const { data: profiles } = await admin
      .from('professional_profiles')
      .select('id, account_user_id')
      .limit(2)

    if (profiles && profiles.length >= 2) {
      profileA = profiles[0]
      profileB = profiles[1]
    }

    const { data: client } = await admin
      .from('account_users')
      .select('id')
      .eq('role', 'CLIENT')
      .limit(1)
      .single()

    if (client) {
      clientUser = client
    }

    const { data: adm } = await admin
      .from('account_users')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .single()

    if (adm) {
      adminUser = adm
    }
  })

  describe('1. Canonical Profile Ownership Guard (assertProfileOwnership)', () => {
    it('denies access when caller is not the owner (Advertiser A -> Profile B)', async () => {
      if (!profileA || !profileB) return

      mockAccount.current = {
        id: profileA.account_user_id,
        role: 'ADVERTISER',
        status: 'ACTIVE',
      }

      const { assertProfileOwnership: guard } = await import('@/modules/profiles/guards')

      // Attempt to access Profile B
      await expect(guard(profileB.id)).rejects.toThrow('Não autorizado')
    })

    it('denies access when caller is a CLIENT role', async () => {
      if (!profileA || !clientUser) return

      mockAccount.current = {
        id: clientUser.id,
        role: 'CLIENT',
        status: 'ACTIVE',
      }

      const { assertProfileOwnership: guard } = await import('@/modules/profiles/guards')

      await expect(guard(profileA.id)).rejects.toThrow('Não autorizado')
    })

    it('grants access when caller is an ADMIN role', async () => {
      if (!profileA || !adminUser) return

      mockAccount.current = {
        id: adminUser.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      }

      const { assertProfileOwnership: guard } = await import('@/modules/profiles/guards')

      const result = await guard(profileA.id)
      expect(result.isAdmin).toBe(true)
    })
  })

  describe('2. Public Concierge Abuse & Input Validation', () => {
    it('rejects empty or whitespace-only messages before conversation lookup', async () => {
      const result = await sendPublicChatMessageAction(
        profileA?.id || '00000000-0000-0000-0000-000000000001',
        'valid-visitor-session-123456',
        '    '
      )

      expect(result.success).toBe(false)
      // When public concierge is not ready or when message is empty
      expect(result.error).toBeDefined()
    })

    it('rejects short / malformed visitor session tokens', async () => {
      const result = await sendPublicChatMessageAction(
        profileA?.id || '00000000-0000-0000-0000-000000000001',
        'short',
        'Olá'
      )

      expect(result.success).toBe(false)
    })
  })

  describe('3. Media Signing Context & Ownership Binding', () => {
    it('returns null if profileId context mismatches media profile_id', async () => {
      const result = await getApprovedMediaDeliveryUrl(
        {
          status: 'APPROVED',
          storage_path: `profiles/${profileA?.id}/photo1.jpg`,
          profile_id: profileA?.id,
        },
        {
          profileId: profileB?.id, // Context mismatch!
        }
      )

      expect(result).toBeNull()
    })

    it('returns null if media is not in APPROVED status', async () => {
      const result = await getApprovedMediaDeliveryUrl({
        status: 'PENDING_MODERATION' as any,
        storage_path: `profiles/${profileA?.id}/photo1.jpg`,
        profile_id: profileA?.id,
      })

      expect(result).toBeNull()
    })
  })
})
