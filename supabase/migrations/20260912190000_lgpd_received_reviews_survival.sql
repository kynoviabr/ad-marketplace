-- =============================================================================
-- Migration: 20260912190000_lgpd_received_reviews_survival.sql
-- LGPD-02B — Received Reviews Survival & Cascade Protection
-- =============================================================================
-- Ensures received reviews written by third parties survive profile deletion
-- by setting ON DELETE SET NULL on professional_reviews.professional_profile_id.
-- =============================================================================

ALTER TABLE public.professional_reviews
  ALTER COLUMN professional_profile_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professional_reviews_professional_profile_id_fkey'
      AND table_name = 'professional_reviews'
  ) THEN
    ALTER TABLE public.professional_reviews
      DROP CONSTRAINT professional_reviews_professional_profile_id_fkey,
      ADD CONSTRAINT professional_reviews_professional_profile_id_fkey
        FOREIGN KEY (professional_profile_id) REFERENCES public.professional_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.professional_review_responses
  ALTER COLUMN professional_account_user_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professional_review_responses_professional_account_user_id_fkey'
      AND table_name = 'professional_review_responses'
  ) THEN
    ALTER TABLE public.professional_review_responses
      DROP CONSTRAINT professional_review_responses_professional_account_user_id_fkey,
      ADD CONSTRAINT professional_review_responses_professional_account_user_id_fkey
        FOREIGN KEY (professional_account_user_id) REFERENCES public.account_users(id) ON DELETE SET NULL;
  END IF;
END $$;
