-- =============================================================================
-- Migration: 20260819000010_fase11_security_remediation.sql
-- FASE 11 — Security Remediation & Architecture Closure
-- =============================================================================
--
-- This migration addresses all DB-layer FASE 11 audit findings:
--
-- F11-SEC-001 / F11-SEC-002: Canonical publication eligibility VIEW
--   Creates v_publication_eligible_profiles — the single authoritative source
--   of truth for all public profile visibility decisions. Search, SEO,
--   Sitemap, Boost, and future /perfil/[slug] MUST consume this view.
--
-- F11-SEC-005: Cross-city location assignment
--   Adds city-uniformity enforcement to save_profile_service_areas() RPC.
--
-- F11-SEC-010: profile_boosts deny-all policy consistency
--   Adds explicit TO authenticated on deny-all policies for consistency
--   with the project's role matrix standard.
--
-- F11-INFO-001: Moderation/report tables defense-in-depth
--   Adds explicit deny-all RLS policies for client roles on moderation
--   and content_reports tables (they already have grants revoked, but
--   explicit deny policies add defense-in-depth).
--
-- =============================================================================

-- =============================================================================
-- SECTION 1: CANONICAL PUBLICATION ELIGIBILITY VIEW
-- =============================================================================
--
-- DESIGN: PostgreSQL VIEW (not materialized, not denormalized boolean).
--
-- Rationale:
-- - Time-aware: billing expiry evaluated at query time, no cron dependency.
-- - Fail-closed: no row = not eligible.
-- - Single source of truth: eliminates drift between search/SEO/boost.
-- - Concurrency-safe: no stale read possible (reads live data).
-- - Efficient: used as EXISTS subquery or INNER JOIN in consumer queries.
--
-- CANONICAL PUBLICATION GATES (8 total, all must pass):
--   Gate 1: account.status = 'ACTIVE'
--   Gate 2: verification.status = 'VERIFIED' (identity + age both confirmed)
--   Gate 3: profile.status IN ('READY_FOR_REVIEW', 'ACTIVE')
--            (excludes DRAFT, PAUSED, SUSPENDED)
--   Gate 4: profile.content_moderation_status = 'APPROVED'
--   Gate 5: >= 1 active service location configured
--   Gate 6: >= 1 approved, non-deleted photo exists
--   Gate 7: NOT (profile.status IN ('PAUSED', 'SUSPENDED'))
--            (redundant with Gate 3, kept for explicit intent)
--   Gate 8: Valid publication entitlement (time-aware):
--            a. Active subscription with period not yet expired, OR
--            b. Admin billing override (not revoked, not expired)
--
-- TIME-AWARENESS for Gate 8:
--   Subscription ACTIVE:        eligible IF current_period_end IS NULL OR > now()
--   Subscription PAST_DUE:      eligible (provider still retrying)
--   Subscription GRACE_PERIOD:  eligible IF grace_period_end IS NOT NULL AND > now()
--   Subscription INCOMPLETE/EXPIRED: NOT eligible
--   Override:                   eligible IF revoked_at IS NULL AND (expires_at IS NULL OR > now())
--
-- =============================================================================

CREATE OR REPLACE VIEW public.v_publication_eligible_profiles
WITH (security_invoker = false)
AS
SELECT
  p.id                  AS profile_id,
  p.slug                AS profile_slug,
  p.account_user_id,
  p.status              AS profile_status,
  p.content_moderation_status,
  p.updated_at,
  a.id                  AS account_id,
  ci.id                 AS city_id
FROM public.professional_profiles p

-- Gate 1 + account linkage
JOIN public.account_users a
  ON a.id = p.account_user_id
  AND a.status = 'ACTIVE'

-- Gate 2: KYC verified identity + age
JOIN public.identity_verifications iv
  ON iv.account_user_id = a.id
  AND iv.status = 'VERIFIED'
  AND iv.identity_verified = TRUE
  AND iv.age_verified = TRUE

-- Gate 5: At least one active service location
JOIN public.professional_profile_locations ppl
  ON ppl.profile_id = p.id

JOIN public.marketplace_locations ml
  ON ml.id = ppl.location_id
  AND ml.active = TRUE

-- Get city for SEO/search city matching
JOIN public.cities ci
  ON ci.id = ml.city_id
  AND ci.active = TRUE

WHERE
  -- Gate 3: Profile data complete and not blocked
  p.status IN ('READY_FOR_REVIEW', 'ACTIVE')

  -- Gate 4: Content moderation approved
  AND p.content_moderation_status = 'APPROVED'

  -- Gate 6: At least one approved, non-deleted photo
  AND EXISTS (
    SELECT 1
    FROM public.profile_media pm
    WHERE pm.profile_id = p.id
      AND pm.status = 'APPROVED'
      AND pm.deleted_at IS NULL
  )

  -- Gate 8: Valid publication entitlement (time-aware)
  -- Satisfied by EITHER a valid subscription OR an active admin override
  AND (
    -- 8a: Valid subscription
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.account_user_id = a.id
        AND s.status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
        AND (
          -- ACTIVE: period must not have expired
          (s.status = 'ACTIVE'
            AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR
          -- PAST_DUE: provider retrying, keep visible
          (s.status = 'PAST_DUE')
          OR
          -- GRACE_PERIOD: must have a future grace_period_end
          (s.status = 'GRACE_PERIOD'
            AND s.grace_period_end IS NOT NULL
            AND s.grace_period_end > now())
        )
    )
    OR
    -- 8b: Active admin billing override
    EXISTS (
      SELECT 1
      FROM public.billing_overrides bo
      WHERE bo.account_user_id = a.id
        AND bo.revoked_at IS NULL
        AND (bo.expires_at IS NULL OR bo.expires_at > now())
    )
  );

-- Security: Only service_role can query this view.
-- anon and authenticated must NOT access it directly.
REVOKE ALL ON public.v_publication_eligible_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_publication_eligible_profiles TO service_role;

COMMENT ON VIEW public.v_publication_eligible_profiles IS
  'FASE 11 — Canonical publication eligibility view. The SINGLE authoritative source of truth
   for whether a professional profile is eligible for public visibility.
   All 8 publication gates are encoded here. Consumed by Search, SEO, Sitemap, Boost.
   service_role access only. NEVER expose directly to client roles.
   Time-aware: billing timestamps evaluated at query time. No cron required.
   Fail-closed: absent row = not eligible.';

-- =============================================================================
-- SECTION 2: CROSS-CITY LOCATION INTEGRITY (F11-SEC-005)
-- =============================================================================
--
-- Adds city-uniformity enforcement to save_profile_service_areas().
-- A profile's service areas must all belong to the same city.
-- This prevents cross-city location assignments that would corrupt
-- geographic search and boost targeting.
--
-- Preserves all existing validation:
--   - All locations exist and are active
--   - Primary location belongs to submitted set
--   - Atomic transaction
--   - Single primary location
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_profile_service_areas(
  p_profile_id UUID,
  p_location_ids UUID[],
  p_primary_location_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valid_count INTEGER;
  v_input_count INTEGER;
  v_city_count  INTEGER;
BEGIN
  v_input_count := array_length(p_location_ids, 1);

  -- 1. If location array is provided, validate counts and primary
  IF v_input_count IS NOT NULL AND v_input_count > 0 THEN
    -- Primary location is mandatory and must belong to p_location_ids
    IF p_primary_location_id IS NULL OR NOT (p_primary_location_id = ANY(p_location_ids)) THEN
      RAISE EXCEPTION 'A localização principal deve ser informada e estar contida nos bairros selecionados';
    END IF;

    -- Verify that all location IDs exist and are active
    SELECT count(id) INTO v_valid_count
    FROM public.marketplace_locations
    WHERE id = ANY(p_location_ids) AND active = TRUE;

    IF v_valid_count <> v_input_count THEN
      RAISE EXCEPTION 'Uma ou mais localizações informadas são inválidas ou inativas';
    END IF;

    -- F11-SEC-005: Verify that all locations belong to the SAME city
    -- A profile cannot span multiple cities.
    SELECT count(DISTINCT ml.city_id) INTO v_city_count
    FROM public.marketplace_locations ml
    WHERE ml.id = ANY(p_location_ids)
      AND ml.active = TRUE;

    IF v_city_count > 1 THEN
      RAISE EXCEPTION 'Todas as localizações de atendimento devem pertencer à mesma cidade';
    END IF;

  ELSE
    -- If empty, primary must be NULL
    IF p_primary_location_id IS NOT NULL THEN
      RAISE EXCEPTION 'Localização principal não pode ser definida para lista vazia';
    END IF;
  END IF;

  -- 2. Atomically delete previous relations for this profile
  DELETE FROM public.professional_profile_locations
  WHERE profile_id = p_profile_id;

  -- 3. Atomically batch insert the new service locations if non-empty
  IF v_input_count IS NOT NULL AND v_input_count > 0 THEN
    INSERT INTO public.professional_profile_locations (profile_id, location_id, is_primary)
    SELECT
      p_profile_id,
      loc_id,
      (loc_id = p_primary_location_id)
    FROM unnest(p_location_ids) AS loc_id;
  END IF;

  -- 4. Update profile updated_at timestamp
  UPDATE public.professional_profiles
  SET updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

-- Re-apply security grants (CREATE OR REPLACE may reset in some Postgres versions)
REVOKE ALL ON FUNCTION public.save_profile_service_areas(UUID, UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_service_areas(UUID, UUID[], UUID) TO service_role;

COMMENT ON FUNCTION public.save_profile_service_areas IS
  'FASE 11 (updated): Atomic transactional RPC to replace all service areas for a profile.
   Now enforces city-uniformity: all submitted location_ids must belong to the same city.
   Validates: locations exist + active, primary in set, same-city, atomic DELETE+INSERT.
   SECURITY DEFINER with fixed search_path. service_role only.';

-- =============================================================================
-- SECTION 3: profile_boosts DENY-ALL RLS CONSISTENCY (F11-SEC-010)
-- =============================================================================
--
-- DECISION: Migrate from implicit TO public to explicit TO authenticated.
-- Rationale: Project standard is explicit role matrix. TO authenticated is
-- more precise and documents deliberate intent. It does NOT reduce security
-- because anon has no GRANT SELECT on profile_boosts.
--
-- Re-create with explicit TO authenticated for standard consistency.
-- =============================================================================

-- Drop existing implicit-public deny policies
DROP POLICY IF EXISTS p_profile_boosts_deny_insert ON public.profile_boosts;
DROP POLICY IF EXISTS p_profile_boosts_deny_update ON public.profile_boosts;
DROP POLICY IF EXISTS p_profile_boosts_deny_delete ON public.profile_boosts;

-- Re-create with explicit TO authenticated (consistent with project role matrix)
CREATE POLICY p_profile_boosts_deny_insert
  ON public.profile_boosts FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY p_profile_boosts_deny_update
  ON public.profile_boosts FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY p_profile_boosts_deny_delete
  ON public.profile_boosts FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE public.profile_boosts IS
  'FASE 08: Sponsored boost campaigns for professional profiles.
   FASE 11: RLS deny-all policies updated to explicit TO authenticated
   for consistency with project role matrix. service_role has full access.';

-- =============================================================================
-- SECTION 4: MODERATION/REPORT TABLES DEFENSE-IN-DEPTH (F11-INFO-001)
-- =============================================================================
--
-- Tables already have REVOKE ALL FROM anon, authenticated.
-- RLS is enabled but has no explicit deny policies for client roles.
-- Adding explicit deny-all SELECT policies for defense-in-depth.
-- service_role operations are NOT affected (they bypass RLS).
-- =============================================================================

-- 4.1 media_moderation_reviews
DROP POLICY IF EXISTS p_media_moderation_reviews_deny_all_authenticated ON public.media_moderation_reviews;
CREATE POLICY p_media_moderation_reviews_deny_all_authenticated
  ON public.media_moderation_reviews FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS p_media_moderation_reviews_deny_all_anon ON public.media_moderation_reviews;
CREATE POLICY p_media_moderation_reviews_deny_all_anon
  ON public.media_moderation_reviews FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 4.2 profile_moderation_reviews
DROP POLICY IF EXISTS p_profile_moderation_reviews_deny_all_authenticated ON public.profile_moderation_reviews;
CREATE POLICY p_profile_moderation_reviews_deny_all_authenticated
  ON public.profile_moderation_reviews FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS p_profile_moderation_reviews_deny_all_anon ON public.profile_moderation_reviews;
CREATE POLICY p_profile_moderation_reviews_deny_all_anon
  ON public.profile_moderation_reviews FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 4.3 content_reports — deny SELECT for client roles
-- (service_role can INSERT via submitContentReportAction and admin can read)
DROP POLICY IF EXISTS p_content_reports_deny_select_authenticated ON public.content_reports;
CREATE POLICY p_content_reports_deny_select_authenticated
  ON public.content_reports FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS p_content_reports_deny_select_anon ON public.content_reports;
CREATE POLICY p_content_reports_deny_select_anon
  ON public.content_reports FOR SELECT
  TO anon
  USING (false);

-- Note: content_reports INSERT is already blocked (REVOKE ALL from client roles).
-- These explicit policies add a redundant deny layer for defense-in-depth.

COMMENT ON TABLE public.media_moderation_reviews IS
  'FASE 06: Media review audit trail. FASE 11: Explicit deny-all RLS for anon+authenticated added for defense-in-depth.';
COMMENT ON TABLE public.profile_moderation_reviews IS
  'FASE 06: Profile text review audit trail. FASE 11: Explicit deny-all RLS for anon+authenticated added for defense-in-depth.';
COMMENT ON TABLE public.content_reports IS
  'FASE 06: Public content reports. FASE 11: Explicit deny-all SELECT RLS for anon+authenticated added for defense-in-depth.';
