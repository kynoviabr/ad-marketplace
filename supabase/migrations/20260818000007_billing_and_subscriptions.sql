-- =============================================================================
-- Migration: 20260818000007_billing_and_subscriptions.sql
-- FASE 07 — Monetization, Subscriptions & Payment Gateway Foundation
-- =============================================================================
-- Creates billing domain tables: subscription_plans, plan_prices,
-- plan_entitlements, subscriptions, billing_webhook_events, billing_overrides.
-- Seeds FOUNDER plan with LAUNCH_FREE and FOUNDING prices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLE: subscription_plans
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
  ON public.subscription_plans (is_active) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 2. TABLE: plan_prices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_prices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  price_code       TEXT NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'BRL',
  amount_minor     INT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'MONTH'
                   CHECK (billing_interval IN ('MONTH', 'YEAR')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_promotional   BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_plan_prices_amount_non_negative CHECK (amount_minor >= 0),
  CONSTRAINT chk_plan_prices_currency_len CHECK (length(currency) = 3),
  CONSTRAINT chk_plan_prices_temporal_integrity CHECK (
    valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from
  ),
  CONSTRAINT uq_plan_prices_code UNIQUE (plan_id, price_code)
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_plan_active
  ON public.plan_prices (plan_id) WHERE is_active = TRUE;

-- -----------------------------------------------------------------------------
-- 3. TABLE: plan_entitlements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  value_int  INT,
  value_bool BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_plan_entitlements UNIQUE (plan_id, code)
);

-- -----------------------------------------------------------------------------
-- 4. TABLE: subscriptions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id           UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  price_id                  UUID NOT NULL REFERENCES public.plan_prices(id) ON DELETE RESTRICT,

  -- Provider references (NULL for free-launch subscriptions)
  provider                  TEXT,
  provider_customer_id      TEXT,
  provider_subscription_id  TEXT,

  -- Subscription state (no TRIALING, no CANCELED — see plan v1.1)
  status                    TEXT NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN (
                              'ACTIVE',
                              'PAST_DUE',
                              'GRACE_PERIOD',
                              'INCOMPLETE',
                              'EXPIRED'
                            )),

  -- Billing period
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,

  -- Cancellation (flags on ACTIVE status, not a separate state)
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at               TIMESTAMPTZ,
  cancellation_reason       TEXT,

  -- Grace period
  grace_period_end          TIMESTAMPTZ,

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one non-terminal subscription per account.
-- EXPIRED rows are excluded to preserve history.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_active_per_account
  ON public.subscriptions (account_user_id)
  WHERE status IN ('ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE');

-- Provider reference uniqueness (only when provider is present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_provider_ref
  ON public.subscriptions (provider, provider_subscription_id)
  WHERE provider IS NOT NULL AND provider_subscription_id IS NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_account
  ON public.subscriptions (account_user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions (current_period_end)
  WHERE status = 'ACTIVE' AND cancel_at_period_end = TRUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_end
  ON public.subscriptions (grace_period_end)
  WHERE status = 'GRACE_PERIOD';

-- -----------------------------------------------------------------------------
-- 5. TABLE: billing_webhook_events
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            TEXT NOT NULL,
  provider_event_id   TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  subscription_id     UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  processing_status   TEXT NOT NULL DEFAULT 'RECEIVED'
                      CHECK (processing_status IN ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  error_code          TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,

  CONSTRAINT uq_billing_webhook_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_sub
  ON public.billing_webhook_events (subscription_id);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_status
  ON public.billing_webhook_events (processing_status)
  WHERE processing_status IN ('RECEIVED', 'FAILED');

-- -----------------------------------------------------------------------------
-- 6. TABLE: billing_overrides
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id  UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  granted_by       UUID NOT NULL REFERENCES public.account_users(id),
  expires_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  revoked_by       UUID REFERENCES public.account_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_overrides_active
  ON public.billing_overrides (account_user_id)
  WHERE revoked_at IS NULL;

-- -----------------------------------------------------------------------------
-- 7. RLS & GRANTS
-- -----------------------------------------------------------------------------

-- subscription_plans: Public-readable active plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_active_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

-- plan_prices: Public-readable active prices
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_active_prices" ON public.plan_prices
  FOR SELECT USING (is_active = TRUE);
GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT ALL ON public.plan_prices TO service_role;

-- plan_entitlements: Public-readable
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_entitlements" ON public.plan_entitlements
  FOR SELECT USING (TRUE);
GRANT SELECT ON public.plan_entitlements TO anon, authenticated;
GRANT ALL ON public.plan_entitlements TO service_role;

-- subscriptions: service_role ONLY
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- billing_webhook_events: service_role ONLY
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_webhook_events FROM anon, authenticated;
GRANT ALL ON public.billing_webhook_events TO service_role;

-- billing_overrides: service_role ONLY
ALTER TABLE public.billing_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_overrides FROM anon, authenticated;
GRANT ALL ON public.billing_overrides TO service_role;

-- -----------------------------------------------------------------------------
-- 8. SEED: FOUNDER Plan + Prices + Entitlements
-- -----------------------------------------------------------------------------

INSERT INTO public.subscription_plans (code, name, description, sort_order)
VALUES (
  'FOUNDER',
  'Plano Fundadora',
  'Plano especial para as primeiras profissionais da plataforma. Preço de lançamento exclusivo.',
  1
)
ON CONFLICT (code) DO NOTHING;

-- LAUNCH_FREE price (R$ 0,00)
INSERT INTO public.plan_prices (plan_id, price_code, currency, amount_minor, billing_interval, is_active, is_promotional)
SELECT id, 'LAUNCH_FREE', 'BRL', 0, 'MONTH', TRUE, TRUE
FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, price_code) DO NOTHING;

-- FOUNDING price (R$ 99,99)
INSERT INTO public.plan_prices (plan_id, price_code, currency, amount_minor, billing_interval, is_active, is_promotional)
SELECT id, 'FOUNDING', 'BRL', 9999, 'MONTH', TRUE, TRUE
FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, price_code) DO NOTHING;

-- Entitlements
INSERT INTO public.plan_entitlements (plan_id, code, value_int)
SELECT id, 'MAX_PHOTOS', 10
FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_int)
SELECT id, 'MAX_SERVICE_AREAS', 5
FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_bool)
SELECT id, 'PROFILE_PUBLICATION', TRUE
FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, code) DO NOTHING;
