/**
 * Public Web Concierge Readiness Gate (Sections 32, 33, 34, 35, 36, 58)
 *
 * Enforces multi-layer server-side readiness check before rendering or activating
 * public concierge web chat on public profile pages.
 *
 * ALL gates must pass simultaneously:
 * 1. Global Feature Flag: CONCIERGE_WEB_PUBLIC_ENABLED === 'true' (Default: FALSE)
 * 2. Retention Policy Approved & Configured (Pre-production blocker: NOT CONFIGURED)
 * 3. Distributed Rate Limiting Ready (Pre-production blocker: IN_MEMORY ONLY)
 * 4. Provider Key Present: OPENAI_API_KEY must be configured for real visitor channels
 * 5. Canonical Publication Eligible: public.v_publication_eligible_profiles verification
 * 6. Professional Setting: professional_concierge_settings.enabled === true
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY,
  CONCIERGE_DISTRIBUTED_RATE_LIMIT_READY,
} from './rate-limiter'

export interface PublicConciergeReadinessResult {
  ready: boolean
  reasons: string[]
}

export async function isWebPublicConciergeReady(
  profileId: string
): Promise<PublicConciergeReadinessResult> {
  const reasons: string[] = []

  // Gate 1: Global Feature Flag (Section 34)
  const globalEnabled = process.env.CONCIERGE_WEB_PUBLIC_ENABLED === 'true'
  if (!globalEnabled) {
    reasons.push('GLOBAL_FLAG_DISABLED')
  }

  // Gate 2: Legal Retention Policy (Section 35)
  // No approved retention policy exists yet for real user chats
  const retentionApproved = process.env.CONCIERGE_RETENTION_POLICY_APPROVED === 'true'
  if (!retentionApproved) {
    reasons.push('RETENTION_POLICY_NOT_APPROVED')
  }

  // Gate 3: Distributed Rate Limiting Readiness (PX7 / PX7.1 / Section 36)
  const codeReady = DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY || CONCIERGE_DISTRIBUTED_RATE_LIMIT_READY
  const envReady =
    process.env.CONCIERGE_DISTRIBUTED_RATE_LIMIT_READY === 'true' ||
    process.env.DISTRIBUTED_RATE_LIMIT_READY === 'true'
  const distributedRateLimitReady = codeReady && envReady
  if (!distributedRateLimitReady) {
    reasons.push('DISTRIBUTED_RATE_LIMIT_NOT_READY')
  }

  // Gate 4: Provider Configuration (Section 4, 33)
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    reasons.push('PROVIDER_KEY_UNAVAILABLE')
  }

  const admin = createAdminClient()

  // Gate 5: Canonical Publication Eligibility (Section 6)
  const { data: eligibleProfile, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (eligibleError || !eligibleProfile) {
    reasons.push('PROFILE_NOT_PUBLICATION_ELIGIBLE')
  }

  // Gate 6: Professional Concierge Enabled Setting (Section 5)
  const { data: settings, error: settingsError } = await admin
    .from('professional_concierge_settings')
    .select('enabled')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (settingsError || !settings || !settings.enabled) {
    reasons.push('PROFESSIONAL_CONCIERGE_DISABLED')
  }

  return {
    ready: reasons.length === 0,
    reasons,
  }
}
