import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('R10 finalization security contracts', () => {
  it('records immutable first publication without rewriting historical rows', () => {
    const sql = source('supabase/migrations/20260903120002_profile_published_at.sql')
    expect(sql).toContain('trg_profile_first_published_at')
    expect(sql).toContain("OLD.status IS DISTINCT FROM 'ACTIVE' AND NEW.status = 'ACTIVE'")
    expect(sql).toContain('NEW.published_at := OLD.published_at')
    expect(sql).not.toMatch(/UPDATE\s+public\.professional_profiles/i)
  })

  it('uses trusted app metadata to atomically create CLIENT plus FREE membership', () => {
    const sql = source('supabase/migrations/20260903120006_client_signup_intents.sql')
    const action = source('modules/auth/actions.ts')
    expect(sql).toContain("NEW.raw_user_meta_data ->> 'velvet_client_signup_token'")
    expect(source('supabase/migrations/20260903120007_fix_signup_digest_schema.sql')).toContain("extensions.digest(v_token, 'sha256')")
    expect(sql).toContain('consumed_at IS NULL')
    expect(sql).toContain("VALUES (v_account_id, 'FREE'::public.client_membership_type)")
    expect(action).toContain('admin.createUser')
    expect(action).toContain("from('client_signup_intents').insert")
    expect(action).toContain('user_metadata: { velvet_client_signup_token: signupToken }')
    expect(action).toContain('admin.deleteUser')
    expect(action).not.toMatch(/\.update\(\{\s*role:\s*'CLIENT'/)
    expect(action).toContain("account?.role === 'CLIENT' ? '/cliente' : '/onboarding'")
  })

  it('orders discovery by immutable publication and approval timestamps', () => {
    const sql = source('supabase/migrations/20260903120004_media_approval_recency.sql')
    const home = source('modules/search/home-sections.ts')
    expect(sql).toContain('trg_profile_media_first_approval')
    expect(sql).toContain('trg_profile_video_first_approval')
    expect(sql).toContain('NEW.approved_at := OLD.approved_at')
    expect(sql).not.toMatch(/UPDATE\s+public\.(profile_media|profile_videos)/i)
    expect(home).toContain(".order('published_at', { ascending: false })")
    expect(home.match(/\.order\('approved_at', \{ ascending: false \}\)/g)).toHaveLength(2)
    expect(home).not.toContain(".order('updated_at', { ascending: false })")
    expect(home).toContain(".eq('status', 'APPROVED')")
  })

  it('keeps VIP media access stricter than profile access and signs video posters from the private video bucket', () => {
    const home = source('modules/search/home-sections.ts')
    const videos = source('modules/videos/dal.ts')
    expect(home).toContain('canAccessVipProfiles && canAccessVipMedia')
    expect(home).toContain('getApprovedVideoPosterDeliveryUrl')
    expect(videos).toContain("storage.from('profile-videos')")
  })

  it('reauthorizes admin mutations and writes the authenticated admin identity', () => {
    for (const path of ['app/(admin)/admin/clients/page.tsx', 'app/(admin)/admin/profiles/audience/page.tsx']) {
      const page = source(path)
      expect(page.match(/requireAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(2)
      expect(page).toContain('actor_account_user_id: adminAccount.id')
      expect(page).toContain('target_account_user_id:')
      expect(page).not.toContain('admin_id:')
    }
  })

  it('does not nest a main landmark inside the protected dashboard layout', () => {
    const page = source('app/(dashboard)/cliente/page.tsx')
    expect(page).not.toContain('<main>')
  })
})
