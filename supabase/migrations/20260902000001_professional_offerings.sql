-- VELVET R7 — structured professional offering taxonomy (v1)

CREATE TYPE public.professional_offering_group AS ENUM ('AUDIENCE', 'SERVICES', 'LOCATIONS', 'AVAILABILITY');
CREATE TYPE public.professional_offering_status AS ENUM ('OFFERED', 'NOT_OFFERED', 'UNSPECIFIED');

CREATE TABLE public.professional_offering_options (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  group_code public.professional_offering_group NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_code, sort_order)
);

CREATE TABLE public.professional_profile_offerings (
  profile_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  option_code text NOT NULL REFERENCES public.professional_offering_options(code) ON DELETE RESTRICT,
  status public.professional_offering_status NOT NULL DEFAULT 'UNSPECIFIED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, option_code)
);

CREATE INDEX idx_profile_offerings_search
  ON public.professional_profile_offerings (option_code, status, profile_id)
  WHERE status = 'OFFERED';

INSERT INTO public.professional_offering_options (code, group_code, sort_order) VALUES
  ('audience_men', 'AUDIENCE', 1),
  ('audience_women', 'AUDIENCE', 2),
  ('audience_couples', 'AUDIENCE', 3),
  ('service_gfe', 'SERVICES', 1),
  ('service_kissing', 'SERVICES', 2),
  ('service_massage', 'SERVICES', 3),
  ('service_striptease', 'SERVICES', 4),
  ('service_toys', 'SERVICES', 5),
  ('service_fetishes', 'SERVICES', 6),
  ('service_bdsm', 'SERVICES', 7),
  ('service_oral', 'SERVICES', 8),
  ('service_anal', 'SERVICES', 9),
  ('location_own', 'LOCATIONS', 1),
  ('location_hotel_motel', 'LOCATIONS', 2),
  ('location_outcall', 'LOCATIONS', 3),
  ('availability_overnight', 'AVAILABILITY', 1),
  ('availability_day', 'AVAILABILITY', 2),
  ('availability_events', 'AVAILABILITY', 3),
  ('availability_travel', 'AVAILABILITY', 4);

-- Existing profiles explicitly start as UNSPECIFIED; no real offering is inferred.
INSERT INTO public.professional_profile_offerings (profile_id, option_code, status)
SELECT profile.id, option.code, 'UNSPECIFIED'::public.professional_offering_status
FROM public.professional_profiles profile
CROSS JOIN public.professional_offering_options option
ON CONFLICT (profile_id, option_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.initialize_profile_offerings()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  INSERT INTO public.professional_profile_offerings (profile_id, option_code, status)
  SELECT NEW.id, code, 'UNSPECIFIED'::public.professional_offering_status
  FROM public.professional_offering_options WHERE active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_initialize_profile_offerings
AFTER INSERT ON public.professional_profiles
FOR EACH ROW EXECUTE FUNCTION public.initialize_profile_offerings();

CREATE OR REPLACE FUNCTION public.backfill_new_offering_option()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  INSERT INTO public.professional_profile_offerings (profile_id, option_code, status)
  SELECT id, NEW.code, 'UNSPECIFIED'::public.professional_offering_status
  FROM public.professional_profiles
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_backfill_new_offering_option
AFTER INSERT ON public.professional_offering_options
FOR EACH ROW EXECUTE FUNCTION public.backfill_new_offering_option();

CREATE TRIGGER trg_offering_options_updated_at
BEFORE UPDATE ON public.professional_offering_options
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profile_offerings_updated_at
BEFORE UPDATE ON public.professional_profile_offerings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.save_professional_profile_offerings(
  p_profile_id uuid,
  p_offerings jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  item record;
BEGIN
  IF jsonb_typeof(p_offerings) <> 'object' THEN
    RAISE EXCEPTION 'offerings must be a JSON object';
  END IF;
  FOR item IN SELECT key, value #>> '{}' AS status FROM jsonb_each(p_offerings)
  LOOP
    IF item.status NOT IN ('OFFERED', 'NOT_OFFERED', 'UNSPECIFIED') THEN
      RAISE EXCEPTION 'invalid offering status for %', item.key;
    END IF;
    INSERT INTO public.professional_profile_offerings (profile_id, option_code, status)
    VALUES (p_profile_id, item.key, item.status::public.professional_offering_status)
    ON CONFLICT (profile_id, option_code) DO UPDATE
      SET status = EXCLUDED.status, updated_at = now();
  END LOOP;
END;
$$;

ALTER TABLE public.professional_offering_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profile_offerings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_offering_options FROM anon, authenticated;
REVOKE ALL ON public.professional_profile_offerings FROM anon, authenticated;
GRANT ALL ON public.professional_offering_options TO service_role;
GRANT ALL ON public.professional_profile_offerings TO service_role;
REVOKE ALL ON FUNCTION public.save_professional_profile_offerings(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_profile_offerings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backfill_new_offering_option() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_professional_profile_offerings(uuid, jsonb) TO service_role;

COMMENT ON TABLE public.professional_profile_offerings IS
  'Server-only tri-state professional offering data. Public surfaces expose OFFERED only.';
