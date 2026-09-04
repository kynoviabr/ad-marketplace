import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const getMigrationSql = () => {
  const filePath = resolve(
    process.cwd(),
    'supabase/migrations/20260904202500_profile_status_audit_and_atomic_rpc.sql'
  )
  return readFileSync(filePath, 'utf8')
}

describe('R12.4C1 Profile Status Audit + Atomic RPC Migration Foundation (Security Hardened)', () => {
  const sql = getMigrationSql()

  describe('1. Dedicated Immutable Status Event Ledger Table', () => {
    it('creates table professional_profile_status_events with required fields', () => {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.professional_profile_status_events')
      expect(sql).toContain('profile_id            UUID NOT NULL REFERENCES public.professional_profiles(id)')
      expect(sql).toContain('actor_account_user_id UUID NOT NULL REFERENCES public.account_users(id)')
      expect(sql).toContain('action                TEXT NOT NULL')
      expect(sql).toContain('from_status           public.profile_status NOT NULL')
      expect(sql).toContain('to_status             public.profile_status NOT NULL')
      expect(sql).toContain('reason_code           TEXT NOT NULL')
      expect(sql).toContain('notes                 TEXT')
      expect(sql).toContain('safe_state_snapshot   JSONB NOT NULL DEFAULT \'{}\'::JSONB')
      expect(sql).toContain('created_at            TIMESTAMPTZ NOT NULL DEFAULT now()')
    })

    it('enforces that ONLY SUSPEND and REACTIVATE actions are accepted', () => {
      expect(sql).toMatch(/CHECK\s*\(\s*action\s+IN\s*\(\s*'SUSPEND'\s*,\s*'REACTIVATE'\s*\)\s*\)/)
    })

    it('enforces append-only immutability by preventing UPDATE or DELETE via trigger', () => {
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.prevent_profile_status_events_mutation()')
      expect(sql).toContain('RAISE EXCEPTION')
      expect(sql).toContain('CREATE TRIGGER trg_prevent_profile_status_events_mutation')
      expect(sql).toContain('BEFORE UPDATE OR DELETE ON public.professional_profile_status_events')
    })

    it('enforces strict RLS and isolates table from public/anon/authenticated roles', () => {
      expect(sql).toContain('ALTER TABLE public.professional_profile_status_events ENABLE ROW LEVEL SECURITY;')
      expect(sql).toContain('REVOKE ALL ON public.professional_profile_status_events FROM PUBLIC, anon, authenticated;')
      expect(sql).toContain('GRANT ALL ON public.professional_profile_status_events TO service_role;')
      expect(sql).toContain('CREATE POLICY p_profile_status_events_deny_authenticated')
      expect(sql).toContain('CREATE POLICY p_profile_status_events_deny_anon')
    })

    it('creates indexes for profile_id, actor, and action lookups', () => {
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_profile_status_events_profile_id')
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_profile_status_events_actor')
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_profile_status_events_action')
    })
  })

  describe('2. RPC Signature & Session-Bound Authorization (Adversarial Security)', () => {
    it('defines canonical RPC signature with NO client-supplied admin ID or snapshot parameter', () => {
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.admin_transition_profile_status(')
      expect(sql).toContain('p_profile_id          UUID,')
      expect(sql).toContain('p_action              TEXT,')
      expect(sql).toContain('p_reason_code         TEXT,')
      expect(sql).toContain('p_notes               TEXT DEFAULT NULL')
      // Confirms p_admin_account_id and p_safe_snapshot are completely removed
      expect(sql).not.toContain('p_admin_account_id')
      expect(sql).not.toContain('p_safe_snapshot')
    })

    it('denies access when auth.uid() is null (fails closed)', () => {
      expect(sql).toContain('IF auth.uid() IS NULL THEN')
      expect(sql).toContain("RAISE EXCEPTION 'UNAUTHORIZED: Sessão autenticada necessária.';")
    })

    it('strictly binds actor resolution to session auth.uid() with active ADMIN check', () => {
      expect(sql).toContain('SELECT id INTO v_admin_id')
      expect(sql).toContain('FROM public.account_users')
      expect(sql).toContain('WHERE auth_user_id = auth.uid()')
      expect(sql).toContain("AND role = 'ADMIN'")
      expect(sql).toContain("AND status = 'ACTIVE';")
    })

    it('denies non-ADMIN (CLIENT, ADVERTISER) callers even if authenticated', () => {
      expect(sql).toContain('IF v_admin_id IS NULL THEN')
      expect(sql).toContain("RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos têm permissão para executar esta operação.';")
    })

    it('guarantees CLIENT or ADVERTISER cannot spoof an admin ID because parameter does not exist', () => {
      expect(sql).not.toContain('p_admin_account_id')
      expect(sql).not.toMatch(/WHERE id = p_admin_account_id/)
    })

    it('denies inactive ADMIN accounts (status <> ACTIVE)', () => {
      expect(sql).toMatch(/role = 'ADMIN'\s+AND status = 'ACTIVE'/)
    })
  })

  describe('3. Audit Snapshot Strict Database Whitelist (Anti-Tampering & Privacy)', () => {
    it('builds audit snapshot exclusively from explicit internal PostgreSQL whitelist', () => {
      // Must use jsonb_build_object with explicit whitelisted keys only
      expect(sql).toContain('v_snapshot := jsonb_build_object(')
      expect(sql).toContain("'profile_id', v_profile.id,")
      expect(sql).toContain("'stage_name', v_profile.stage_name,")
      expect(sql).toContain("'from_status', v_profile.status,")
      expect(sql).toContain("'to_status', v_to_status,")
      expect(sql).toContain("'content_moderation_status', v_profile.content_moderation_status,")
      expect(sql).toContain("'published_at', v_profile.published_at,")
      expect(sql).toContain("'transition_timestamp', v_now")
    })

    it('does not accept client-provided snapshot JSON, preventing arbitrary injection', () => {
      expect(sql).not.toContain('p_safe_snapshot')
      expect(sql).not.toContain('p_snapshot')
      expect(sql).not.toMatch(/v_snapshot\s*:=\s*v_snapshot\s*\|\|/)
    })

    it('never includes sensitive KYC, personal identity, biometric, or secret tokens in audit schema', () => {
      const forbiddenTokens = [
        'legal_name',
        'cpf',
        'dob',
        'didit',
        'biometric',
        'document_front',
        'document_back',
        'secret',
        'token',
        'access_token',
        'password',
        'stripe_customer_id',
      ]
      for (const token of forbiddenTokens) {
        expect(sql).not.toContain(`'${token}',`)
      }
    })
  })

  describe('4. Concurrency, Atomicity & Guards', () => {
    it('implements pessimistic row locking FOR UPDATE to block concurrent mutations', () => {
      expect(sql).toContain('FROM public.professional_profiles')
      expect(sql).toContain('WHERE id = p_profile_id')
      expect(sql).toContain('FOR UPDATE;')
      expect(sql).toContain('PROFILE_NOT_FOUND')
    })

    it('blocks invalid transitions and duplicate state transitions', () => {
      // SUSPEND guardrails
      expect(sql).toContain('ALREADY_SUSPENDED')
      expect(sql).toContain('INVALID_TRANSITION: Perfis em rascunho (DRAFT) não podem ser suspensos.')
      expect(sql).toContain('INVALID_TRANSITION: Perfis em revisão (READY_FOR_REVIEW) não podem ser suspensos diretamente.')
      expect(sql).toContain('INVALID_TRANSITION: Apenas perfis ativos podem ser suspensos.')

      // REACTIVATE guardrails
      expect(sql).toContain('ALREADY_ACTIVE')
      expect(sql).toContain('INVALID_TRANSITION: Apenas perfis suspensos podem ser reativados.')
    })

    it('validates canonical publication gates fail-closed on reactivation', () => {
      // Account ACTIVE
      expect(sql).toContain("a.status = 'ACTIVE'")
      expect(sql).toContain('A conta associada ao perfil não está ativa.')

      // KYC & age verified
      expect(sql).toContain("iv.status = 'VERIFIED'")
      expect(sql).toContain('iv.identity_verified = TRUE')
      expect(sql).toContain('iv.age_verified = TRUE')
      expect(sql).toContain('A verificação de identidade e maioridade (KYC) não está aprovada.')

      // Profile completeness & active contact channel
      expect(sql).toContain('length(trim(COALESCE(v_profile.stage_name, \'\'))) < 2')
      expect(sql).toContain('v_profile.headline IS NULL')
      expect(sql).toContain('v_profile.bio IS NULL')
      expect(sql).toContain('show_whatsapp')
      expect(sql).toContain('show_phone')
      expect(sql).toContain('show_telegram')
      expect(sql).toContain('Os dados cadastrais ou canais de contato do perfil estão incompletos.')

      // Service location and active city
      expect(sql).toContain('ml.active = TRUE')
      expect(sql).toContain('ci.active = TRUE')
      expect(sql).toContain('O perfil não possui nenhuma localização ou cidade de atendimento ativa.')

      // Approved primary photo
      expect(sql).toContain("pm.status = 'APPROVED'")
      expect(sql).toContain('pm.is_primary = TRUE')
      expect(sql).toContain('pm.deleted_at IS NULL')
      expect(sql).toContain('O perfil precisa ter ao menos uma foto aprovada definida como principal.')

      // Content moderation status
      expect(sql).toContain("v_profile.content_moderation_status <> 'APPROVED'")
      expect(sql).toContain('O conteúdo editorial do perfil não possui aprovação da moderação.')

      // Publication entitlement (subscription or billing override)
      expect(sql).toContain("s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')")
      expect(sql).toContain('bo.revoked_at IS NULL')
      expect(sql).toContain('A conta não possui assinatura ou benefício de publicação ativo.')
    })

    it('atomically executes status mutation and immutable event insert in one transaction', () => {
      expect(sql).toContain('UPDATE public.professional_profiles')
      expect(sql).toContain('INSERT INTO public.professional_profile_status_events')
      expect(sql).toContain('RETURNING id INTO v_event_id;')
    })

    it('preserves published_at semantics and does not re-publish or overwrite it', () => {
      expect(sql).toMatch(/UPDATE public\.professional_profiles\s+SET\s+status = v_to_status,\s+updated_at = v_now\s+WHERE id = v_profile\.id;/)
    })

    it('enforces least-privilege EXECUTE permissions: authenticated YES, PUBLIC/anon/service_role NO', () => {
      expect(sql).toContain('SECURITY DEFINER')
      expect(sql).toContain('SET search_path = public, pg_temp')
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.admin_transition_profile_status\(UUID, TEXT, TEXT, TEXT\) FROM PUBLIC,\s*anon,\s*service_role;/)
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_transition_profile_status(UUID, TEXT, TEXT, TEXT) TO authenticated;')
      expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_transition_profile_status\(UUID, TEXT, TEXT, TEXT\) TO[^\n;]*service_role/i)
    })
  })
})
