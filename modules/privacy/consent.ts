/**
 * CONSENT & LEGAL ACCEPTANCE INVENTORY — VELVET
 *
 * Phase: LGPD-01
 * Audits all consent and contract acceptance capture mechanisms across Velvet.
 *
 * Distinctions maintained:
 * - Terms of Use: Contractual agreement / adhesion (Art. 7, V / Marco Civil).
 * - Privacy Policy: Informational transparency acknowledgment (Art. 9).
 * - Cookie Consent: Specific browser-level preference (Art. 7, I).
 * - Concierge Enablement: Advertiser feature configuration opt-in.
 */

export interface ConsentMechanismItem {
  mechanismId: string
  legalNature: 'EXPLICIT_CONSENT' | 'CONTRACTUAL_ACCEPTANCE' | 'POLICY_ACKNOWLEDGMENT' | 'FEATURE_CONFIG_OPT_IN'
  displayName: string
  whereCaptured: string
  versionField: string
  currentVersion: string
  timestampField: string
  actor: 'VISITOR' | 'ADVERTISER' | 'CLIENT'
  revocationSupported: boolean
  revocationMechanism: string
  auditEvidenceLocation: string
  technicalDetails: string
}

export const CONSENT_INVENTORY: readonly ConsentMechanismItem[] = [
  {
    mechanismId: 'COOKIE_ANALYTICS_CONSENT',
    legalNature: 'EXPLICIT_CONSENT',
    displayName: 'Consentimento de Cookies de Análise (Analytics)',
    whereCaptured: 'components/compliance/public-compliance-layer.tsx (Public Cookie Banner / Preferences Modal)',
    versionField: 'version (in cookie payload)',
    currentVersion: 'r6-v1',
    timestampField: 'updatedAt (in cookie payload)',
    actor: 'VISITOR',
    revocationSupported: true,
    revocationMechanism: "Window event 'velvet:open-cookie-preferences' resets cookie preferences; toggles analytics to false and clears localStorage keys.",
    auditEvidenceLocation: 'Client-side cookie velvet_cookie_consent (HTTP header / document.cookie).',
    technicalDetails: 'Necessary cookies are strictly true; analytics cookies are user-toggleable (default false); marketing cookies are hardcoded false.',
  },
  {
    mechanismId: 'ADULT_AGE_DECLARATION',
    legalNature: 'EXPLICIT_CONSENT',
    displayName: 'Declaração de Maioridade (Acesso Adulto 18+)',
    whereCaptured: 'components/compliance/public-compliance-layer.tsx (Adult Gate Modal)',
    versionField: 'N/A',
    currentVersion: '1.0',
    timestampField: 'Cookie Max-Age (180 days from set)',
    actor: 'VISITOR',
    revocationSupported: true,
    revocationMechanism: 'Clearing browser cookies or expired cookie re-prompts the modal.',
    auditEvidenceLocation: 'Cookie velvet_adult_access=true.',
    technicalDetails: 'Blocks access to public marketplace pages with inert modal overlay until user confirms age >= 18.',
  },
  {
    mechanismId: 'TERMS_OF_USE_ACCEPTANCE',
    legalNature: 'CONTRACTUAL_ACCEPTANCE',
    displayName: 'Aceite dos Termos de Uso (Contrato de Adesão)',
    whereCaptured: 'app/(auth)/signup/page.tsx, modules/auth/actions.ts (Signup & Email OTP flows)',
    versionField: 'account_users.terms_version',
    currentVersion: '1.0 (CURRENT_TERMS_VERSION in lib/config/legal-versions.ts)',
    timestampField: 'account_users.terms_accepted_at',
    actor: 'ADVERTISER',
    revocationSupported: false,
    revocationMechanism: 'Contractual agreement. Termination is executed via account closure/deletion request, not unilateral consent revocation.',
    auditEvidenceLocation: 'Database row public.account_users(terms_version, terms_accepted_at).',
    technicalDetails: 'Enforced server-side: if terms_version is NULL, the user is blocked from operational access and redirected to complete registration.',
  },
  {
    mechanismId: 'PRIVACY_POLICY_ACKNOWLEDGMENT',
    legalNature: 'POLICY_ACKNOWLEDGMENT',
    displayName: 'Ciência da Política de Privacidade',
    whereCaptured: 'app/(auth)/signup/page.tsx, modules/auth/actions.ts (Signup flow)',
    versionField: 'account_users.privacy_version',
    currentVersion: '1.0 (CURRENT_PRIVACY_VERSION in lib/config/legal-versions.ts)',
    timestampField: 'account_users.privacy_accepted_at',
    actor: 'ADVERTISER',
    revocationSupported: false,
    revocationMechanism: 'Informational transparency record. Users can exercise data subject rights (DSR) via LGPD channels.',
    auditEvidenceLocation: 'Database row public.account_users(privacy_version, privacy_accepted_at).',
    technicalDetails: 'Recorded alongside terms acceptance at signup time.',
  },
  {
    mechanismId: 'AI_CONCIERGE_ENABLEMENT',
    legalNature: 'FEATURE_CONFIG_OPT_IN',
    displayName: 'Ativação do AI Concierge pelo Profissional',
    whereCaptured: 'app/(dashboard)/dashboard/concierge/ (Dashboard Concierge Settings)',
    versionField: 'N/A',
    currentVersion: '1.0',
    timestampField: 'professional_concierge_settings.updated_at',
    actor: 'ADVERTISER',
    revocationSupported: true,
    revocationMechanism: 'Toggle enabled = false in professional_concierge_settings immediately halts concierge replies.',
    auditEvidenceLocation: 'Database row public.professional_concierge_settings(enabled, updated_at).',
    technicalDetails: 'Default is false (opt-in required). Gated by global feature flags and publication eligibility.',
  },
] as const
