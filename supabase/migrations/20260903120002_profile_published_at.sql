-- Additive: add published_at to professional_profiles for authoritative publication recency.
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.professional_profiles
  SET published_at = updated_at
  WHERE status = 'ACTIVE' AND published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_professional_profiles_published_at
  ON public.professional_profiles (published_at DESC)
  WHERE published_at IS NOT NULL;
