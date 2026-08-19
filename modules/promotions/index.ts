/**
 * Module: promotions
 *
 * Responsible for: Boosts, sponsored placement, additional monetization features.
 * Sponsored placement is identifiable, limited, rotated fairly, and strictly
 * dependent on public search publication eligibility (DEC-017, FASE 08).
 *
 * @see docs/10_BOOSTS_RANKING.md
 */

// Types & Interfaces
export type {
  BoostScopeType,
  BoostCampaignStatus,
  BoostProduct,
  BoostPrice,
  ProfileBoost,
  BoostProductDTO,
  BoostPriceDTO,
  ProfileBoostDTO,
  SponsoredPlacementCandidate,
  PromotionActionResult,
} from './types'

// Constants
export {
  MAX_SPONSORED_SLOTS_PER_PAGE,
  DEFAULT_CURRENCY,
  BOOST_ROTATION_WINDOW_MINUTES,
  ROTATION_BUCKET_MINUTES,
  BOOST_STATUSES,
  BOOST_SCOPES,
} from './constants'

// Schemas
export {
  InitiateBoostCheckoutSchema,
  CancelBoostCampaignSchema,
  type InitiateBoostCheckoutInput,
  type CancelBoostCampaignInput,
} from './schemas'

// Eligibility Evaluators
export {
  isBoostTimeEligible,
  isBoostPlacementEligible,
} from './eligibility'

// Fair Rotation Engine
export {
  getRotationBucket,
  computeRotationScore,
  sortCandidatesByFairRotation,
} from './rotation'

// Database Access Layer
export {
  getActiveBoostProducts,
  getBoostProductById,
  getBoostPriceById,
  getProfileBoostsByProfileId,
  getProfileBoostById,
  getAllBoostCampaigns,
  createBoostCampaign,
  updateBoostCampaignStatus,
  cancelBoostCampaign,
  resolveActiveSponsoredCandidates,
} from './dal'

// Server Actions
export {
  initiateBoostCheckoutAction,
  cancelBoostCampaignAction,
  getAdvertiserBoostsAction,
} from './actions'
