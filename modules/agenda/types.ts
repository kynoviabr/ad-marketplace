/**
 * ============================================================================
 * PX3.1 — Professional Availability and Agenda Foundation Contracts
 * ============================================================================
 *
 * Product Boundary:
 * Velvet is an advertising / discovery marketplace. Agenda and availability
 * are optional productivity tooling for the professional advertiser.
 *
 * Terminology rule:
 * NO 'booking', 'reservation', 'order', 'sale'.
 * USE 'availability', 'available time', 'inquiry slot', 'requested time'.
 *
 * Cross-Midnight Policy:
 * Single rules spanning across midnight (where end_time <= start_time, e.g. 22:00–02:00)
 * are strictly REJECTED by database check constraints, RPC validation, and engine logic.
 * Cross-midnight availability must be modeled as two discrete intervals:
 * Day N: 22:00–23:59 (or 23:59:59)
 * Day N+1: 00:00–02:00
 *
 * Buffer Semantics:
 * bufferBeforeMinutes and bufferAfterMinutes are persisted operating preferences.
 * Currently persisted for future busy-interval and inquiry integration (PX4/PX5).
 *
 * Security Authority Invariant:
 * slotRef is an opaque convenience pointer ONLY. It possesses ZERO authorization,
 * reservation, or confirmation authority. Any future inquiry, booking, or AI flow
 * must re-run canonical server-side availability validation before acting on it.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DAY_OF_WEEK_NAMES: Record<DayOfWeek, { en: string; pt: string }> = {
  0: { en: 'Sunday', pt: 'Domingo' },
  1: { en: 'Monday', pt: 'Segunda-feira' },
  2: { en: 'Tuesday', pt: 'Terça-feira' },
  3: { en: 'Wednesday', pt: 'Quarta-feira' },
  4: { en: 'Thursday', pt: 'Quinta-feira' },
  5: { en: 'Friday', pt: 'Sexta-feira' },
  6: { en: 'Saturday', pt: 'Sábado' },
}

export type ExceptionType = 'CLOSED_DAY' | 'BLOCKED_INTERVAL' | 'CUSTOM_HOURS'

export interface AvailabilitySettings {
  profileId: string
  enabled: boolean
  timezone: string
  slotDurationMinutes: number
  slotIntervalMinutes: number
  minimumNoticeMinutes: number
  maximumAdvanceDays: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyAvailabilityRule {
  id?: string
  profileId: string
  dayOfWeek: DayOfWeek
  startTime: string // HH:mm or HH:mm:ss
  endTime: string // HH:mm or HH:mm:ss
  locationId?: string | null
  createdAt?: string
}

export interface AvailabilityException {
  id?: string
  profileId: string
  exceptionDate: string // YYYY-MM-DD
  exceptionType: ExceptionType
  startTime?: string | null // HH:mm or HH:mm:ss
  endTime?: string | null // HH:mm or HH:mm:ss
  locationId?: string | null
  createdAt?: string
}

export interface TimeWindow {
  startTime: string // HH:mm
  endTime: string // HH:mm
}

export interface BusyInterval {
  startIso: string
  endIso: string
  source?: 'INTERNAL_INQUIRY' | 'EXTERNAL_CALENDAR'
}

/**
 * Internal representation used by the agenda availability engine and server-side logic.
 * Contains internal database identifiers needed for deduplication, location filtering, and revalidation.
 * NEVER returned directly across public APIs.
 */
export interface InternalInquirySlot {
  profileId: string
  startIso: string
  endIso: string
  localDate: string // YYYY-MM-DD
  localStartTime: string // HH:mm
  localEndTime: string // HH:mm
  locationId?: string | null
}

/** Backward-compatibility alias for internal engine consumers. */
export type InquirySlot = InternalInquirySlot

/**
 * Public availability slot exposed to clients, search, profile detail, and future AI concierge.
 * Strictly sanitized: NEVER exposes raw profile UUID, location UUID, account IDs, rule IDs,
 * exception IDs, or internal buffer configurations.
 *
 * Security Authority Invariant:
 * slotRef is an opaque convenience pointer ONLY. It possesses ZERO authorization or reservation
 * authority. Any future inquiry/AI flow must re-verify availability server-side.
 */
export interface PublicAvailabilitySlot {
  slotRef: string
  startIso: string
  endIso: string
  localDate: string // YYYY-MM-DD
  localStartTime: string // HH:mm
  localEndTime: string // HH:mm
  timezone: string
  locationSlug?: string | null
}

export interface SlotGenerationParams {
  settings: AvailabilitySettings
  weeklyRules: WeeklyAvailabilityRule[]
  exceptions: AvailabilityException[]
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  targetLocationId?: string | null
  busyIntervals?: BusyInterval[]
  now?: Date // Injected current time for deterministic testing and notice calculations
}

export interface PublicAvailabilityQuery {
  profileSlug: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  locationSlug?: string | null
}

export interface ProfessionalScheduleSummary {
  settings: AvailabilitySettings
  weeklyRules: WeeklyAvailabilityRule[]
  exceptions: AvailabilityException[]
}

/**
 * Privacy-safe public availability signal for public profile detail pages.
 * Strictly derives broad, high-level availability status without exposing full schedule or raw slots.
 */
export type PublicAvailabilitySignal =
  | { status: 'AVAILABLE_TODAY'; labelPt: string; labelEn: string }
  | { status: 'AVAILABLE_THIS_WEEK'; labelPt: string; labelEn: string }
  | { status: 'NO_SIGNAL' }

/**
 * Aggregated dashboard DTO for the authenticated professional availability management view.
 */
export interface ProfessionalAvailabilityDashboardDTO {
  profileId: string
  settings: AvailabilitySettings
  weeklyRules: WeeklyAvailabilityRule[]
  upcomingExceptions: AvailabilityException[]
  serviceAreas: Array<{ id: string; name: string; slug: string; isPrimary: boolean }>
  todayDate: string
  isUnavailableToday: boolean
  previewSlots: Array<{
    startIso: string
    endIso: string
    localDate: string
    localStartTime: string
    localEndTime: string
    locationName?: string | null
  }>
}
