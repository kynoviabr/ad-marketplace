import type { Subscription } from './types'

/** Pure, time-aware subscription eligibility rule shared by billing readers. */
export function isSubscriptionPublicationEligible(
  subscription:
    | Pick<Subscription, 'status' | 'current_period_end' | 'cancel_at_period_end' | 'grace_period_end'>
    | null
    | undefined
): boolean {
  if (!subscription) return false
  const now = new Date()
  switch (subscription.status) {
    case 'ACTIVE':
      return !subscription.current_period_end || new Date(subscription.current_period_end) > now
    case 'PAST_DUE':
      return true
    case 'GRACE_PERIOD':
      return Boolean(subscription.grace_period_end && new Date(subscription.grace_period_end) > now)
    case 'INCOMPLETE':
    case 'EXPIRED':
    default:
      return false
  }
}
