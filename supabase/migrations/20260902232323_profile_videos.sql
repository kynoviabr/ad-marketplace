-- R9: private, moderated professional profile videos. Additive only.
DO $$
DECLARE
  existing_bucket storage.buckets%ROWTYPE;
  required_mime_types text[] := ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/webp'];
BEGIN
  SELECT * INTO existing_bucket FROM storage.buckets WHERE id = 'profile-videos';

  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('profile-videos', 'profile-videos', false, 52428800, required_mime_types);
  ELSIF existing_bucket.name <> 'profile-videos'
     OR existing_bucket.public IS DISTINCT FROM false
     OR existing_bucket.file_size_limit IS DISTINCT FROM 52428800
     OR existing_bucket.allowed_mime_types IS DISTINCT FROM required_mime_types THEN
    RAISE EXCEPTION 'Existing profile-videos bucket configuration is incompatible (name %, public %, file_size_limit %, allowed_mime_types %)',
      existing_bucket.name, existing_bucket.public, existing_bucket.file_size_limit, existing_bucket.allowed_mime_types;
  END IF;
END $$;

CREATE TABLE public.profile_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  poster_storage_path text NOT NULL UNIQUE,
  duration_seconds numeric(6,3),
  file_size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  position integer NOT NULL DEFAULT 1,
  status public.media_status NOT NULL DEFAULT 'UPLOADING',
  moderated_by uuid REFERENCES public.account_users(id),
  moderation_reason text,
  moderated_at timestamptz,
  approved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_videos_path CHECK (storage_path ~ ('^profiles/' || profile_id::text || '/[0-9a-f-]+\\.(mp4|webm)$')),
  CONSTRAINT profile_videos_poster_path CHECK (poster_storage_path ~ ('^profiles/' || profile_id::text || '/[0-9a-f-]+-poster\\.(jpg|webp)$')),
  CONSTRAINT profile_videos_mime CHECK (mime_type IN ('video/mp4', 'video/webm')),
  CONSTRAINT profile_videos_size CHECK (file_size_bytes BETWEEN 1 AND 52428800),
  CONSTRAINT profile_videos_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0 AND duration_seconds <= 30.05),
  CONSTRAINT profile_videos_position CHECK (position BETWEEN 1 AND 3)
);

CREATE INDEX profile_videos_profile_idx ON public.profile_videos(profile_id, position) WHERE deleted_at IS NULL;
CREATE INDEX profile_videos_pending_idx ON public.profile_videos(created_at) WHERE status = 'PENDING_MODERATION' AND deleted_at IS NULL;

CREATE FUNCTION public.enforce_profile_video_limit() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND (SELECT count(*) FROM public.profile_videos WHERE profile_id=NEW.profile_id AND deleted_at IS NULL AND id<>NEW.id) >= 3 THEN
    RAISE EXCEPTION 'profile video limit exceeded';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profile_videos_limit BEFORE INSERT OR UPDATE OF deleted_at, profile_id ON public.profile_videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_video_limit();
CREATE TRIGGER profile_videos_updated_at BEFORE UPDATE ON public.profile_videos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.reorder_profile_videos(p_profile_id uuid, p_video_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE i integer;
BEGIN
  IF coalesce(array_length(p_video_ids,1),0) NOT BETWEEN 1 AND 3 OR
     (SELECT count(*) FROM public.profile_videos WHERE profile_id=p_profile_id AND deleted_at IS NULL) <> array_length(p_video_ids,1) OR
     (SELECT count(DISTINCT id) FROM public.profile_videos WHERE profile_id=p_profile_id AND deleted_at IS NULL AND id=ANY(p_video_ids)) <> array_length(p_video_ids,1)
  THEN RAISE EXCEPTION 'invalid video ordering'; END IF;
  FOR i IN 1..array_length(p_video_ids,1) LOOP
    UPDATE public.profile_videos SET position=i WHERE id=p_video_ids[i] AND profile_id=p_profile_id AND deleted_at IS NULL;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.reorder_profile_videos(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_profile_videos(uuid,uuid[]) TO service_role;

CREATE TABLE public.profile_video_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES public.profile_videos(id) ON DELETE CASCADE,
  moderator_account_user_id uuid NOT NULL REFERENCES public.account_users(id), decision text NOT NULL CHECK(decision IN ('APPROVE','REJECT')),
  reason text, created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_video_moderation_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_videos' AND policyname='profile_videos_select_own') THEN
    CREATE POLICY profile_videos_select_own ON public.profile_videos FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.professional_profiles p JOIN public.account_users a ON a.id=p.account_user_id
              WHERE p.id=profile_id AND a.auth_user_id=auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_videos' AND policyname='profile_videos_deny_insert') THEN
    CREATE POLICY profile_videos_deny_insert ON public.profile_videos FOR INSERT TO authenticated WITH CHECK(false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_videos' AND policyname='profile_videos_deny_update') THEN
    CREATE POLICY profile_videos_deny_update ON public.profile_videos FOR UPDATE TO authenticated USING(false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profile_videos' AND policyname='profile_videos_deny_delete') THEN
    CREATE POLICY profile_videos_deny_delete ON public.profile_videos FOR DELETE TO authenticated USING(false);
  END IF;
END $$;
REVOKE ALL ON public.profile_videos, public.profile_video_moderation_events FROM anon, authenticated;
GRANT SELECT ON public.profile_videos TO authenticated;
GRANT ALL ON public.profile_videos, public.profile_video_moderation_events TO service_role;

-- Storage remains private and has no client policy. All access is server-authorized
-- through short-lived signed URLs. Existing storage policies are never modified.
