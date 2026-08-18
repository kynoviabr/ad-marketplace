-- =============================================================================
-- Migration: 20260818000008_boosts_and_sponsored_placement.sql
-- FASE 08 — Boosts & Additional Monetization Foundation
-- =============================================================================
-- Creates the visibility products catalog (boost_products, boost_prices),
-- the campaign management table (profile_boosts) with concurrency-safe
-- temporal overlap prevention via PostgreSQL exclusion constraints,
-- performance indexes, RLS policies, and seed data for São Paulo.
-- =============================================================================

-- Enable btree_gist extension for multi-column exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- -----------------------------------------------------------------------------
-- 1. TABLE: boost_products
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.boost_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  scope_type      TEXT NOT NULL CHECK (scope_type IN ('CITY', 'MARKETPLACE_LOCATION')),
  duration_hours  INT NOT NULL CHECK (duration_hours > 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boost_products_active
  ON public.boost_products (is_active) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 2. TABLE: boost_prices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.boost_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_product_id  UUID NOT NULL REFERENCES public.boost_products(id) ON DELETE RESTRICT,
  price_code        TEXT NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'BRL',
  amount_minor      INT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_promotional    BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_boost_prices_amount_non_negative CHECK (amount_minor >= 0),
  CONSTRAINT chk_boost_prices_currency_len CHECK (length(currency) = 3),
  CONSTRAINT chk_boost_prices_temporal_integrity CHECK (
    valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from
  ),
  CONSTRAINT uq_boost_prices_product_code UNIQUE (boost_product_id, price_code)
);

CREATE INDEX IF NOT EXISTS idx_boost_prices_product_active
  ON public.boost_prices (boost_product_id) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 3. TABLE: profile_boosts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_boosts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  boost_product_id      UUID NOT NULL REFERENCES public.boost_products(id) ON DELETE RESTRICT,
  boost_price_id        UUID NOT NULL REFERENCES public.boost_prices(id) ON DELETE RESTRICT,
  scope_type            TEXT NOT NULL CHECK (scope_type IN ('CITY', 'MARKETPLACE_LOCATION')),
  city_id               UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  location_id           UUID REFERENCES public.marketplace_locations(id) ON DELETE RESTRICT,
  -- Synthetic column for NULL-safe exclusion constraint (00000000-0000-0000-0000-000000000000 represents CITY scope / no location)
  effective_location_id UUID GENERATED ALWAYS AS (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
                        CHECK (status IN ('PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELED', 'FAILED')),
  provider              TEXT,
  provider_payment_id   TEXT,
  canceled_at           TIMESTAMPTZ,
  canceled_by           UUID REFERENCES public.account_users(id),
  cancellation_reason   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_profile_boosts_location_scope CHECK (
    (scope_type = 'MARKETPLACE_LOCATION' AND location_id IS NOT NULL) OR
    (scope_type = 'CITY' AND location_id IS NULL)
  ),
  CONSTRAINT chk_profile_boosts_time_validity CHECK (ends_at > starts_at),

  -- Concurrency-safe temporal exclusion constraint:
  -- Prevents overlapping active/scheduled/pending campaigns for the same profile, scope, city, and location
  CONSTRAINT ex_profile_boosts_no_temporal_overlap EXCLUDE USING gist (
    profile_id WITH =,
    scope_type WITH =,
    city_id WITH =,
    effective_location_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE'))
);

-- Composite performance indexes for search resolution
CREATE INDEX IF NOT EXISTS idx_profile_boosts_city_active
  ON public.profile_boosts (city_id, status, starts_at, ends_at)
  WHERE status IN ('ACTIVE', 'SCHEDULED');

CREATE INDEX IF NOT EXISTS idx_profile_boosts_location_active
  ON public.profile_boosts (location_id, status, starts_at, ends_at)
  WHERE location_id IS NOT NULL AND status IN ('ACTIVE', 'SCHEDULED');

CREATE INDEX IF NOT EXISTS idx_profile_boosts_profile_status
  ON public.profile_boosts (profile_id, status);

-- -----------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.boost_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

-- Products & Prices: Publicly readable when active
CREATE POLICY p_boost_products_select_active
  ON public.boost_products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY p_boost_prices_select_active
  ON public.boost_prices FOR SELECT
  USING (is_active = TRUE);

-- Profile Boosts: Authenticated users can view their own profile's campaigns
CREATE POLICY p_profile_boosts_select_own
  ON public.profile_boosts FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT p.id FROM public.professional_profiles p
      JOIN public.account_users a ON a.id = p.account_user_id
      WHERE a.auth_user_id = auth.uid()
    )
  );

-- Direct client mutation is blocked (Deny-all for INSERT, UPDATE, DELETE)
CREATE POLICY p_profile_boosts_deny_insert ON public.profile_boosts FOR INSERT WITH CHECK (false);
CREATE POLICY p_profile_boosts_deny_update ON public.profile_boosts FOR UPDATE USING (false);
CREATE POLICY p_profile_boosts_deny_delete ON public.profile_boosts FOR DELETE USING (false);

-- -----------------------------------------------------------------------------
-- 5. GRANTS
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.boost_products TO anon, authenticated;
GRANT SELECT ON public.boost_prices TO anon, authenticated;
GRANT SELECT ON public.profile_boosts TO authenticated;

-- Service role has full DML privileges
GRANT ALL PRIVILEGES ON public.boost_products TO service_role;
GRANT ALL PRIVILEGES ON public.boost_prices TO service_role;
GRANT ALL PRIVILEGES ON public.profile_boosts TO service_role;

-- -----------------------------------------------------------------------------
-- 6. SEED DATA (São Paulo MVP Products & Commercial Placeholders)
-- -----------------------------------------------------------------------------

-- 6.1. Seed Boost Products
INSERT INTO public.boost_products (code, name, description, scope_type, duration_hours, is_active, sort_order)
VALUES
  ('BOOST_CITY_24H', 'Destaque Cidade 24 Horas', 'Destaque prioritário na busca de toda a cidade de São Paulo por 24 horas.', 'CITY', 24, TRUE, 1),
  ('BOOST_CITY_7D', 'Destaque Cidade 7 Dias', 'Destaque prioritário na busca de toda a cidade de São Paulo por 7 dias.', 'CITY', 168, TRUE, 2),
  ('BOOST_LOCATION_24H', 'Destaque Bairro 24 Horas', 'Destaque prioritário na busca do seu bairro por 24 horas.', 'MARKETPLACE_LOCATION', 24, TRUE, 3),
  ('BOOST_LOCATION_7D', 'Destaque Bairro 7 Dias', 'Destaque prioritário na busca do seu bairro por 7 dias.', 'MARKETPLACE_LOCATION', 168, TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- 6.2. Seed Boost Prices (Placeholders for DEV/Testing — NOT Final Production Pricing)
INSERT INTO public.boost_prices (boost_product_id, price_code, currency, amount_minor, is_active, is_promotional)
SELECT id, 'STANDARD_24H', 'BRL', 2990, TRUE, FALSE
FROM public.boost_products WHERE code = 'BOOST_CITY_24H'
ON CONFLICT (boost_product_id, price_code) DO NOTHING;

INSERT INTO public.boost_prices (boost_product_id, price_code, currency, amount_minor, is_active, is_promotional)
SELECT id, 'STANDARD_7D', 'BRL', 9990, TRUE, FALSE
FROM public.boost_products WHERE code = 'BOOST_CITY_7D'
ON CONFLICT (boost_product_id, price_code) DO NOTHING;

INSERT INTO public.boost_prices (boost_product_id, price_code, currency, amount_minor, is_active, is_promotional)
SELECT id, 'STANDARD_24H', 'BRL', 1490, TRUE, FALSE
FROM public.boost_products WHERE code = 'BOOST_LOCATION_24H'
ON CONFLICT (boost_product_id, price_code) DO NOTHING;

INSERT INTO public.boost_prices (boost_product_id, price_code, currency, amount_minor, is_active, is_promotional)
SELECT id, 'STANDARD_7D', 'BRL', 4990, TRUE, FALSE
FROM public.boost_products WHERE code = 'BOOST_LOCATION_7D'
ON CONFLICT (boost_product_id, price_code) DO NOTHING;
