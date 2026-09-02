-- VELVET R8 — normalized, moderated reviews. Additive only.
CREATE TYPE public.professional_review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.review_report_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

CREATE TABLE public.professional_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  reviewer_account_user_id UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR length(trim(comment)) BETWEEN 1 AND 2000),
  moderation_status public.professional_review_status NOT NULL DEFAULT 'PENDING',
  moderation_reason TEXT CHECK (moderation_reason IS NULL OR length(moderation_reason) <= 1000),
  moderated_by UUID REFERENCES public.account_users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_professional_review_reviewer_profile UNIQUE (professional_profile_id, reviewer_account_user_id)
);

CREATE TABLE public.professional_review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL UNIQUE REFERENCES public.professional_reviews(id) ON DELETE CASCADE,
  professional_account_user_id UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (length(trim(response)) BETWEEN 1 AND 2000),
  moderation_status public.professional_review_status NOT NULL DEFAULT 'PENDING',
  moderation_reason TEXT CHECK (moderation_reason IS NULL OR length(moderation_reason) <= 1000),
  moderated_by UUID REFERENCES public.account_users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.professional_reviews(id) ON DELETE CASCADE,
  reporter_account_user_id UUID NOT NULL REFERENCES public.account_users(id) ON DELETE CASCADE,
  reason_category TEXT NOT NULL CHECK (reason_category IN ('HARASSMENT', 'FALSE_OR_MISLEADING', 'PERSONAL_INFORMATION', 'HATE_OR_VIOLENCE', 'SPAM', 'OTHER')),
  description TEXT CHECK (description IS NULL OR length(description) <= 1000),
  status public.review_report_status NOT NULL DEFAULT 'OPEN',
  resolved_by UUID REFERENCES public.account_users(id),
  resolution_notes TEXT CHECK (resolution_notes IS NULL OR length(resolution_notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT uq_review_report_reporter UNIQUE (review_id, reporter_account_user_id)
);

CREATE TABLE public.professional_review_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.professional_reviews(id) ON DELETE CASCADE,
  response_id UUID REFERENCES public.professional_review_responses(id) ON DELETE CASCADE,
  moderator_account_user_id UUID NOT NULL REFERENCES public.account_users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('REVIEW', 'RESPONSE')),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVE', 'REJECT')),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 1000),
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_review_moderation_target CHECK (
    (target_type = 'REVIEW' AND response_id IS NULL) OR
    (target_type = 'RESPONSE' AND response_id IS NOT NULL)
  )
);

CREATE INDEX idx_professional_reviews_public ON public.professional_reviews (professional_profile_id, created_at DESC) WHERE moderation_status = 'APPROVED';
CREATE INDEX idx_professional_reviews_pending ON public.professional_reviews (created_at) WHERE moderation_status = 'PENDING';
CREATE INDEX idx_professional_reviews_reviewer ON public.professional_reviews (reviewer_account_user_id);
CREATE INDEX idx_review_responses_owner ON public.professional_review_responses (professional_account_user_id);
CREATE INDEX idx_review_responses_pending ON public.professional_review_responses (created_at) WHERE moderation_status = 'PENDING';
CREATE INDEX idx_review_reports_open ON public.review_reports (created_at) WHERE status IN ('OPEN', 'IN_REVIEW');
CREATE INDEX idx_review_moderation_events_review ON public.professional_review_moderation_events (review_id, created_at DESC);

CREATE TRIGGER trg_professional_reviews_updated_at BEFORE UPDATE ON public.professional_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_professional_review_responses_updated_at BEFORE UPDATE ON public.professional_review_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_review_moderation_events ENABLE ROW LEVEL SECURITY;

-- All access is mediated by authenticated Server Actions/DAL using service_role.
-- This avoids exposing reviewer identifiers through the Data API.
REVOKE ALL ON TABLE public.professional_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.professional_review_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.review_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.professional_review_moderation_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.professional_reviews TO service_role;
GRANT ALL ON TABLE public.professional_review_responses TO service_role;
GRANT ALL ON TABLE public.review_reports TO service_role;
GRANT ALL ON TABLE public.professional_review_moderation_events TO service_role;

COMMENT ON TABLE public.professional_reviews IS 'One moderated customer review per account/profile; reviewer identity is never public.';
COMMENT ON TABLE public.professional_review_moderation_events IS 'Immutable audit trail integrated with the existing admin moderation domain.';
