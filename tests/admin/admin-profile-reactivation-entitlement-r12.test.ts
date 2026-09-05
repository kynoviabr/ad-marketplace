import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const migrationPath = 'supabase/migrations/20260905000000_enforce_profile_publication_on_reactivation.sql'
const canonicalPath = 'supabase/migrations/20260830000002_admin_founder_entitlement_management.sql'
const sql = read(migrationPath)
const canonical = read(canonicalPath)

function subscriptionGate(source: string) {
  const start = source.indexOf('FROM public.subscriptions s')
  const end = source.indexOf('OR EXISTS (', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('R12 P1-1 canonical publication entitlement on REACTIVATE', () => {
  it('requires a valid subscription whose effective plan grants PROFILE_PUBLICATION=true', () => {
    const gate = subscriptionGate(sql)
    expect(gate).toContain("s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')")
    expect(gate).toContain('pe.plan_id = s.plan_id')
    expect(gate).toContain("pe.code = 'PROFILE_PUBLICATION'")
    expect(gate).toContain('pe.value_bool = TRUE')
  })

  it('matches the canonical subscription entitlement predicates', () => {
    const rpcGate = subscriptionGate(sql)
    const viewGate = subscriptionGate(canonical)
    for (const predicate of [
      "s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')",
      "s.status = 'ACTIVE'",
      "s.status = 'PAST_DUE'",
      "s.status = 'GRACE_PERIOD'",
      'pe.plan_id = s.plan_id',
      "pe.code = 'PROFILE_PUBLICATION'",
      'pe.value_bool = TRUE',
    ]) {
      expect(rpcGate).toContain(predicate)
      expect(viewGate).toContain(predicate)
    }
  })

  it('fails closed when the entitlement row is missing or false', () => {
    const gate = subscriptionGate(sql)
    expect(gate).toMatch(/AND EXISTS \(\s*SELECT 1\s*FROM public\.plan_entitlements pe/)
    expect(gate).toContain('pe.value_bool = TRUE')
    expect(sql).toContain("RAISE EXCEPTION 'PUBLICATION_GATE_FAILED:")
  })

  it('preserves the canonical active billing override alternative', () => {
    expect(sql).toContain('FROM public.billing_overrides bo')
    expect(sql).toContain('bo.account_user_id = v_profile.account_user_id')
    expect(sql).toContain('bo.revoked_at IS NULL')
    expect(sql).toContain('(bo.expires_at IS NULL OR bo.expires_at > now())')
  })

  it('keeps failed gates before mutation and audit, preserving atomic rollback semantics', () => {
    const gateFailure = sql.indexOf("RAISE EXCEPTION 'PUBLICATION_GATE_FAILED:")
    const mutation = sql.indexOf('UPDATE public.professional_profiles')
    const audit = sql.indexOf('INSERT INTO public.professional_profile_status_events')
    expect(gateFailure).toBeGreaterThan(-1)
    expect(mutation).toBeGreaterThan(gateFailure)
    expect(audit).toBeGreaterThan(mutation)
  })

  it('preserves published_at by omitting it from the status update', () => {
    const update = sql.slice(
      sql.indexOf('UPDATE public.professional_profiles'),
      sql.indexOf('INSERT INTO public.professional_profile_status_events')
    )
    expect(update).not.toContain('published_at =')
    expect(sql).toContain("'published_at', v_profile.published_at")
  })

  it('derives the actor from auth.uid and permits only active ADMIN sessions', () => {
    expect(sql).toContain('IF auth.uid() IS NULL THEN')
    expect(sql).toContain('WHERE auth_user_id = auth.uid()')
    expect(sql).toContain("AND role = 'ADMIN'")
    expect(sql).toContain("AND status = 'ACTIVE'")
    expect(sql).toContain('IF v_admin_id IS NULL THEN')
  })

  it('retains locking, legal transitions and least-privilege grants', () => {
    expect(sql).toContain('FOR UPDATE;')
    expect(sql).toContain('ALREADY_ACTIVE')
    expect(sql).toContain('ALREADY_SUSPENDED')
    expect(sql).toContain('INVALID_TRANSITION')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public, pg_temp')
    expect(sql).toContain('FROM PUBLIC, anon, service_role;')
    expect(sql).toContain('TO authenticated;')
  })

  it('keeps application code delegated exclusively to the RPC', () => {
    const actions = read('modules/admin/actions.ts')
    const transitionStart = actions.indexOf('export async function adminTransitionProfileStatusAction')
    const transitionEnd = actions.indexOf('export async function adminSuspendProfileAction', transitionStart)
    const transition = actions.slice(transitionStart, transitionEnd)
    expect(transition).toContain("supabase.rpc('admin_transition_profile_status'")
    expect(transition).not.toContain(".from('professional_profiles')")
    expect(transition).not.toContain(".from('professional_profile_status_events')")
  })
})
