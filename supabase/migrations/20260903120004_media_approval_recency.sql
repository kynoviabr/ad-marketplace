-- Preserve the first authoritative approval timestamp for photos and videos.
-- Existing rows are not backfilled; content without proven approval time is
-- intentionally excluded from the "new content" feed.
CREATE FUNCTION public.set_first_media_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'APPROVED' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := COALESCE(NEW.created_at, now());
    END IF;
  ELSIF OLD.approved_at IS NOT NULL THEN
    NEW.approved_at := OLD.approved_at;
  ELSIF OLD.status IS DISTINCT FROM 'APPROVED' AND NEW.status = 'APPROVED' THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_media_first_approval
  BEFORE INSERT OR UPDATE ON public.profile_media
  FOR EACH ROW EXECUTE FUNCTION public.set_first_media_approved_at();

CREATE TRIGGER trg_profile_video_first_approval
  BEFORE INSERT OR UPDATE ON public.profile_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_first_media_approved_at();

REVOKE ALL ON FUNCTION public.set_first_media_approved_at() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_profile_media_approved_at
  ON public.profile_media (approved_at DESC)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_videos_approved_at
  ON public.profile_videos (approved_at DESC)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;
