/**
 * Module: profiles
 *
 * Responsible for: Professional profile domain, display name, slug generation,
 * physical attributes, contact channels, visibility controls, completeness
 * validation, and profile state management.
 *
 * @see docs/05_PROFILE_DOMAIN.md
 */

// Types
export * from './types'

// Schemas
export * from './schemas'

// Utilities & Logic
export * from './slug'
export * from './completeness'
export * from './gates'

// DAL
export * from './dal'

// Server Actions
export * from './actions'
