/**
 * Public Marketplace Constants
 *
 * Frozen configuration values from FASE 12.1C Design Contract.
 *
 * These are NOT secrets. They are product/UX constants safe to read
 * in any server-side context.
 */

/**
 * Minimum number of eligible profiles in a city before the Home
 * displays a numeric count ("N perfis verificados em São Paulo").
 * Below this threshold, only the label is shown without a count.
 *
 * Frozen in FASE 12.1C: 30
 */
export const LAUNCH_DISPLAY_THRESHOLD = 30

/**
 * Number of profiles shown in the Home preview grid.
 * Sourced from executeSearch({ limit: HOME_PROFILE_PREVIEW_COUNT }).
 * Mathematically safe with the FASE 08 pagination architecture.
 *
 * Frozen in FASE 12.1C: 8
 */
export const HOME_PROFILE_PREVIEW_COUNT = 8

/**
 * Maximum number of sponsored slots allowed per search results page.
 * Re-exported here for convenience — canonical source is FASE 08.
 */
export const MAX_SPONSORED_SLOTS_PER_PAGE = 4
