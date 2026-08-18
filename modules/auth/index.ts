/**
 * Auth module — public API surface
 *
 * @see docs/03_AUTHENTICATION.md
 */

export type { UserRole, UserStatus, OnboardingStatus, AccountUser, ActionResult } from './types'
export { getSession, requireAuth, getAccount, requireAccount } from './dal'
export {
  signupAction,
  loginAction,
  logoutAction,
  forgotPasswordAction,
  resetPasswordAction,
  startOnboardingAction,
  startOnboardingFormAction,
} from './actions'
