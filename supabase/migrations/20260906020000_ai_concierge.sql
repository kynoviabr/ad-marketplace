-- ============================================================================
-- PX5 — AI Concierge Foundation
-- ============================================================================

-- 1. Professional Concierge Settings
CREATE TABLE public.professional_concierge_settings (
  profile_id UUID PRIMARY KEY REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  assistant_display_name TEXT NOT NULL DEFAULT 'Assistente Virtual',
  welcome_message TEXT NOT NULL DEFAULT 'Olá! Sou a assistente virtual da Velvet. Como posso ajudar com dúvidas sobre este perfil?',
  tone TEXT NOT NULL DEFAULT 'PROFESSIONAL' CHECK (tone IN ('PROFESSIONAL', 'WARM', 'DIRECT', 'DISCREET')),
  qualification_enabled BOOLEAN NOT NULL DEFAULT true,
  handoff_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Controlled Custom FAQs
CREATE TABLE public.professional_concierge_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(trim(question)) > 0 AND char_length(question) <= 200),
  answer TEXT NOT NULL CHECK (char_length(trim(answer)) > 0 AND char_length(answer) <= 1000),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_faqs_profile
  ON public.professional_concierge_faqs (profile_id, sort_order ASC);

-- 3. Concierge Conversations (Channel-neutral, session-scoped)
CREATE TABLE public.concierge_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'INTERNAL_TEST' CHECK (channel IN ('INTERNAL_TEST', 'WEB_PUBLIC', 'WHATSAPP_OFFICIAL')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HANDOFF_REQUESTED', 'HANDOFF_COMPLETED', 'CLOSED')),
  visitor_session_id TEXT NOT NULL,
  is_test BOOLEAN NOT NULL DEFAULT false,
  qualification JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handoff_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_conversations_profile
  ON public.concierge_conversations (profile_id, last_message_at DESC);

CREATE INDEX idx_concierge_conversations_session
  ON public.concierge_conversations (visitor_session_id);

-- 4. Concierge Messages (Role-bounded, privacy-safe, no model reasoning traces)
CREATE TABLE public.concierge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.concierge_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('VISITOR', 'ASSISTANT', 'PROFESSIONAL', 'SYSTEM')),
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'HANDOFF_NOTE', 'QUALIFICATION_NOTE')),
  content TEXT NOT NULL CHECK (char_length(content) <= 4000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_concierge_messages_conv_created
  ON public.concierge_messages (conversation_id, created_at ASC);

-- 5. Triggers for updated_at
CREATE TRIGGER trg_concierge_settings_updated_at
  BEFORE UPDATE ON public.professional_concierge_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_concierge_faqs_updated_at
  BEFORE UPDATE ON public.professional_concierge_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_concierge_conversations_updated_at
  BEFORE UPDATE ON public.concierge_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Row Level Security & Strict Table Privileges
ALTER TABLE public.professional_concierge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_concierge_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.professional_concierge_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.professional_concierge_faqs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.concierge_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.concierge_messages FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.professional_concierge_settings TO service_role;
GRANT ALL ON public.professional_concierge_faqs TO service_role;
GRANT ALL ON public.concierge_conversations TO service_role;
GRANT ALL ON public.concierge_messages TO service_role;

COMMENT ON TABLE public.professional_concierge_settings IS
  'PX5: Professional-level AI concierge configuration and behavior parameters.';
COMMENT ON TABLE public.professional_concierge_faqs IS
  'PX5: Controlled custom FAQ items for the AI concierge context.';
COMMENT ON TABLE public.concierge_conversations IS
  'PX5: Channel-neutral concierge session ledgers with qualification and handoff tracking.';
COMMENT ON TABLE public.concierge_messages IS
  'PX5: Privacy-safe message history for concierge conversations (no reasoning traces).';
