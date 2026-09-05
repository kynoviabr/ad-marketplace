-- PX2A: Professional Analytics 2.0 — Measurement Integrity, Funnel & Aggregation Foundation
-- Extends profile_daily_metrics with location and hourly breakdowns stored as JSONB.

ALTER TABLE public.profile_daily_metrics
  ADD COLUMN IF NOT EXISTS location_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hourly_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profile_daily_metrics.location_breakdown IS
  'Array of location metrics [{ location_id, impressions, views, contacts }] for the day in America/Sao_Paulo';

COMMENT ON COLUMN public.profile_daily_metrics.hourly_breakdown IS
  'Map of hour 0..23 to metrics { "0": { impressions, views, contacts }, ... } in America/Sao_Paulo';
