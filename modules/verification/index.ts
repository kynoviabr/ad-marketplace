/**
 * Module: verification
 *
 * Responsible for: Identity & age verification (KYC), verification
 * request lifecycle, provider abstraction (Didit / Mock), webhook processing,
 * and authorization gates (canProceedToProfessionalProfile, canUploadAdultMedia).
 *
 * @see docs/04_IDENTITY_KYC.md
 */

// Types
export * from './types'

// Schemas
export * from './schemas'

// Gates
export * from './gates'

// State Machine
export * from './state-machine'

// Provider Abstraction
export * from './providers/interface'
export * from './providers/factory'
export * from './providers/mock'
export * from './providers/didit'

// DAL
export * from './dal'

// Server Actions
export * from './actions'
