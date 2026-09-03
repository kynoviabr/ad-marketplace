ALTER TABLE public.profile_videos
  DROP CONSTRAINT profile_videos_path,
  DROP CONSTRAINT profile_videos_poster_path,
  ADD CONSTRAINT profile_videos_path CHECK (
    storage_path ~ ('^profiles/' || profile_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](mp4|webm)$')
  ),
  ADD CONSTRAINT profile_videos_poster_path CHECK (
    poster_storage_path ~ ('^profiles/' || profile_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-poster[.](jpg|webp)$')
  );
