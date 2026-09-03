-- R10 monetization and entitlement normalization.
-- Additive only: no existing rows or constraints are changed.

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS display_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.plan_entitlements
  ADD COLUMN IF NOT EXISTS value_text TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- The legacy status column remains intact for backwards compatibility. New
-- provider-neutral lifecycle state is optional so existing rows are untouched.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_state TEXT
  CHECK (subscription_state IS NULL OR subscription_state IN (
    'FREE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED'
  ));

CREATE INDEX IF NOT EXISTS idx_subscriptions_neutral_state
  ON public.subscriptions (subscription_state)
  WHERE subscription_state IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_user_id UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  entitlement_code TEXT NOT NULL CHECK (entitlement_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  value_int INT,
  value_bool BOOLEAN,
  value_text TEXT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 3 AND 500),
  granted_by UUID NOT NULL REFERENCES public.account_users(id),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.account_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_overrides_single_value CHECK (
    num_nonnulls(value_int, value_bool, value_text) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_active
  ON public.entitlement_overrides (account_user_id, entitlement_code)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.billing_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_user_id UUID NOT NULL REFERENCES public.account_users(id),
  target_account_user_id UUID NOT NULL REFERENCES public.account_users(id),
  action TEXT NOT NULL CHECK (action IN (
    'FOUNDER_GRANTED', 'FOUNDER_REVOKED',
    'ENTITLEMENT_OVERRIDE_GRANTED', 'ENTITLEMENT_OVERRIDE_REVOKED'
  )),
  subject_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_admin_audit_target
  ON public.billing_admin_audit_logs (target_account_user_id, created_at DESC);

ALTER TABLE public.entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entitlement_overrides FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.billing_admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.entitlement_overrides TO service_role;
GRANT ALL ON public.billing_admin_audit_logs TO service_role;

INSERT INTO public.subscription_plans (
  code, name, description, is_active, sort_order, display_metadata
) VALUES (
  'FREE', 'Gratuito', 'Presença básica sem cobrança ou checkout.', TRUE, 0,
  '{"badge":"FREE","cta":"UPGRADE_PLACEHOLDER"}'::jsonb
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plan_prices (
  plan_id, price_code, currency, amount_minor, billing_interval,
  is_active, is_promotional
)
SELECT id, 'FREE', 'BRL', 0, 'MONTH', TRUE, FALSE
FROM public.subscription_plans WHERE code = 'FREE'
ON CONFLICT (plan_id, price_code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_int)
SELECT id, entitlement.code, entitlement.value_int
FROM public.subscription_plans
CROSS JOIN (VALUES
  ('MAX_PHOTOS', 10),
  ('MAX_VIDEOS', 3),
  ('MAX_SERVICE_AREAS', 5)
) AS entitlement(code, value_int)
WHERE subscription_plans.code = 'FREE'
ON CONFLICT (plan_id, code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_bool)
SELECT id, entitlement.code, entitlement.value_bool
FROM public.subscription_plans
CROSS JOIN (VALUES
  ('PROFILE_PUBLICATION', FALSE),
  ('REVIEWS_ACCESS', TRUE),
  ('PREMIUM_FEATURES', FALSE),
  ('WHATSAPP_AI', FALSE),
  ('FOUNDER_STATUS', FALSE)
) AS entitlement(code, value_bool)
WHERE subscription_plans.code = 'FREE'
ON CONFLICT (plan_id, code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_int)
SELECT id, 'MAX_VIDEOS', 3 FROM public.subscription_plans WHERE code = 'FOUNDER'
ON CONFLICT (plan_id, code) DO NOTHING;

INSERT INTO public.plan_entitlements (plan_id, code, value_bool)
SELECT id, entitlement.code, entitlement.value_bool
FROM public.subscription_plans
CROSS JOIN (VALUES
  ('REVIEWS_ACCESS', TRUE),
  ('PREMIUM_FEATURES', TRUE),
  ('WHATSAPP_AI', FALSE),
  ('FOUNDER_STATUS', TRUE)
) AS entitlement(code, value_bool)
WHERE subscription_plans.code = 'FOUNDER'
ON CONFLICT (plan_id, code) DO NOTHING;
