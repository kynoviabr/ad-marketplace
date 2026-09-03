-- Additive: authoritative, immutable first-publication timestamp.
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Existing ACTIVE rows are intentionally not backfilled: there is no reliable
-- historical publication timestamp, and updated_at would falsely promote an
-- old edited profile as newly published.
CREATE FUNCTION public.set_profile_first_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'ACTIVE' AND NEW.published_at IS NULL THEN
      NEW.published_at := COALESCE(NEW.created_at, now());
    END IF;
  ELSIF OLD.published_at IS NOT NULL THEN
    NEW.published_at := OLD.published_at;
  ELSIF OLD.status IS DISTINCT FROM 'ACTIVE' AND NEW.status = 'ACTIVE' THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_first_published_at
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_first_published_at();

REVOKE ALL ON FUNCTION public.set_profile_first_published_at() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_professional_profiles_published_at
  ON public.professional_profiles (published_at DESC)
  WHERE published_at IS NOT NULL;
