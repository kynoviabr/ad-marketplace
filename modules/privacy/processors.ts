import type { ProcessorStatus, InternationalTransferStatus } from './types'

/**
 * EXTERNAL PROCESSORS & DATA FLOWS INVENTORY — VELVET
 *
 * Phase: LGPD-01.1
 * Discovered from codebase inspection, package dependencies, and environment variable names.
 *
 * Invariants:
 * - Only confirmed providers actually found in source/config.
 * - Never includes secret values.
 * - International transfers evaluated from data-flow and infrastructure evidence.
 * - Contract/DPA status flagged NOT_REVIEWED unless formal DPA exists.
 * - Strict distinction between local Velvet storage and processor-side processing.
 */

export interface ExternalProcessor {
  system: string
  status: ProcessorStatus
  purpose: string
  dataCategoriesSent: readonly string[]
  identifiersSent: readonly string[]
  inboundDataReceived: readonly string[]
  localVelvetStorage: string
  processorSideProcessing: string
  externalRetentionBehavior: 'KNOWN' | 'UNKNOWN' | 'LEGAL_CONTRACT_REVIEW_REQUIRED'
  webhookDataRetained: string
  deletionCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'MANUAL_ONLY' | 'UNKNOWN' | 'NOT_APPLICABLE'
  internationalTransfer: InternationalTransferStatus
  transferDestination: string
  contractReviewStatus: 'NOT_REVIEWED' | 'DPA_PENDING_APPROVAL' | 'DPA_SIGNED'
  sourceReference: string
  notes: string
}

export const CONFIRMED_EXTERNAL_PROCESSORS: readonly ExternalProcessor[] = [
  {
    system: 'Supabase Inc.',
    status: 'ACTIVE',
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
    localVelvetStorage: 'Full operational application data stored in Postgres tables and Supabase storage buckets.',
    processorSideProcessing: 'Database management, data at rest encryption, IAM access controls, storage hosting.',
    externalRetentionBehavior: 'KNOWN',
    webhookDataRetained: 'N/A (Primary database infrastructure).',
    deletionCapability: 'SUPPORTED',
    internationalTransfer: 'POSSIBLE',
    transferDestination: 'Database hosted in AWS sa-east-1 (São Paulo, Brazil); corporate entity US Delaware; remote management/backup international transfer possible.',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'package.json (@supabase/supabase-js), lib/supabase/',
    notes: 'Primary backend-as-a-service. Service role client has administrative deletion capabilities.',
  },
  {
    system: 'Vercel Inc.',
    status: 'ACTIVE',
    purpose: 'Frontend hosting, edge runtime, Serverless function execution, CDN asset distribution.',
    dataCategoriesSent: [
      'Transient HTTP request headers and payloads',
      'Session cookies and JWT tokens in transit',
      'Visitor IP addresses at edge routing layer',
      'Server Action inputs and mutation requests',
    ],
    identifiersSent: ['IP address', 'User-Agent', 'HTTP cookies'],
    inboundDataReceived: ['Incoming HTTP client requests', 'Edge middleware context'],
    localVelvetStorage: 'No persistent database; serverless runtime caches only.',
    processorSideProcessing: 'HTTP request routing, edge caching, serverless execution logs, DDoS mitigation.',
    externalRetentionBehavior: 'KNOWN',
    webhookDataRetained: 'Deployment and runtime execution logs (ephemeral; subject to standard Vercel log retention).',
    deletionCapability: 'MANUAL_ONLY',
    internationalTransfer: 'YES',
    transferDestination: 'Global edge network with primary serverless execution nodes in US / Americas.',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'next.config.ts, package.json (next, react)',
    notes: 'Acts as hosting and compute processor for all SSR and server actions.',
  },
  {
    system: 'Didit (Didit Verification)',
    status: 'ACTIVE',
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
    localVelvetStorage: 'Only verification outcome flags (status, age_verified, identity_verified, cpf_verified), provider session ID, and webhook delivery audit events. Zero document images, zero selfies, zero raw biometric vectors persisted in Velvet database.',
    processorSideProcessing: 'Biometric facial template extraction, liveness video analysis, document optical character recognition (OCR), government registry check. Subject to Didit verification engine processing.',
    externalRetentionBehavior: 'LEGAL_CONTRACT_REVIEW_REQUIRED',
    webhookDataRetained: 'Provider event ID, provider session ID, status, and error message stored in verification_webhook_events. Raw biometric photos and document scans are NOT retained in Velvet DB.',
    deletionCapability: 'UNKNOWN',
    internationalTransfer: 'YES',
    transferDestination: 'European Union (Spain).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'modules/verification/providers/didit/',
    notes: 'Configured via DIDIT_API_KEY, DIDIT_WEBHOOK_SECRET, DIDIT_WORKFLOW_ID. External erasure requires Didit API DSR integration.',
  },
  {
    system: 'OpenAI, L.L.C.',
    status: 'CONFIGURED_BUT_DISABLED',
    purpose: 'Natural language assistant generation for profile inquiry handling via AI Concierge (currently disabled/staged).',
    dataCategoriesSent: [
      'Visitor inquiry text prompt',
      'Public profile facts (stage name, services, rates, availability, FAQs)',
    ],
    identifiersSent: ['No account UUIDs or user emails sent. Anonymous visitor chat text only.'],
    inboundDataReceived: ['Assistant reply text', 'Tool call invocations (e.g. FAQ / schedule lookups)'],
    localVelvetStorage: 'Concierge conversation history and message logs (staged). Currently no public live traffic.',
    processorSideProcessing: 'Prompt embeddings and LLM inference generation. Subject to OpenAI 30-day API retention policy for abuse monitoring unless zero-retention agreement is executed.',
    externalRetentionBehavior: 'KNOWN',
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
    status: 'MOCK_ONLY',
    purpose: 'Synthetic payment simulator for developer/testing environments. REAL_PAYMENT_PROVIDER_INTEGRATED = false.',
    dataCategoriesSent: ['None (Mock provider active in codebase; REAL_PAYMENT_PROVIDER_INTEGRATED = false).'],
    identifiersSent: ['None.'],
    inboundDataReceived: ['Synthetic mock webhook events in dev/test.'],
    localVelvetStorage: 'Synthetic mock transaction IDs and mock webhook log records.',
    processorSideProcessing: 'None. Operates purely in-process in development/test. No real external payment processor integrated.',
    externalRetentionBehavior: 'KNOWN',
    webhookDataRetained: 'Synthetic event IDs in billing_webhook_events.',
    deletionCapability: 'NOT_APPLICABLE',
    internationalTransfer: 'NO',
    transferDestination: 'Local mock runtime (no data transmitted externally).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'modules/billing/providers/mock-provider.ts, registry.ts',
    notes: 'No real payment gateway is currently under contract or processing live customer funds.',
  },
  {
    system: 'Meta / WhatsApp',
    status: 'PLANNED',
    purpose: 'Direct advertiser-client contact initiated via client-side wa.me links. No server-side WhatsApp Cloud API integration exists.',
    dataCategoriesSent: ['None from Velvet backend servers.'],
    identifiersSent: ['None from backend. Client browser opens wa.me URL directly.'],
    inboundDataReceived: ['None.'],
    localVelvetStorage: 'Advertiser phone numbers stored in professional_profiles with explicit advertiser consent for public listing.',
    processorSideProcessing: 'None on Velvet backend infrastructure. Peer-to-peer client interaction handled by WhatsApp client applications.',
    externalRetentionBehavior: 'KNOWN',
    webhookDataRetained: 'None.',
    deletionCapability: 'NOT_APPLICABLE',
    internationalTransfer: 'NO',
    transferDestination: 'N/A (No server-to-server data transfer initiated by Velvet).',
    contractReviewStatus: 'NOT_REVIEWED',
    sourceReference: 'components/public/profile-contact-button.tsx, lib/i18n/messages/admin.ts',
    notes: 'All WhatsApp interactions are client-side deep links (wa.me). No backend processor integration exists.',
  },
] as const
