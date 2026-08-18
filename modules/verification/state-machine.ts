import type { VerificationStatus } from './types'

/**
 * Valid state transitions for the verification state machine.
 *
 * Designed to allow legitimate provider jumps (e.g. fast approval directly from PENDING)
 * while strictly protecting terminal and approved states from regressions.
 */
export const ALLOWED_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  NOT_STARTED: ['PENDING'],
  PENDING: ['IN_PROGRESS', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'],
  IN_PROGRESS: ['IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'],
  IN_REVIEW: ['VERIFIED', 'REJECTED', 'EXPIRED'],
  VERIFIED: ['EXPIRED'], // Terminal state: only server-side expiration/revocation may transition
  REJECTED: ['PENDING'], // User may restart verification attempt
  EXPIRED: ['PENDING'],  // User may restart after expiration
}

/**
 * Checks if a transition from `from` to `to` is valid.
 */
export function isValidTransition(from: VerificationStatus, to: VerificationStatus): boolean {
  if (from === to) return true
  const allowed = ALLOWED_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

/**
 * Terminal states that should never be degraded by standard workflow webhooks.
 */
export function isTerminalState(status: VerificationStatus): boolean {
  return status === 'VERIFIED'
}

/**
 * Determines if an incoming status update should be ignored because the current status
 * is more authoritative or terminal.
 */
export function shouldIgnoreOutdatedWebhook(
  currentStatus: VerificationStatus,
  incomingStatus: VerificationStatus
): boolean {
  // If current status is already VERIFIED, ignore non-VERIFIED workflow events
  if (currentStatus === 'VERIFIED' && incomingStatus !== 'VERIFIED') {
    return true
  }

  // If transition is invalid and not a restart, ignore
  if (!isValidTransition(currentStatus, incomingStatus)) {
    return true
  }

  return false
}
