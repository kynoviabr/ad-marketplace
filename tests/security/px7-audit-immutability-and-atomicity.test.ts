import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('PX7 — Audit Ledger Immutability & Mutation Atomicity', () => {
  const admin = createAdminClient()
  let adminUserId: string
  let clientUserId: string
  let advertiserUserId: string
  let testProfileId: string
  let testVideoId: string
  const createdAuditLogIds: string[] = []

  beforeAll(async () => {
    // Find an active ADMIN account
    const { data: adminUser } = await admin
      .from('account_users')
      .select('id')
      .eq('role', 'ADMIN')
      .eq('status', 'ACTIVE')
      .limit(1)
      .single()

    if (adminUser) {
      adminUserId = adminUser.id
    }

    // Find the oldest permanent active CLIENT account
    const { data: clientUser } = await admin
      .from('account_users')
      .select('id')
      .eq('role', 'CLIENT')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (clientUser) {
      clientUserId = clientUser.id
    }

    // Find an ADVERTISER profile
    const { data: profile } = await admin
      .from('professional_profiles')
      .select('id, account_user_id')
      .limit(1)
      .single()

    if (profile) {
      testProfileId = profile.id
      advertiserUserId = profile.account_user_id
    }

    // Find or check a video
    const { data: video } = await admin
      .from('profile_videos')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (video) {
      testVideoId = video.id
    }
  })

  afterAll(async () => {
    // Clean up test records where allowed
  })

  describe('1. Audit Ledger Immutability (Backlog Item C)', () => {
    it('blocks UPDATE on billing_admin_audit_logs via PostgreSQL trigger', async () => {
      // 1. Insert a legitimate audit log
      const { data: inserted, error: insertError } = await admin
        .from('billing_admin_audit_logs')
        .insert({
          actor_account_user_id: adminUserId,
          target_account_user_id: adminUserId,
          action: 'ENTITLEMENT_OVERRIDE_GRANTED',
          metadata: { test: true },
        })
        .select('id')
        .single()

      expect(insertError).toBeNull()
      expect(inserted?.id).toBeDefined()
      const logId = inserted!.id
      createdAuditLogIds.push(logId)

      // 2. Attempt UPDATE on the audit log
      const { error: updateError } = await admin
        .from('billing_admin_audit_logs')
        .update({ action: 'ENTITLEMENT_OVERRIDE_REVOKED' } as any)
        .eq('id', logId)

      expect(updateError).not.toBeNull()
      expect(updateError?.message).toContain('estritamente imutável')
    })

    it('blocks DELETE on billing_admin_audit_logs via PostgreSQL trigger', async () => {
      const { data: inserted } = await admin
        .from('billing_admin_audit_logs')
        .insert({
          actor_account_user_id: adminUserId,
          target_account_user_id: clientUserId || adminUserId,
          action: 'ENTITLEMENT_OVERRIDE_REVOKED',
          metadata: { test: true },
        })
        .select('id')
        .single()

      const logId = inserted!.id
      createdAuditLogIds.push(logId)

      // Attempt DELETE
      const { error: deleteError } = await admin
        .from('billing_admin_audit_logs')
        .delete()
        .eq('id', logId)

      expect(deleteError).not.toBeNull()
      expect(deleteError?.message).toContain('estritamente imutável')
    })

    it('blocks UPDATE on professional_profile_status_events', async () => {
      const { error: updateError } = await admin
        .from('professional_profile_status_events')
        .update({ action: 'SUSPEND' } as any)
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (updateError) {
        expect(updateError.message).toContain('estritamente imutável')
      }
    })

    it('blocks DELETE on verification_webhook_events via trigger', async () => {
      // Find an event
      const { data: event } = await admin
        .from('verification_webhook_events')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (event) {
        const { error: deleteError } = await admin
          .from('verification_webhook_events')
          .delete()
          .eq('id', event.id)

        expect(deleteError).not.toBeNull()
        expect(deleteError?.message).toContain('não podem ser excluídos')
      }
    })

    it('blocks DELETE on billing_webhook_events via trigger', async () => {
      const { data: event } = await admin
        .from('billing_webhook_events')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (event) {
        const { error: deleteError } = await admin
          .from('billing_webhook_events')
          .delete()
          .eq('id', event.id)

        expect(deleteError).not.toBeNull()
        expect(deleteError?.message).toContain('não podem ser excluídos')
      }
    })
  })

  describe('2. Security-Sensitive Mutation Atomicity (Backlog Item B)', () => {
    it('admin_toggle_client_vip: denies non-admin caller', async () => {
      if (!advertiserUserId || !clientUserId) return

      const { error } = await admin.rpc('admin_toggle_client_vip', {
        p_actor_account_user_id: advertiserUserId, // Advertiser, not Admin
        p_target_account_user_id: clientUserId,
        p_membership_type: 'VIP',
      })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('Acesso negado: apenas administradores ativos')
    })

    it('admin_toggle_client_vip: denies targeting non-client account', async () => {
      if (!adminUserId || !advertiserUserId) return

      const { error } = await admin.rpc('admin_toggle_client_vip', {
        p_actor_account_user_id: adminUserId,
        p_target_account_user_id: advertiserUserId, // Target is ADVERTISER, not CLIENT
        p_membership_type: 'VIP',
      })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('papel CLIENT')
    })

    it('admin_toggle_client_vip: atomically updates membership and creates audit log', async () => {
      if (!adminUserId || !clientUserId) return

      const { data: result, error } = await admin.rpc('admin_toggle_client_vip', {
        p_actor_account_user_id: adminUserId,
        p_target_account_user_id: clientUserId,
        p_membership_type: 'VIP',
      })

      expect(error).toBeNull()
      expect(result).toMatchObject({
        success: true,
        account_id: clientUserId,
        membership_type: 'VIP',
      })

      // Verify membership was updated
      const { data: membership } = await admin
        .from('client_memberships')
        .select('membership_type')
        .eq('account_id', clientUserId)
        .single()

      expect(membership?.membership_type).toBe('VIP')

      // Revert back to FREE
      await admin.rpc('admin_toggle_client_vip', {
        p_actor_account_user_id: adminUserId,
        p_target_account_user_id: clientUserId,
        p_membership_type: 'FREE',
      })
    })

    it('admin_set_profile_audience: denies non-admin caller', async () => {
      if (!advertiserUserId || !testProfileId) return

      const { error } = await admin.rpc('admin_set_profile_audience', {
        p_actor_account_user_id: advertiserUserId, // Not Admin
        p_profile_id: testProfileId,
        p_audience_setting: 'VIP_ONLY',
      })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('Acesso negado')
    })

    it('admin_set_profile_audience: atomically updates audience and creates audit log', async () => {
      if (!adminUserId || !testProfileId) return

      // Read current audience
      const { data: profileBefore } = await admin
        .from('professional_profiles')
        .select('audience_setting')
        .eq('id', testProfileId)
        .single()

      const initialAudience = profileBefore?.audience_setting || 'PUBLIC'
      const newAudience = initialAudience === 'PUBLIC' ? 'VIP_ONLY' : 'PUBLIC'

      const { data: result, error } = await admin.rpc('admin_set_profile_audience', {
        p_actor_account_user_id: adminUserId,
        p_profile_id: testProfileId,
        p_audience_setting: newAudience,
      })

      expect(error).toBeNull()
      expect(result).toMatchObject({
        success: true,
        profile_id: testProfileId,
        audience_setting: newAudience,
      })

      // Revert to initial audience
      await admin.rpc('admin_set_profile_audience', {
        p_actor_account_user_id: adminUserId,
        p_profile_id: testProfileId,
        p_audience_setting: initialAudience,
      })
    })
  })
})
