-- =============================================================================
-- FASE 09: Analytics, Event Tracking & Conversion Measurement Foundation
-- Migration: 20260818000009_analytics_and_event_tracking.sql
-- =============================================================================

-- 1. Canonical Raw Event Store
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key           TEXT, -- Idempotency key for server lifecycle events (e.g. boost_activated:<id>)
  event_type          TEXT NOT NULL,
  occurred_at         TIMESTAMPTZ NOT NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Subject / Entity Relations
  profile_id          UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  city_id             UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  location_id         UUID REFERENCES public.marketplace_locations(id) ON DELETE SET NULL,

  -- Placement & Attribution (Server-Validated Only)
  placement_type      TEXT,
  boost_campaign_id   UUID REFERENCES public.profile_boosts(id) ON DELETE SET NULL,

  -- Search Context
  result_page         SMALLINT,
  result_position     SMALLINT,
  total_profiles      INTEGER,
  sponsored_count     SMALLINT,
  has_filters         BOOLEAN,

  -- Anonymous / Pseudonymous Session Context (Never exposed to advertisers)
  visitor_session_id  UUID,
  referrer_type       TEXT,

  -- Integrity Constraints
  CONSTRAINT chk_analytics_events_type CHECK (
    event_type IN (
      'SEARCH_PERFORMED',
      'PROFILE_IMPRESSION',
      'PROFILE_VIEWED',
      'CONTACT_WHATSAPP_CLICKED',
      'CONTACT_PHONE_CLICKED',
      'CONTACT_TELEGRAM_CLICKED',
      'BOOST_ACTIVATED'
    )
  ),
  CONSTRAINT chk_analytics_placement_type CHECK (
    placement_type IS NULL OR placement_type IN ('ORGANIC', 'SPONSORED')
  ),
  CONSTRAINT chk_analytics_referrer_type CHECK (
    referrer_type IS NULL OR referrer_type IN ('SEARCH', 'DIRECT', 'OTHER')
  ),
  CONSTRAINT chk_analytics_occurred_sanity CHECK (
    occurred_at <= (now() + INTERVAL '1 day')
  )
);

-- Partial unique index for server lifecycle event idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_server_event_key
  ON public.analytics_events (event_key)
  WHERE event_key IS NOT NULL;

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_profile_type_occurred
  ON public.analytics_events (profile_id, event_type, occurred_at DESC)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_campaign_type_occurred
  ON public.analytics_events (boost_campaign_id, event_type, occurred_at DESC)
  WHERE boost_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_city_type_occurred
  ON public.analytics_events (city_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_session_occurred
  ON public.analytics_events (visitor_session_id, occurred_at)
  WHERE visitor_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_received_at_brin
  ON public.analytics_events USING BRIN (received_at);

-- 2. Daily Aggregate Tables
CREATE TABLE IF NOT EXISTS public.profile_daily_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  metric_date           DATE NOT NULL,

  impressions_total     INTEGER NOT NULL DEFAULT 0,
  impressions_organic   INTEGER NOT NULL DEFAULT 0,
  impressions_sponsored INTEGER NOT NULL DEFAULT 0,

  views_total           INTEGER NOT NULL DEFAULT 0,
  views_organic         INTEGER NOT NULL DEFAULT 0,
  views_sponsored       INTEGER NOT NULL DEFAULT 0,

  whatsapp_clicks       INTEGER NOT NULL DEFAULT 0,
  phone_clicks          INTEGER NOT NULL DEFAULT 0,
  telegram_clicks       INTEGER NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_profile_daily_metrics UNIQUE (profile_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_profile_daily_metrics_lookup
  ON public.profile_daily_metrics (profile_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS public.platform_daily_metrics (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date               DATE NOT NULL UNIQUE,

  searches_total            INTEGER NOT NULL DEFAULT 0,
  searches_with_filters     INTEGER NOT NULL DEFAULT 0,
  searches_zero_results     INTEGER NOT NULL DEFAULT 0,

  impressions_total         INTEGER NOT NULL DEFAULT 0,
  impressions_organic       INTEGER NOT NULL DEFAULT 0,
  impressions_sponsored     INTEGER NOT NULL DEFAULT 0,

  views_total               INTEGER NOT NULL DEFAULT 0,

  whatsapp_clicks_total     INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks_organic   INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks_sponsored INTEGER NOT NULL DEFAULT 0,

  active_advertisers        INTEGER,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Least-Privilege Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access to raw events.
-- Ingestion and queries MUST be executed via server-side DAL using createAdminClient().
DROP POLICY IF EXISTS "No direct client access to analytics_events" ON public.analytics_events;
CREATE POLICY "No direct client access to analytics_events"
  ON public.analytics_events FOR ALL
  TO public
  USING (false);

-- Advertisers may read their own sanitized daily aggregates
DROP POLICY IF EXISTS "Advertisers read own profile_daily_metrics" ON public.profile_daily_metrics;
CREATE POLICY "Advertisers read own profile_daily_metrics"
  ON public.profile_daily_metrics FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.professional_profiles
      WHERE account_user_id = (
        SELECT id FROM public.account_users
        WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Admins read all daily aggregates
DROP POLICY IF EXISTS "Admins read all profile_daily_metrics" ON public.profile_daily_metrics;
CREATE POLICY "Admins read all profile_daily_metrics"
  ON public.profile_daily_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins read platform_daily_metrics" ON public.platform_daily_metrics;
CREATE POLICY "Admins read platform_daily_metrics"
  ON public.platform_daily_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Grants
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON public.profile_daily_metrics TO service_role;
GRANT ALL ON public.platform_daily_metrics TO service_role;

GRANT SELECT ON public.profile_daily_metrics TO authenticated;
GRANT SELECT ON public.platform_daily_metrics TO authenticated;
