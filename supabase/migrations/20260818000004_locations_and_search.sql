-- =============================================================================
-- Migration: 20260818000004_locations_and_search.sql
-- FASE 04 — Locations, Search, Filters & Ranking Foundation
-- =============================================================================
-- Creates the geographic catalog tables (states, cities, locations), the N:N
-- relation professional_profile_locations with single-primary guarantee,
-- visibility-aware search indexes, and reproducible seed data for São Paulo.
--
-- DESIGN DECISIONS (FASE 04):
--
-- 1. Multi-City Geographic Hierarchy:
--    states -> cities -> locations (neighborhoods / commercial service areas).
--
-- 2. Single Primary Location Guarantee:
--    A partial unique index guarantees at database level that a profile has
--    at most ONE primary location (is_primary = true).
--
-- 3. No Residential Address / Full Privacy:
--    Only public service areas are stored. No street addresses or CEPs.
--
-- 4. Visibility-Aware Filtering & B-Tree Indexes:
--    Indexes created for fast lookup and filtered search queries in PostgreSQL.
--
-- 5. RLS & Grants:
--    Public catalog read; profile-location modifications restricted to server-side
--    Server Actions via service_role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES: Geographic Catalog
-- -----------------------------------------------------------------------------

CREATE TABLE public.states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        VARCHAR(2) NOT NULL UNIQUE, -- 'SP', 'RJ', etc.
  slug        TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id    UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_cities_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE public.locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id       UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  zone          TEXT NOT NULL, -- 'Zona Sul', 'Zona Oeste', 'Centro', 'Zona Leste', 'Zona Norte'
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_locations_city_slug UNIQUE (city_id, slug),
  CONSTRAINT chk_locations_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: professional_profile_locations (N:N)
-- -----------------------------------------------------------------------------

CREATE TABLE public.professional_profile_locations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  location_id           UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Uniqueness: a profile cannot add the same location multiple times
  CONSTRAINT uq_profile_locations_profile_location UNIQUE (profile_id, location_id)
);

-- Comments
COMMENT ON TABLE public.states IS 'Geographic states/provinces.';
COMMENT ON TABLE public.cities IS 'Geographic cities.';
COMMENT ON TABLE public.locations IS 'Public service neighborhoods / commercial areas.';
COMMENT ON TABLE public.professional_profile_locations IS 'Many-to-many link between advertiser profiles and service locations.';

-- Partial Unique Index: Exactly one primary location per profile
CREATE UNIQUE INDEX uq_idx_single_primary_location_per_profile
  ON public.professional_profile_locations (profile_id)
  WHERE is_primary = TRUE;

-- Indexes
CREATE INDEX idx_cities_state_id ON public.cities (state_id);
CREATE INDEX idx_locations_city_id ON public.locations (city_id);
CREATE INDEX idx_locations_slug ON public.locations (slug);
CREATE INDEX idx_locations_zone ON public.locations (zone);

CREATE INDEX idx_profile_locations_profile_id ON public.professional_profile_locations (profile_id);
CREATE INDEX idx_profile_locations_location_id ON public.professional_profile_locations (location_id);
CREATE INDEX idx_profile_locations_is_primary ON public.professional_profile_locations (profile_id, is_primary);

-- -----------------------------------------------------------------------------
-- 3. RLS & GRANTS
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profile_locations ENABLE ROW LEVEL SECURITY;

-- 3.1. Public Read for Geographic Catalog
CREATE POLICY "states_public_read" ON public.states FOR SELECT TO public USING (active = true);
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT TO public USING (active = true);
CREATE POLICY "locations_public_read" ON public.locations FOR SELECT TO public USING (active = true);

GRANT SELECT ON public.states TO anon, authenticated;
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.locations TO anon, authenticated;
GRANT ALL ON public.states TO service_role;
GRANT ALL ON public.cities TO service_role;
GRANT ALL ON public.locations TO service_role;

-- 3.2. Professional Profile Locations
CREATE POLICY "profile_locations_public_read"
  ON public.professional_profile_locations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "profile_locations_deny_client_insert"
  ON public.professional_profile_locations
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "profile_locations_deny_client_update"
  ON public.professional_profile_locations
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "profile_locations_deny_client_delete"
  ON public.professional_profile_locations
  FOR DELETE TO authenticated USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.professional_profile_locations FROM anon, authenticated;
GRANT SELECT ON public.professional_profile_locations TO anon, authenticated;
GRANT ALL ON public.professional_profile_locations TO service_role;

-- -----------------------------------------------------------------------------
-- 4. SEED DATA: São Paulo First (State, City & 25 Neighborhoods)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_state_id UUID;
  v_city_id  UUID;
BEGIN
  -- 1. Insert State: São Paulo (SP)
  INSERT INTO public.states (name, code, slug, active)
  VALUES ('São Paulo', 'SP', 'sao-paulo', TRUE)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_state_id;

  -- 2. Insert City: São Paulo
  INSERT INTO public.cities (state_id, name, slug, active)
  VALUES (v_state_id, 'São Paulo', 'sao-paulo', TRUE)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_city_id;

  -- 3. Insert 25 Curated Neighborhoods in São Paulo
  -- Zona Sul
  INSERT INTO public.locations (city_id, name, slug, zone, display_order) VALUES
    (v_city_id, 'Moema', 'moema', 'Zona Sul', 1),
    (v_city_id, 'Vila Mariana', 'vila-mariana', 'Zona Sul', 2),
    (v_city_id, 'Campo Belo', 'campo-belo', 'Zona Sul', 3),
    (v_city_id, 'Itaim Bibi', 'itaim-bibi', 'Zona Sul', 4),
    (v_city_id, 'Vila Olímpia', 'vila-olimpia', 'Zona Sul', 5),
    (v_city_id, 'Brooklin', 'brooklin', 'Zona Sul', 6),
    (v_city_id, 'Santo Amaro', 'santo-amaro', 'Zona Sul', 7),
    (v_city_id, 'Morumbi', 'morumbi', 'Zona Sul', 8),
    (v_city_id, 'Saúde', 'saude', 'Zona Sul', 9),

  -- Zona Oeste
    (v_city_id, 'Pinheiros', 'pinheiros', 'Zona Oeste', 10),
    (v_city_id, 'Jardins', 'jardins', 'Zona Oeste', 11),
    (v_city_id, 'Vila Madalena', 'vila-madalena', 'Zona Oeste', 12),
    (v_city_id, 'Perdizes', 'perdizes', 'Zona Oeste', 13),
    (v_city_id, 'Lapa', 'lapa', 'Zona Oeste', 14),
    (v_city_id, 'Barra Funda', 'barra-funda', 'Zona Oeste', 15),

  -- Centro
    (v_city_id, 'Bela Vista', 'bela-vista', 'Centro', 16),
    (v_city_id, 'Consolação', 'consolacao', 'Centro', 17),
    (v_city_id, 'República', 'republica', 'Centro', 18),
    (v_city_id, 'Higienópolis', 'higienopolis', 'Centro', 19),

  -- Zona Leste
    (v_city_id, 'Tatuapé', 'tatuape', 'Zona Leste', 20),
    (v_city_id, 'Anália Franco', 'analia-franco', 'Zona Leste', 21),
    (v_city_id, 'Mooca', 'mooca', 'Zona Leste', 22),

  -- Zona Norte
    (v_city_id, 'Santana', 'santana', 'Zona Norte', 23),
    (v_city_id, 'Tucuruvi', 'tucuruvi', 'Zona Norte', 24),
    (v_city_id, 'Casa Verde', 'casa-verde', 'Zona Norte', 25)
  ON CONFLICT (city_id, slug) DO NOTHING;

END $$;
