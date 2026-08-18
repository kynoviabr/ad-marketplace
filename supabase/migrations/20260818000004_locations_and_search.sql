-- =============================================================================
-- Migration: 20260818000004_locations_and_search.sql
-- FASE 04 — Locations, Search, Filters & Ranking Foundation (Hardened)
-- =============================================================================
-- Creates the normalized geographic hierarchy (countries, states, cities,
-- marketplace_locations), the N:N relation professional_profile_locations,
-- the hardened atomic save_profile_service_areas RPC, search indexes, RLS,
-- strict grants, and seed data for São Paulo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES: Geographic Catalog
-- -----------------------------------------------------------------------------

-- 1.1. Countries
CREATE TABLE IF NOT EXISTS public.countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        VARCHAR(2) NOT NULL UNIQUE, -- 'BR'
  slug        TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2. States
CREATE TABLE IF NOT EXISTS public.states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        VARCHAR(2) NOT NULL, -- 'SP', 'RJ'
  slug        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_states_country_code UNIQUE (country_id, code),
  CONSTRAINT uq_states_country_slug UNIQUE (country_id, slug)
);

-- 1.3. Cities
CREATE TABLE IF NOT EXISTS public.cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id    UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cities_state_slug UNIQUE (state_id, slug),
  CONSTRAINT chk_cities_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- 1.4. Marketplace Locations (Public Service Areas)
CREATE TABLE IF NOT EXISTS public.marketplace_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id       UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  zone          TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'NEIGHBORHOOD',
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_marketplace_locations_city_slug UNIQUE (city_id, slug),
  CONSTRAINT chk_marketplace_locations_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT chk_marketplace_locations_zone CHECK (zone IN ('Zona Sul', 'Zona Oeste', 'Centro', 'Zona Leste', 'Zona Norte')),
  CONSTRAINT chk_marketplace_locations_type CHECK (location_type IN ('NEIGHBORHOOD', 'COMMERCIAL_DISTRICT', 'METRO_REGION'))
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: professional_profile_locations (N:N Join Table)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_profile_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  location_id   UUID NOT NULL REFERENCES public.marketplace_locations(id) ON DELETE RESTRICT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_profile_locations_profile_location UNIQUE (profile_id, location_id)
);

-- Partial Unique Index: Exactly one primary location per profile at database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_single_primary_location_per_profile
  ON public.professional_profile_locations (profile_id)
  WHERE is_primary = TRUE;

-- -----------------------------------------------------------------------------
-- 3. ESSENTIAL NON-REDUNDANT INDEXES (Justified by Real Queries)
-- -----------------------------------------------------------------------------

-- 3.1. Filter locations by zone within a city
CREATE INDEX IF NOT EXISTS idx_locations_zone ON public.marketplace_locations (zone);

-- 3.2. Reverse lookup: Find all profiles servicing a specific marketplace location (Critical for Search)
CREATE INDEX IF NOT EXISTS idx_profile_locations_location_id ON public.professional_profile_locations (location_id);

-- Note:
-- - `(profile_id, location_id)` is already indexed by `uq_profile_locations_profile_location`.
-- - `(city_id, slug)` is already indexed by `uq_marketplace_locations_city_slug`.
-- - `(state_id, slug)` is already indexed by `uq_cities_state_slug`.
-- - `(country_id, code)` is already indexed by `uq_states_country_code`.
-- Redundant indexes leading with these columns were explicitly avoided.

-- -----------------------------------------------------------------------------
-- 4. HARDENED ATOMIC TRANSACTIONAL RPC: save_profile_service_areas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_profile_service_areas(
  p_profile_id UUID,
  p_location_ids UUID[],
  p_primary_location_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valid_count INTEGER;
  v_input_count INTEGER;
BEGIN
  v_input_count := array_length(p_location_ids, 1);

  -- 1. If location array is provided, validate counts and primary
  IF v_input_count IS NOT NULL AND v_input_count > 0 THEN
    -- Primary location is mandatory and must belong to p_location_ids
    IF p_primary_location_id IS NULL OR NOT (p_primary_location_id = ANY(p_location_ids)) THEN
      RAISE EXCEPTION 'A localização principal deve ser informada e estar contida nos bairros selecionados';
    END IF;

    -- Verify that all location IDs exist and are active
    SELECT count(id) INTO v_valid_count
    FROM public.marketplace_locations
    WHERE id = ANY(p_location_ids) AND active = TRUE;

    IF v_valid_count <> v_input_count THEN
      RAISE EXCEPTION 'Uma ou mais localizações informadas são inválidas ou inativas';
    END IF;
  ELSE
    -- If empty, primary must be NULL
    IF p_primary_location_id IS NOT NULL THEN
      RAISE EXCEPTION 'Localização principal não pode ser definida para lista vazia';
    END IF;
  END IF;

  -- 2. Atomically delete previous relations for this profile
  DELETE FROM public.professional_profile_locations
  WHERE profile_id = p_profile_id;

  -- 3. Atomically batch insert the new service locations if non-empty
  IF v_input_count IS NOT NULL AND v_input_count > 0 THEN
    INSERT INTO public.professional_profile_locations (profile_id, location_id, is_primary)
    SELECT
      p_profile_id,
      loc_id,
      (loc_id = p_primary_location_id)
    FROM unnest(p_location_ids) AS loc_id;
  END IF;

  -- 4. Update profile updated_at timestamp
  UPDATE public.professional_profiles
  SET updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

-- Security Hardening: Revoke public/client execution; allow only service_role
REVOKE ALL ON FUNCTION public.save_profile_service_areas(UUID, UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_service_areas(UUID, UUID[], UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. RLS & GRANTS MATRIX
-- -----------------------------------------------------------------------------

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profile_locations ENABLE ROW LEVEL SECURITY;

-- 5.1. Geographic Catalog: Public Read
DROP POLICY IF EXISTS "countries_public_read" ON public.countries;
CREATE POLICY "countries_public_read" ON public.countries FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "states_public_read" ON public.states;
CREATE POLICY "states_public_read" ON public.states FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT TO public USING (active = true);

DROP POLICY IF EXISTS "locations_public_read" ON public.marketplace_locations;
CREATE POLICY "locations_public_read" ON public.marketplace_locations FOR SELECT TO public USING (active = true);

GRANT SELECT ON public.countries TO anon, authenticated;
GRANT SELECT ON public.states TO anon, authenticated;
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.marketplace_locations TO anon, authenticated;

GRANT ALL ON public.countries TO service_role;
GRANT ALL ON public.states TO service_role;
GRANT ALL ON public.cities TO service_role;
GRANT ALL ON public.marketplace_locations TO service_role;

-- 5.2. Professional Profile Locations: No direct client mutations or raw anon queries
DROP POLICY IF EXISTS "profile_locations_deny_client_insert" ON public.professional_profile_locations;
CREATE POLICY "profile_locations_deny_client_insert" ON public.professional_profile_locations FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "profile_locations_deny_client_update" ON public.professional_profile_locations;
CREATE POLICY "profile_locations_deny_client_update" ON public.professional_profile_locations FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "profile_locations_deny_client_delete" ON public.professional_profile_locations;
CREATE POLICY "profile_locations_deny_client_delete" ON public.professional_profile_locations FOR DELETE TO authenticated USING (false);

REVOKE ALL ON public.professional_profile_locations FROM anon, authenticated;
GRANT ALL ON public.professional_profile_locations TO service_role;

-- -----------------------------------------------------------------------------
-- 6. SEED DATA: São Paulo First (Brasil -> SP -> São Paulo -> 25 Bairros)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_country_id UUID;
  v_state_id   UUID;
  v_city_id    UUID;
BEGIN
  -- 1. Country: Brasil
  INSERT INTO public.countries (name, code, slug, active)
  VALUES ('Brasil', 'BR', 'brasil', TRUE)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_country_id;

  -- 2. State: São Paulo (SP)
  INSERT INTO public.states (country_id, name, code, slug, active)
  VALUES (v_country_id, 'São Paulo', 'SP', 'sao-paulo', TRUE)
  ON CONFLICT (country_id, code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_state_id;

  -- 3. City: São Paulo
  INSERT INTO public.cities (state_id, name, slug, active)
  VALUES (v_state_id, 'São Paulo', 'sao-paulo', TRUE)
  ON CONFLICT (state_id, slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_city_id;

  -- 4. Insert Exactly 25 Public Service Areas in São Paulo
  INSERT INTO public.marketplace_locations (city_id, name, slug, zone, location_type, display_order) VALUES
    -- Zona Sul (9)
    (v_city_id, 'Moema', 'moema', 'Zona Sul', 'NEIGHBORHOOD', 1),
    (v_city_id, 'Vila Mariana', 'vila-mariana', 'Zona Sul', 'NEIGHBORHOOD', 2),
    (v_city_id, 'Campo Belo', 'campo-belo', 'Zona Sul', 'NEIGHBORHOOD', 3),
    (v_city_id, 'Itaim Bibi', 'itaim-bibi', 'Zona Sul', 'NEIGHBORHOOD', 4),
    (v_city_id, 'Vila Olímpia', 'vila-olimpia', 'Zona Sul', 'NEIGHBORHOOD', 5),
    (v_city_id, 'Brooklin', 'brooklin', 'Zona Sul', 'NEIGHBORHOOD', 6),
    (v_city_id, 'Santo Amaro', 'santo-amaro', 'Zona Sul', 'NEIGHBORHOOD', 7),
    (v_city_id, 'Morumbi', 'morumbi', 'Zona Sul', 'NEIGHBORHOOD', 8),
    (v_city_id, 'Saúde', 'saude', 'Zona Sul', 'NEIGHBORHOOD', 9),

    -- Zona Oeste (6)
    (v_city_id, 'Pinheiros', 'pinheiros', 'Zona Oeste', 'NEIGHBORHOOD', 10),
    (v_city_id, 'Jardins', 'jardins', 'Zona Oeste', 'COMMERCIAL_DISTRICT', 11),
    (v_city_id, 'Vila Madalena', 'vila-madalena', 'Zona Oeste', 'NEIGHBORHOOD', 12),
    (v_city_id, 'Perdizes', 'perdizes', 'Zona Oeste', 'NEIGHBORHOOD', 13),
    (v_city_id, 'Lapa', 'lapa', 'Zona Oeste', 'NEIGHBORHOOD', 14),
    (v_city_id, 'Barra Funda', 'barra-funda', 'Zona Oeste', 'NEIGHBORHOOD', 15),

    -- Centro (4)
    (v_city_id, 'Bela Vista', 'bela-vista', 'Centro', 'NEIGHBORHOOD', 16),
    (v_city_id, 'Consolação', 'consolacao', 'Centro', 'NEIGHBORHOOD', 17),
    (v_city_id, 'República', 'republica', 'Centro', 'NEIGHBORHOOD', 18),
    (v_city_id, 'Higienópolis', 'higienopolis', 'Centro', 'NEIGHBORHOOD', 19),

    -- Zona Leste (3)
    (v_city_id, 'Tatuapé', 'tatuape', 'Zona Leste', 'NEIGHBORHOOD', 20),
    (v_city_id, 'Anália Franco', 'analia-franco', 'Zona Leste', 'COMMERCIAL_DISTRICT', 21),
    (v_city_id, 'Mooca', 'mooca', 'Zona Leste', 'NEIGHBORHOOD', 22),

    -- Zona Norte (3)
    (v_city_id, 'Santana', 'santana', 'Zona Norte', 'NEIGHBORHOOD', 23),
    (v_city_id, 'Tucuruvi', 'tucuruvi', 'Zona Norte', 'NEIGHBORHOOD', 24),
    (v_city_id, 'Casa Verde', 'casa-verde', 'Zona Norte', 'NEIGHBORHOOD', 25)
  ON CONFLICT (city_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    zone = EXCLUDED.zone,
    location_type = EXCLUDED.location_type,
    display_order = EXCLUDED.display_order;

END $$;
