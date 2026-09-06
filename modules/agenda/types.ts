/**
-- ============================================================================
-- PX3 — Professional Availability and Agenda Foundation Types
-- ============================================================================
 *
 * Product Boundary:
 * Velvet is an advertising / discovery marketplace. Agenda and availability
 * are optional productivity tooling for the advertising professional.
 *
 * Terminology rule:
 * NO 'booking', 'reservation', 'order', 'sale'.
 * USE 'availability', 'available time', 'inquiry slot', 'requested time'.
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

export interface InquirySlot {
  slotId: string
  profileId: string
  startIso: string
  endIso: string
  localDate: string // YYYY-MM-DD
  localStartTime: string // HH:mm
  localEndTime: string // HH:mm
  locationId?: string | null
}

export interface SlotGenerationParams {
  settings: AvailabilitySettings
  weeklyRules: WeeklyAvailabilityRule[]
  exceptions: AvailabilityException[]
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  targetLocationId?: string | null
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
