/**
 * Module: admin
 *
 * Responsible for: Internal admin tooling, operational status classification,
 * professional summary projection, operations overview and queue monitoring.
 * Admin routes must require explicit authorization — never expose publicly.
 *
 * Status: R12.1 ADMIN OPERATIONS FOUNDATION
 */

export * from './types'
export * from './operational-status'
export * from './dal'
