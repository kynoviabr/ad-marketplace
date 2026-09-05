import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const migrationPath = path.join(
  root,
  'supabase/migrations/20260905010000_atomic_profile_approval_and_activation.sql'
)
const sql = fs.readFileSync(migrationPath, 'utf8')

function functionBody(name: string, nextMarker: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`)
  const end = sql.indexOf(nextMarker, start)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return sql.slice(start, end)
}

describe('R12 P1-2 atomic profile approval and activation contract', () => {
  const adminRpc = functionBody(
    'admin_approve_and_activate_profile',
    'REVOKE ALL ON FUNCTION public.admin_approve_and_activate_profile'
  )
  const ownerRpc = functionBody(
    'publish_owned_profile',
    'REVOKE ALL ON FUNCTION public.publish_owned_profile'
  )

  it('uses one canonical prerequisite predicate for the view and both mutations', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.profile_publication_prerequisites_satisfied')
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.v_publication_eligible_profiles[\s\S]*profile_publication_prerequisites_satisfied\(p\.id\)/)
    expect(adminRpc).toContain('profile_publication_prerequisites_satisfied(v_profile.id)')
    expect(ownerRpc).toContain('profile_publication_prerequisites_satisfied(v_profile.id)')
    expect(sql).toContain("pe.code = 'PROFILE_PUBLICATION'")
    expect(sql).toContain('pe.value_bool = TRUE')
  })

  it('locks the profile and qualifying dependencies before approval mutation', () => {
    expect(adminRpc).toMatch(/professional_profiles[\s\S]*FOR UPDATE/)
    expect(adminRpc).toMatch(/account_users[\s\S]*FOR SHARE/)
    expect(adminRpc).toMatch(/identity_verifications[\s\S]*FOR SHARE/)
    expect(adminRpc).toMatch(/profile_media[\s\S]*FOR SHARE/)
    expect(adminRpc).toMatch(/subscriptions[\s\S]*FOR SHARE OF s, pe/)
  })

  it('commits approval, activation, audit, and onboarding in one database function', () => {
    expect(adminRpc).toMatch(/UPDATE public\.professional_profiles[\s\S]*content_moderation_status = 'APPROVED'[\s\S]*status = 'ACTIVE'/)
    expect(adminRpc).toContain('INSERT INTO public.profile_moderation_reviews')
    expect(adminRpc).toMatch(/UPDATE public\.account_users[\s\S]*onboarding_status = 'COMPLETED'/)
  })

  it('fails publication gates before any state or audit mutation', () => {
    const gate = adminRpc.indexOf('PUBLICATION_GATE_FAILED')
    expect(gate).toBeGreaterThanOrEqual(0)
    expect(adminRpc.indexOf('UPDATE public.professional_profiles')).toBeGreaterThan(gate)
    expect(adminRpc.indexOf('INSERT INTO public.profile_moderation_reviews')).toBeGreaterThan(gate)
  })

  it('rejects duplicate, suspended, draft, and incompatible approval states', () => {
    expect(adminRpc).toContain('ALREADY_APPROVED')
    expect(adminRpc).toContain("v_profile.status = 'SUSPENDED'")
    expect(adminRpc).toContain("v_profile.status = 'DRAFT'")
    expect(adminRpc).toContain("v_profile.status NOT IN ('READY_FOR_REVIEW', 'ACTIVE')")
  })

  it('derives ADMIN identity from auth.uid and never accepts a reviewer parameter', () => {
    expect(adminRpc).toContain('auth.uid()')
    expect(adminRpc).toContain("role = 'ADMIN' AND status = 'ACTIVE'")
    expect(adminRpc).not.toContain('p_reviewer_id')
  })

  it('derives owner identity from auth.uid and enforces active advertiser plus legal acceptance', () => {
    expect(ownerRpc).toContain('auth_user_id = auth.uid()')
    expect(ownerRpc).toContain("v_account.role <> 'ADVERTISER'")
    expect(ownerRpc).toContain("v_account.status <> 'ACTIVE'")
    expect(ownerRpc).toContain('v_account.terms_version IS NULL')
    expect(ownerRpc).toContain('v_account.privacy_version IS NULL')
    expect(ownerRpc).toContain('account_user_id = v_account.id')
  })

  it('makes owner activation and onboarding atomic after moderation and canonical gates', () => {
    expect(ownerRpc).toContain("v_profile.content_moderation_status <> 'APPROVED'")
    const gate = ownerRpc.indexOf('PUBLICATION_GATE_FAILED')
    expect(ownerRpc.indexOf('UPDATE public.professional_profiles')).toBeGreaterThan(gate)
    expect(ownerRpc).toMatch(/UPDATE public\.account_users[\s\S]*onboarding_status = 'COMPLETED'/)
  })

  it('does not set published_at directly and preserves the existing first-activation trigger', () => {
    expect(sql).not.toMatch(/SET[^;]*published_at\s*=/)
  })

  it('exposes mutation RPCs only to authenticated callers', () => {
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_approve_and_activate_profile(UUID, TEXT) TO authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.publish_owned_profile() TO authenticated')
    expect(sql).toContain('FROM PUBLIC, anon, service_role')
  })

  it('application approval and owner publication delegate to the atomic RPCs', () => {
    const adminActions = fs.readFileSync(path.join(root, 'modules/admin/actions.ts'), 'utf8')
    const publicationActions = fs.readFileSync(path.join(root, 'modules/publication/actions.ts'), 'utf8')
    expect(adminActions).toContain("rpc('admin_approve_and_activate_profile'")
    expect(publicationActions).toContain("rpc('publish_owned_profile')")
    expect(publicationActions).not.toContain(".from('professional_profiles')")
    expect(publicationActions).not.toContain(".from('account_users')")
  })
})
