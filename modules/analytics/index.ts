/**
 * Module: analytics
 *
 * Responsible for:
 * - Search performed, impression, and contact click event ingestion
 * - Privacy-preserving, pseudonymous visitor tracking
 * - Server-authoritative sponsored placement attribution
 * - Idempotent BOOST_ACTIVATED lifecycle tracking
 * - Deterministic daily metrics aggregation
 * - Advertiser and Admin Surface A analytics DTOs and dashboards
 *
 * Status: FASE 09 IMPLEMENTED
 *
 * @see docs/11_ANALYTICS.md
 */

export * from './types'
export * from './schemas'
export * from './rate-limiter'
export * from './write'
export * from './dal'
export * from './aggregation'
export * from './actions'
