/**
 * EXTERNAL PROCESSORS & DATA FLOWS INVENTORY — VELVET
 *
 * Phase: LGPD-01
 * Discovered from codebase inspection, package dependencies, and environment variable names.
 *
 * Invariants:
 * - Only confirmed providers actually found in source/config.
 * - Never includes secret values.
 * - International transfers evaluated.
 * - Contract/DPA status flagged NOT REVIEWED unless formal DPA exists.
 */

export interface ExternalProcessor {
  system: string
  purpose: string
  dataCategoriesSent: readonly string[]
  identifiersSent: readonly string[]
  inboundDataReceived: readonly string[]
  webhookDataRetained: string
  deletionCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'MANUAL_ONLY' | 'UNKNOWN' | 'NOT_APPLICABLE'
  internationalTransfer: 'YES' | 'NO' | 'UNKNOWN'
  transferDestination: string
  contractReviewStatus: 'NOT_REVIEWED' | 'DPA_PENDING_APPROVAL' | 'DPA_SIGNED'
  sourceReference: string
  notes: string
}

export const CONFIRMED_EXTERNAL_PROCESSORS: readonly ExternalProcessor[] = [
  {
    system: 'Supabase Inc.',
    purpose: 'Core cloud database (PostgreSQL), user authentication, private storage buckets, edge API gateway.',
    dataCategoriesSent: [
      'Account credentials (email, hashed password)',
      'Profile information (stage name, bio, phones, attributes)',
      'Media files (photos, videos, posters)',
      'Verification metadata and webhook receipts',
      'System telemetry and audit logs',
    ],
    identifiersSent: ['User email', 'Phone number', 'Internal UUIDs', 'IP address in network transit'],
    inboundDataReceived: ['JWT access tokens', 'Refresh tokens', 'Database query results', 'Signed Storage URLs'],
    webhookDataRetained: 'N/A (Primary database infrastructure).',
    deletionCapability: 'SUPPORTED',
    internationalTransfer: 'YES',
    transferDestination: 'AWS sa-east-1 (São Paulo region), operated by Supabase Inc. (Delaware, USA).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'package.json (@supabase/supabase-js), lib/supabase/',
    notes: 'Primary backend-as-a-service. Service role client has administrative deletion capabilities.',
  },
  {
    system: 'Vercel Inc.',
    purpose: 'Frontend hosting, edge runtime, Serverless function execution, CDN asset distribution.',
    dataCategoriesSent: [
      'Transient HTTP request headers and payloads',
      'Session cookies and JWT tokens in transit',
      'Visitor IP addresses at edge routing layer',
      'Server Action inputs and mutation requests',
    ],
    identifiersSent: ['IP address', 'User-Agent', 'HTTP cookies'],
    inboundDataReceived: ['Incoming HTTP client requests', 'Edge middleware context'],
    webhookDataRetained: 'Deployment and runtime execution logs (ephemeral; subject to standard Vercel log retention).',
    deletionCapability: 'MANUAL_ONLY',
    internationalTransfer: 'YES',
    transferDestination: 'Global edge network with primary nodes in US / Americas.',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'next.config.ts, package.json (next, react)',
    notes: 'Acts as hosting and compute processor for all SSR and server actions.',
  },
  {
    system: 'Didit (Didit Verification)',
    purpose: 'Identity document validation, age verification (18+), and biometric liveness inspection.',
    dataCategoriesSent: [
      'Verification session initiation request',
      'Internal vendor reference UUID (account_user_id)',
      'Workflow configuration parameters',
    ],
    identifiersSent: ['account_user_id (as vendor_data)'],
    inboundDataReceived: [
      'Webhook notifications (status.updated, data.updated)',
      'Verification outcome (VERIFIED, REJECTED, EXPIRED)',
      'Age verification threshold boolean (age >= 18)',
      'CPF validity flag (cpf_verified)',
    ],
    webhookDataRetained: 'Provider event ID, provider session ID, status, and error message stored in verification_webhook_events. Raw biometric photos and document scans are NOT retained in Velvet DB.',
    deletionCapability: 'UNKNOWN',
    internationalTransfer: 'YES',
    transferDestination: 'European Union (Spain).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'modules/verification/providers/didit/',
    notes: 'Configured via DIDIT_API_KEY, DIDIT_WEBHOOK_SECRET, DIDIT_WORKFLOW_ID. External erasure requires Didit API DSR integration.',
  },
  {
    system: 'OpenAI, L.L.C. (Staged / Gated)',
    purpose: 'Natural language assistant generation for profile inquiry handling via AI Concierge.',
    dataCategoriesSent: [
      'Visitor inquiry text prompt',
      'Public profile facts (stage name, services, rates, availability, FAQs)',
    ],
    identifiersSent: ['No account UUIDs or user emails sent. Anonymous visitor chat text only.'],
    inboundDataReceived: ['Assistant reply text', 'Tool call invocations (e.g. FAQ / schedule lookups)'],
    webhookDataRetained: 'None (stateless API calls).',
    deletionCapability: 'SUPPORTED',
    internationalTransfer: 'YES',
    transferDestination: 'United States (OpenAI API infrastructure).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'modules/concierge/provider.ts, modules/concierge/gate.ts',
    notes: 'STAGED / DISABLED IN PRODUCTION: Currently blocked by CONCIERGE_WEB_PUBLIC_ENABLED=false, CONCIERGE_RETENTION_POLICY_APPROVED=false.',
  },
  {
    system: 'Payment Provider (Currently Mock)',
    purpose: 'Commercial payment processing for advertiser subscriptions and promotional boosts.',
    dataCategoriesSent: ['None (Mock provider active in codebase; REAL_PAYMENT_PROVIDER_INTEGRATED = false).'],
    identifiersSent: ['None.'],
    inboundDataReceived: ['Synthetic mock webhook events in dev/test.'],
    webhookDataRetained: 'Synthetic event IDs in billing_webhook_events.',
    deletionCapability: 'NOT_APPLICABLE',
    internationalTransfer: 'NO',
    transferDestination: 'Local mock runtime.',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'modules/billing/providers/mock-provider.ts, registry.ts',
    notes: 'No real payment gateway is currently under contract or processing live customer funds.',
  },
] as const
