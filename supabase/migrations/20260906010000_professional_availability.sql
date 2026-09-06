-- ============================================================================
-- PX3 — Professional Availability and Agenda Foundation
-- ============================================================================

-- 1. Settings table: per-profile scheduling parameters and operating preferences
CREATE TABLE public.professional_availability_settings (
  profile_id UUID PRIMARY KEY REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 480),
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes > 0 AND slot_interval_minutes <= 240),
  minimum_notice_minutes INTEGER NOT NULL DEFAULT 120 CHECK (minimum_notice_minutes >= 0 AND minimum_notice_minutes <= 10080),
  maximum_advance_days INTEGER NOT NULL DEFAULT 30 CHECK (maximum_advance_days > 0 AND maximum_advance_days <= 90),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 120),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Weekly schedule table: recurring availability windows by day of week
-- day_of_week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
CREATE TABLE public.professional_weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id UUID REFERENCES public.marketplace_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_weekly_time_window CHECK (start_time < end_time)
);

CREATE INDEX idx_weekly_avail_profile_dow
  ON public.professional_weekly_availability (profile_id, day_of_week);

CREATE INDEX idx_weekly_avail_profile_loc
  ON public.professional_weekly_availability (profile_id, location_id);

-- 3. Date-specific exceptions table: closed days, blocked intervals, or custom hours
CREATE TABLE public.professional_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('CLOSED_DAY', 'BLOCKED_INTERVAL', 'CUSTOM_HOURS')),
  start_time TIME,
  end_time TIME,
  location_id UUID REFERENCES public.marketplace_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_exception_time_consistency CHECK (
    (exception_type = 'CLOSED_DAY' AND start_time IS NULL AND end_time IS NULL) OR
    (exception_type IN ('BLOCKED_INTERVAL', 'CUSTOM_HOURS') AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX idx_avail_exceptions_lookup
  ON public.professional_availability_exceptions (profile_id, exception_date);

CREATE INDEX idx_avail_exceptions_profile_loc
  ON public.professional_availability_exceptions (profile_id, location_id);

-- 4. Trigger for updated_at on settings
CREATE TRIGGER trg_availability_settings_updated_at
  BEFORE UPDATE ON public.professional_availability_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Atomic RPC: transactional save of weekly availability rules
CREATE OR REPLACE FUNCTION public.save_professional_weekly_availability(
  p_profile_id UUID,
  p_rules JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_dow SMALLINT;
  v_start TIME;
  v_end TIME;
  v_loc_id UUID;
BEGIN
  -- Validate profile exists
  IF NOT EXISTS (SELECT 1 FROM public.professional_profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Professional profile % not found', p_profile_id;
  END IF;

  -- Validate input is a JSON array
  IF p_rules IS NULL OR jsonb_typeof(p_rules) <> 'array' THEN
    RAISE EXCEPTION 'Rules parameter must be a JSON array';
  END IF;

  -- Temporary staging table to validate rules and check overlaps
  CREATE TEMP TABLE _staged_weekly_rules (
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location_id UUID
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_rules)
  LOOP
    v_dow := (v_item->>'day_of_week')::SMALLINT;
    v_start := (v_item->>'start_time')::TIME;
    v_end := (v_item->>'end_time')::TIME;
    v_loc_id := CASE 
      WHEN v_item->>'location_id' IS NOT NULL AND v_item->>'location_id' <> '' 
      THEN (v_item->>'location_id')::UUID 
      ELSE NULL 
    END;

    IF v_dow IS NULL OR v_dow < 0 OR v_dow > 6 THEN
      RAISE EXCEPTION 'day_of_week must be an integer between 0 and 6';
    END IF;

    IF v_start IS NULL OR v_end IS NULL THEN
      RAISE EXCEPTION 'start_time and end_time are required';
    END IF;

    IF v_start >= v_end THEN
      RAISE EXCEPTION 'start_time (%) must be strictly before end_time (%)', v_start, v_end;
    END IF;

    IF v_loc_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.marketplace_locations WHERE id = v_loc_id) THEN
      RAISE EXCEPTION 'Location % not found', v_loc_id;
    END IF;

    -- Check for overlap with already staged rules for same day and location scope
    IF EXISTS (
      SELECT 1 FROM _staged_weekly_rules r
      WHERE r.day_of_week = v_dow
        AND (r.location_id IS NOT DISTINCT FROM v_loc_id)
        AND (v_start < r.end_time AND v_end > r.start_time)
    ) THEN
      RAISE EXCEPTION 'Overlapping time windows detected for day % on location %', v_dow, v_loc_id;
    END IF;

    INSERT INTO _staged_weekly_rules (day_of_week, start_time, end_time, location_id)
    VALUES (v_dow, v_start, v_end, v_loc_id);
  END LOOP;

  -- Atomic replace: delete previous rules for this profile and insert validated rules
  DELETE FROM public.professional_weekly_availability
  WHERE profile_id = p_profile_id;

  INSERT INTO public.professional_weekly_availability (profile_id, day_of_week, start_time, end_time, location_id)
  SELECT p_profile_id, day_of_week, start_time, end_time, location_id
  FROM _staged_weekly_rules;

  DROP TABLE _staged_weekly_rules;
END;
$$;

-- 6. Row Level Security and Grants
ALTER TABLE public.professional_availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability_exceptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.professional_availability_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.professional_weekly_availability FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.professional_availability_exceptions FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.professional_availability_settings TO service_role;
GRANT ALL ON public.professional_weekly_availability TO service_role;
GRANT ALL ON public.professional_availability_exceptions TO service_role;

REVOKE ALL ON FUNCTION public.save_professional_weekly_availability(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_professional_weekly_availability(UUID, JSONB) TO service_role;

COMMENT ON TABLE public.professional_availability_settings IS
  'PX3: Professional scheduling settings (slot duration, notice, limits, buffers).';
COMMENT ON TABLE public.professional_weekly_availability IS
  'PX3: Recurring weekly availability windows by day of week.';
COMMENT ON TABLE public.professional_availability_exceptions IS
  'PX3: Date-specific availability overrides (closed days, blocked intervals, custom hours).';
