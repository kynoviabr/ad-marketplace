import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_TIMEZONE,
  generateAvailableSlots,
  generateOpaqueSlotRef,
  getLocalDateInTimezone,
  hasOverlappingWindows,
  isValidIanaTimezone,
  normalizeTime,
} from './engine'
import { getProfileLocations } from '@/modules/locations/dal'
import type {
  AvailabilityException,
  AvailabilitySettings,
  DayOfWeek,
  InternalInquirySlot,
  ProfessionalAvailabilityDashboardDTO,
  ProfessionalScheduleSummary,
  PublicAvailabilityQuery,
  PublicAvailabilitySignal,
  PublicAvailabilitySlot,
  WeeklyAvailabilityRule,
} from './types'

export const DEFAULT_AVAILABILITY_SETTINGS: Omit<AvailabilitySettings, 'profileId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  timezone: 'America/Sao_Paulo',
  slotDurationMinutes: 60,
  slotIntervalMinutes: 30,
  minimumNoticeMinutes: 120,
  maximumAdvanceDays: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
}

interface RawSettingsRow {
  profile_id: string
  enabled: boolean
  timezone: string
  slot_duration_minutes: number
  slot_interval_minutes: number
  minimum_notice_minutes: number
  maximum_advance_days: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  created_at: string
  updated_at: string
}

interface RawWeeklyRow {
  id: string
  profile_id: string
  day_of_week: number
  start_time: string
  end_time: string
  location_id: string | null
  created_at: string
}

interface RawExceptionRow {
  id: string
  profile_id: string
  exception_date: string
  exception_type: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  created_at: string
}

function mapSettingsRow(row: RawSettingsRow): AvailabilitySettings {
  return {
    profileId: row.profile_id,
    enabled: row.enabled,
    timezone: row.timezone,
    slotDurationMinutes: row.slot_duration_minutes,
    slotIntervalMinutes: row.slot_interval_minutes,
    minimumNoticeMinutes: row.minimum_notice_minutes,
    maximumAdvanceDays: row.maximum_advance_days,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapWeeklyRow(row: RawWeeklyRow): WeeklyAvailabilityRule {
  return {
    id: row.id,
    profileId: row.profile_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    locationId: row.location_id,
    createdAt: row.created_at,
  }
}

function mapExceptionRow(row: RawExceptionRow): AvailabilityException {
  return {
    id: row.id,
    profileId: row.profile_id,
    exceptionDate: row.exception_date,
    exceptionType: row.exception_type as AvailabilityException['exceptionType'],
    startTime: row.start_time ? normalizeTime(row.start_time) : null,
    endTime: row.end_time ? normalizeTime(row.end_time) : null,
    locationId: row.location_id,
    createdAt: row.created_at,
  }
}

/**
 * Retrieves availability settings for a professional profile.
 * If no settings row exists yet, returns initialized default settings.
 */
export async function getAvailabilitySettings(profileId: string): Promise<AvailabilitySettings> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_availability_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load availability settings for ${profileId}: ${error.message}`)
  }

  if (!data) {
    return {
      profileId,
      ...DEFAULT_AVAILABILITY_SETTINGS,
    }
  }

  return mapSettingsRow(data as RawSettingsRow)
}

/**
 * Updates or creates availability settings for a profile.
 */
export async function updateAvailabilitySettings(
  profileId: string,
  settings: Partial<Omit<AvailabilitySettings, 'profileId' | 'createdAt' | 'updatedAt'>>
): Promise<AvailabilitySettings> {
  if (settings.timezone !== undefined && !isValidIanaTimezone(settings.timezone)) {
    throw new Error(`Invalid IANA timezone identifier: ${settings.timezone}`)
  }

  const current = await getAvailabilitySettings(profileId)
  const admin = createAdminClient()

  const payload: Partial<RawSettingsRow> = {
    profile_id: profileId,
    enabled: settings.enabled ?? current.enabled,
    timezone: settings.timezone ?? current.timezone,
    slot_duration_minutes: settings.slotDurationMinutes ?? current.slotDurationMinutes,
    slot_interval_minutes: settings.slotIntervalMinutes ?? current.slotIntervalMinutes,
    minimum_notice_minutes: settings.minimumNoticeMinutes ?? current.minimumNoticeMinutes,
    maximum_advance_days: settings.maximumAdvanceDays ?? current.maximumAdvanceDays,
    buffer_before_minutes: settings.bufferBeforeMinutes ?? current.bufferBeforeMinutes,
    buffer_after_minutes: settings.bufferAfterMinutes ?? current.bufferAfterMinutes,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('professional_availability_settings')
    .upsert(payload, { onConflict: 'profile_id' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to update availability settings: ${error?.message}`)
  }

  return mapSettingsRow(data as RawSettingsRow)
}

/**
 * Retrieves recurring weekly availability rules for a profile.
 */
export async function getWeeklyAvailability(profileId: string): Promise<WeeklyAvailabilityRule[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_weekly_availability')
    .select('*')
    .eq('profile_id', profileId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to load weekly availability for ${profileId}: ${error.message}`)
  }

  return (data ?? []).map((row) => mapWeeklyRow(row as RawWeeklyRow))
}

/**
 * Atomically saves the complete set of recurring weekly availability rules for a profile.
 * Validates against overlaps and executes in a single database transaction via RPC.
 */
export async function saveWeeklyAvailability(
  profileId: string,
  rules: Array<Omit<WeeklyAvailabilityRule, 'id' | 'profileId' | 'createdAt'>>
): Promise<WeeklyAvailabilityRule[]> {
  // Pre-validate for overlapping windows per day and location scope
  const grouped: Record<string, { startTime: string; endTime: string }[]> = {}
  for (const rule of rules) {
    const key = `${rule.dayOfWeek}:${rule.locationId ?? 'all'}`
    grouped[key] = grouped[key] || []
    grouped[key].push({ startTime: normalizeTime(rule.startTime), endTime: normalizeTime(rule.endTime) })
  }

  for (const [key, windows] of Object.entries(grouped)) {
    if (hasOverlappingWindows(windows)) {
      throw new Error(`Overlapping windows detected for schedule group: ${key}`)
    }
  }

  const payload = rules.map((r) => ({
    day_of_week: r.dayOfWeek,
    start_time: normalizeTime(r.startTime),
    end_time: normalizeTime(r.endTime),
    location_id: r.locationId ?? null,
  }))

  const admin = createAdminClient()
  const { error } = await admin.rpc('save_professional_weekly_availability', {
    p_profile_id: profileId,
    p_rules: payload,
  })

  if (error) {
    throw new Error(`Failed to save weekly availability rules: ${error.message}`)
  }

  return getWeeklyAvailability(profileId)
}

/**
 * Retrieves date-specific availability exceptions.
 */
export async function getAvailabilityExceptions(
  profileId: string,
  startDate?: string,
  endDate?: string
): Promise<AvailabilityException[]> {
  const admin = createAdminClient()
  let query = admin
    .from('professional_availability_exceptions')
    .select('*')
    .eq('profile_id', profileId)

  if (startDate) {
    query = query.gte('exception_date', startDate)
  }
  if (endDate) {
    query = query.lte('exception_date', endDate)
  }

  query = query.order('exception_date', { ascending: true }).order('start_time', { ascending: true })

  const { data, error } = await query
  if (error) {
    throw new Error(`Failed to load availability exceptions for ${profileId}: ${error.message}`)
  }

  return (data ?? []).map((row) => mapExceptionRow(row as RawExceptionRow))
}

/**
 * Adds an availability exception for a profile.
 */
export async function createAvailabilityException(
  exception: Omit<AvailabilityException, 'id' | 'createdAt'>
): Promise<AvailabilityException> {
  const admin = createAdminClient()

  const payload: Partial<RawExceptionRow> = {
    profile_id: exception.profileId,
    exception_date: exception.exceptionDate,
    exception_type: exception.exceptionType,
    start_time: exception.startTime ? normalizeTime(exception.startTime) : null,
    end_time: exception.endTime ? normalizeTime(exception.endTime) : null,
    location_id: exception.locationId ?? null,
  }

  const { data, error } = await admin
    .from('professional_availability_exceptions')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create availability exception: ${error?.message}`)
  }

  return mapExceptionRow(data as RawExceptionRow)
}

/**
 * Deletes an availability exception by ID with profile ownership verification.
 */
export async function deleteAvailabilityException(
  exceptionId: string,
  profileId: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { error, count } = await admin
    .from('professional_availability_exceptions')
    .delete({ count: 'exact' })
    .eq('id', exceptionId)
    .eq('profile_id', profileId)

  if (error) {
    throw new Error(`Failed to delete availability exception ${exceptionId}: ${error.message}`)
  }

  return (count ?? 0) > 0
}

/**
 * Retrieves the complete availability summary for a professional (settings, weekly, exceptions).
 */
export async function getProfessionalScheduleSummary(
  profileId: string,
  startDate?: string,
  endDate?: string
): Promise<ProfessionalScheduleSummary> {
  const [settings, weeklyRules, exceptions] = await Promise.all([
    getAvailabilitySettings(profileId),
    getWeeklyAvailability(profileId),
    getAvailabilityExceptions(profileId, startDate, endDate),
  ])

  return {
    settings,
    weeklyRules,
    exceptions,
  }
}

/**
 * Public slot inquiry query — FAIL-CLOSED:
 * Only returns available slots if:
 * 1. Profile is verified publication-eligible via canonical view v_publication_eligible_profiles
 * 2. Profile status is ACTIVE
 * 3. If locationSlug is specified, the location is verified active and associated with the profile
 * 4. Settings enabled is true
 */
export async function getPublicAvailableSlots(query: PublicAvailabilityQuery): Promise<PublicAvailabilitySlot[]> {
  const admin = createAdminClient()

  // 1. Authoritative Publication Gate Check
  const { data: eligibleProfile, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id, profile_status')
    .eq('profile_slug', query.profileSlug)
    .maybeSingle()

  if (eligibleError || !eligibleProfile || eligibleProfile.profile_status !== 'ACTIVE') {
    return []
  }

  const profileId = eligibleProfile.profile_id

  // 2. Location scoping and verification if locationSlug is requested
  let targetLocationId: string | null = null
  if (query.locationSlug) {
    const { data: locData, error: locError } = await admin
      .from('marketplace_locations')
      .select('id, active')
      .eq('slug', query.locationSlug)
      .eq('active', true)
      .maybeSingle()

    if (locError || !locData) {
      return []
    }

    // Verify professional is associated with this location
    const { data: profileLoc, error: profileLocError } = await admin
      .from('professional_profile_locations')
      .select('profile_id')
      .eq('profile_id', profileId)
      .eq('location_id', locData.id)
      .maybeSingle()

    if (profileLocError || !profileLoc) {
      return []
    }

    targetLocationId = locData.id
  }

  // 3. Load schedule data
  const summary = await getProfessionalScheduleSummary(profileId, query.startDate, query.endDate)

  if (!summary.settings.enabled) {
    return []
  }

  // 4. Generate internal slots purely
  const internalSlots: InternalInquirySlot[] = generateAvailableSlots({
    settings: summary.settings,
    weeklyRules: summary.weeklyRules,
    exceptions: summary.exceptions,
    startDate: query.startDate,
    endDate: query.endDate,
    targetLocationId,
    now: new Date(),
  })

  // 5. Transform to strictly sanitized PublicAvailabilitySlot DTO:
  // Exposes ZERO internal UUIDs, ZERO account IDs, ZERO raw rule rows, ZERO buffer configs.
  const timezone = summary.settings.timezone || DEFAULT_TIMEZONE
  return internalSlots.map((slot) => ({
    slotRef: generateOpaqueSlotRef(query.profileSlug, slot.startIso, slot.endIso),
    startIso: slot.startIso,
    endIso: slot.endIso,
    localDate: slot.localDate,
    localStartTime: slot.localStartTime,
    localEndTime: slot.localEndTime,
    timezone,
    locationSlug: query.locationSlug ?? null,
  }))
}

/**
 * Canonical server-side availability revalidation.
 * Re-runs full publication gate, location association, schedule rules, and exceptions
 * to verify that a requested time slot is genuinely currently available.
 *
 * A client, external caller, or AI presenting a slotRef or time window CANNOT bypass this check.
 */
export async function revalidateSlotAvailability(params: {
  profileSlug: string
  startIso: string
  endIso: string
  locationSlug?: string | null
}): Promise<{ available: boolean; slot?: PublicAvailabilitySlot; reason?: string }> {
  const date = params.startIso.split('T')[0]
  if (!date) {
    return { available: false, reason: 'INVALID_TIMESTAMP' }
  }

  const slots = await getPublicAvailableSlots({
    profileSlug: params.profileSlug,
    startDate: date,
    endDate: date,
    locationSlug: params.locationSlug,
  })

  const matching = slots.find(
    (s) => s.startIso === params.startIso && s.endIso === params.endIso
  )

  if (!matching) {
    return { available: false, reason: 'SLOT_UNAVAILABLE' }
  }

  return { available: true, slot: matching }
}

/**
 * Derives a privacy-safe, high-level public availability signal for a profile.
 * Fail-closed: returns NO_SIGNAL if profile is ineligible, availability is disabled,
 * or no candidate slots are found within the upcoming 7 days.
 *
 * Exposes ZERO dates, ZERO slots, ZERO times, ZERO UUIDs to the caller.
 */
export async function getPublicAvailabilitySignal(
  profileSlug: string
): Promise<PublicAvailabilitySignal> {
  try {
    const now = new Date()
    const todayStr = getLocalDateInTimezone(now, DEFAULT_TIMEZONE)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in7DaysStr = getLocalDateInTimezone(in7Days, DEFAULT_TIMEZONE)

    const slots = await getPublicAvailableSlots({
      profileSlug,
      startDate: todayStr,
      endDate: in7DaysStr,
    })

    if (!slots || slots.length === 0) {
      return { status: 'NO_SIGNAL' }
    }

    const hasSlotToday = slots.some((slot) => slot.localDate === todayStr)
    if (hasSlotToday) {
      return {
        status: 'AVAILABLE_TODAY',
        labelPt: 'Disponível hoje',
        labelEn: 'Available today',
      }
    }

    return {
      status: 'AVAILABLE_THIS_WEEK',
      labelPt: 'Disponibilidade esta semana',
      labelEn: 'Available this week',
    }
  } catch {
    // Fail-closed on any unexpected failure or missing profile
    return { status: 'NO_SIGNAL' }
  }
}

/**
 * Aggregates complete availability state for the authenticated professional dashboard.
 * Executes bounded parallel reads (summary + service areas) and generates owner preview slots.
 */
export async function getProfessionalAvailabilityDashboardDTO(
  profileId: string
): Promise<ProfessionalAvailabilityDashboardDTO> {
  const [summary, profileLocations] = await Promise.all([
    getProfessionalScheduleSummary(profileId),
    getProfileLocations(profileId),
  ])

  const timezone = summary.settings.timezone || DEFAULT_TIMEZONE
  const now = new Date()
  const todayDate = getLocalDateInTimezone(now, timezone)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in7DaysStr = getLocalDateInTimezone(in7Days, timezone)

  // Map service areas with public-safe names and active status
  const serviceAreas = profileLocations
    .filter((pl) => pl.location?.active)
    .map((pl) => ({
      id: pl.location_id,
      name: pl.location?.name ?? 'Região',
      slug: pl.location?.slug ?? '',
      isPrimary: Boolean(pl.is_primary),
    }))

  const locationNameMap = new Map<string, string>()
  for (const sa of serviceAreas) {
    locationNameMap.set(sa.id, sa.name)
  }

  // Upcoming exceptions (date >= today in professional timezone)
  const upcomingExceptions = summary.exceptions.filter(
    (ex) => ex.exceptionDate >= todayDate
  )

  // Check if today is marked CLOSED_DAY (all areas or global)
  const isUnavailableToday = upcomingExceptions.some(
    (ex) => ex.exceptionDate === todayDate && ex.exceptionType === 'CLOSED_DAY' && !ex.locationId
  )

  // Generate bounded owner preview slots (next 7 days, up to 10 slots)
  let previewSlots: ProfessionalAvailabilityDashboardDTO['previewSlots'] = []
  if (summary.settings.enabled) {
    const rawSlots = generateAvailableSlots({
      settings: summary.settings,
      weeklyRules: summary.weeklyRules,
      exceptions: summary.exceptions,
      startDate: todayDate,
      endDate: in7DaysStr,
      now,
    })

    previewSlots = rawSlots.slice(0, 10).map((s) => ({
      startIso: s.startIso,
      endIso: s.endIso,
      localDate: s.localDate,
      localStartTime: s.localStartTime,
      localEndTime: s.localEndTime,
      locationName: s.locationId ? locationNameMap.get(s.locationId) ?? null : null,
    }))
  }

  return {
    profileId,
    settings: summary.settings,
    weeklyRules: summary.weeklyRules,
    upcomingExceptions,
    serviceAreas,
    todayDate,
    isUnavailableToday,
    previewSlots,
  }
}
