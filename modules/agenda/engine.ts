/**
 * PX3 — Pure Availability Engine
 *
 * Deterministic generation of inquiry slots from recurring weekly schedules,
 * date exceptions, notice/advance rules, operating preferences, and location scoping.
 *
 * Pure function module: NO database calls, NO side effects, zero external runtime dependencies.
 */

import type {
  AvailabilityException,
  AvailabilitySettings,
  BusyInterval,
  DayOfWeek,
  InquirySlot,
  SlotGenerationParams,
  TimeWindow,
  WeeklyAvailabilityRule,
} from './types'

export const MAX_SEARCH_RANGE_DAYS = 90
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

const DOW_MAP: Record<string, DayOfWeek> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Validates whether an IANA timezone identifier is valid and supported by the runtime. */
export function isValidIanaTimezone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== 'string' || tz.trim() === '') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() })
    return true
  } catch {
    return false
  }
}

/** Converts "HH:mm" or "HH:mm:ss" to total minutes from midnight (0..1439). */
export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) {
    throw new Error(`Invalid time string format: ${timeStr}`)
  }
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${timeStr}`)
  }
  return hours * 60 + minutes
}

/** Converts total minutes (0..1440) to "HH:mm". */
export function minutesToTime(minutes: number): string {
  const bounded = Math.max(0, Math.min(1440, minutes))
  const h = Math.floor(bounded / 60)
  const m = bounded % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Normalizes a time string to clean "HH:mm". */
export function normalizeTime(timeStr: string): string {
  return minutesToTime(timeToMinutes(timeStr))
}

/** Checks whether any windows in the array overlap with each other. */
export function hasOverlappingWindows(windows: TimeWindow[]): boolean {
  if (windows.length <= 1) return false
  const sorted = [...windows]
    .map((w) => ({ start: timeToMinutes(w.startTime), end: timeToMinutes(w.endTime) }))
    .sort((a, b) => a.start - b.start)

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end > sorted[i + 1].start) {
      return true
    }
  }
  return false
}

/** Merges overlapping or touching time windows into a unified sorted list of intervals. */
export function mergeOverlappingWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length <= 1) return [...windows]

  const intervals = windows
    .map((w) => ({ start: timeToMinutes(w.startTime), end: timeToMinutes(w.endTime) }))
    .filter((i) => i.start < i.end)
    .sort((a, b) => a.start - b.start)

  if (intervals.length === 0) return []

  const merged: { start: number; end: number }[] = [intervals[0]]

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      // Overlapping or touching: merge
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }

  return merged.map((m) => ({
    startTime: minutesToTime(m.start),
    endTime: minutesToTime(m.end),
  }))
}

/**
 * Clips a set of base available windows by subtracting blocked intervals.
 * Returns non-overlapping, strictly positive continuous windows.
 */
export function clipWindows(baseWindows: TimeWindow[], blockedWindows: TimeWindow[]): TimeWindow[] {
  if (baseWindows.length === 0) return []
  if (blockedWindows.length === 0) return mergeOverlappingWindows(baseWindows)

  let currentWindows = mergeOverlappingWindows(baseWindows).map((w) => ({
    start: timeToMinutes(w.startTime),
    end: timeToMinutes(w.endTime),
  }))

  const blocked = mergeOverlappingWindows(blockedWindows)
    .map((w) => ({
      start: timeToMinutes(w.startTime),
      end: timeToMinutes(w.endTime),
    }))
    .filter((b) => b.start < b.end)

  for (const block of blocked) {
    const nextWindows: { start: number; end: number }[] = []
    for (const win of currentWindows) {
      // 1. No overlap: block is strictly after or before window
      if (block.end <= win.start || block.start >= win.end) {
        nextWindows.push(win)
        continue
      }
      // 2. Complete block: block engulfs entire window
      if (block.start <= win.start && block.end >= win.end) {
        continue
      }
      // 3. Block punches hole in the middle of window: split into two
      if (block.start > win.start && block.end < win.end) {
        nextWindows.push({ start: win.start, end: block.start })
        nextWindows.push({ start: block.end, end: win.end })
        continue
      }
      // 4. Block overlaps start of window: advance start
      if (block.start <= win.start && block.end < win.end) {
        nextWindows.push({ start: block.end, end: win.end })
        continue
      }
      // 5. Block overlaps end of window: trim end
      if (block.start > win.start && block.end >= win.end) {
        nextWindows.push({ start: win.start, end: block.start })
        continue
      }
    }
    currentWindows = nextWindows
  }

  return currentWindows
    .filter((w) => w.start < w.end)
    .sort((a, b) => a.start - b.start)
    .map((w) => ({
      startTime: minutesToTime(w.start),
      endTime: minutesToTime(w.end),
    }))
}

/**
 * Converts a local wall-clock date and time in the specified IANA timezone into an exact,
 * unambiguous ISO-8601 string.
 *
 * Implements a fixed-point convergence algorithm to resolve true UTC timestamp and offset,
 * safely handling:
 * - Positive and negative UTC offsets
 * - DST spring-forward transitions (non-existent local hour)
 * - DST fall-back ambiguous hours
 * - Month and year rollovers
 * - Leap days
 */
export function localToIso(
  localDate: string,
  localTime: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const targetTz = isValidIanaTimezone(timezone) ? timezone.trim() : DEFAULT_TIMEZONE
  const cleanTime = normalizeTime(localTime)
  const [year, month, day] = localDate.split('-').map(Number)
  const [hour, minute] = cleanTime.split(':').map(Number)

  const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute)

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  function getLocalMs(utcMs: number): number {
    const parts = dtf.formatToParts(new Date(utcMs))
    const p: Record<string, string> = {}
    for (const part of parts) p[part.type] = part.value
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  }

  // Iterative convergence to find the true UTC timestamp representing this wall-clock time
  let utcMs = targetLocalMs
  let offsetMs = getLocalMs(utcMs) - targetLocalMs
  utcMs -= offsetMs
  offsetMs = getLocalMs(utcMs) - targetLocalMs
  utcMs -= offsetMs

  const resolvedUtcDate = new Date(utcMs)

  // Resolve the exact offset string at this precise UTC instant in the target timezone
  const offsetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: targetTz,
    timeZoneName: 'longOffset',
  }).formatToParts(resolvedUtcDate)

  const tzPart = offsetParts.find((p) => p.type === 'timeZoneName')?.value
  let offset = '+00:00'
  if (tzPart && tzPart.startsWith('GMT')) {
    const match = tzPart.match(/GMT([+-]\d{1,2}):?(\d{2})?/)
    if (match) {
      const sign = match[1][0]
      const hours = match[1].slice(1).padStart(2, '0')
      const mins = match[2] ? match[2].padStart(2, '0') : '00'
      offset = `${sign}${hours}:${mins}`
    }
  }

  const hStr = String(hour).padStart(2, '0')
  const mStr = String(minute).padStart(2, '0')
  return `${localDate}T${hStr}:${mStr}:00${offset}`
}

/** Determines day of week (0..6) for a given date in the target timezone. */
export function getDayOfWeekInTimezone(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE
): DayOfWeek {
  const targetTz = isValidIanaTimezone(timezone) ? timezone.trim() : DEFAULT_TIMEZONE
  const parts = dateStr.split('-').map(Number)
  const roughUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0))
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: targetTz, weekday: 'short' })
  const dowName = fmt.format(roughUtc)
  const dow = DOW_MAP[dowName]
  if (dow === undefined) {
    throw new Error(`Unable to determine day of week for date ${dateStr} in timezone ${targetTz}`)
  }
  return dow
}

/** Generates discrete inquiry slots for a given continuous time window. */
export function generateSlotsForWindow(params: {
  profileId: string
  localDate: string
  window: TimeWindow
  slotDurationMinutes: number
  slotIntervalMinutes: number
  timezone: string
  locationId?: string | null
  noticeLimitDate: Date
  maxAdvanceLimitDate: Date
  busyIntervals?: BusyInterval[]
}): InquirySlot[] {
  const {
    profileId,
    localDate,
    window,
    slotDurationMinutes,
    slotIntervalMinutes,
    timezone,
    locationId,
    noticeLimitDate,
    maxAdvanceLimitDate,
    busyIntervals = [],
  } = params

  const winStart = timeToMinutes(window.startTime)
  const winEnd = timeToMinutes(window.endTime)
  const slots: InquirySlot[] = []

  let curStart = winStart
  while (curStart + slotDurationMinutes <= winEnd) {
    const curEnd = curStart + slotDurationMinutes
    const localStartStr = minutesToTime(curStart)
    const localEndStr = minutesToTime(curEnd)

    const startIso = localToIso(localDate, localStartStr, timezone)
    const endIso = localToIso(localDate, localEndStr, timezone)
    const startDate = new Date(startIso)
    const endDate = new Date(endIso)

    // Check notice window (slot start must be >= noticeLimitDate)
    // Check max advance window (slot start must be <= maxAdvanceLimitDate)
    if (startDate >= noticeLimitDate && startDate <= maxAdvanceLimitDate) {
      // Check collision with busy intervals adapter if provided
      const collidesWithBusy = busyIntervals.some((busy) => {
        const busyStart = new Date(busy.startIso).getTime()
        const busyEnd = new Date(busy.endIso).getTime()
        const slotStartMs = startDate.getTime()
        const slotEndMs = endDate.getTime()
        return slotStartMs < busyEnd && slotEndMs > busyStart
      })

      if (!collidesWithBusy) {
        slots.push({
          slotId: `${profileId}:${startIso}`,
          profileId,
          startIso,
          endIso,
          localDate,
          localStartTime: localStartStr,
          localEndTime: localEndStr,
          locationId: locationId ?? null,
        })
      }
    }

    curStart += slotIntervalMinutes
  }

  return slots
}

/**
 * Pure generator function: derives all available inquiry slots in the specified date range.
 * Fully deterministic given input parameters and current time clock.
 *
 * CANONICAL SPECIFICITY & PRECEDENCE HIERARCHY:
 * 1. Disabled availability -> 0 slots.
 * 2. CLOSED_DAY:
 *    - location-specific CLOSED_DAY closes that location.
 *    - global CLOSED_DAY closes all locations UNLESS overridden by location-specific CUSTOM_HOURS.
 * 3. Base Windows:
 *    - If location CUSTOM_HOURS exist for matching targetLocationId: they replace recurring schedule.
 *    - Else if global CUSTOM_HOURS exist (locationId === null): they replace global recurring schedule.
 *    - Else weekly rules:
 *      - If targetLocationId specified: location-specific rules override global rules for that location.
 *      - If no location-specific rules exist: fallback to global weekly rules.
 *      - If querying global (targetLocationId === null): merge all active rules.
 * 4. BLOCKED_INTERVAL:
 *    - Both global and matching location blocked intervals subtract from available windows.
 * 5. BusyIntervals adapter:
 *    - Any active busy intervals subtract/filter candidate slots.
 * 6. Duplicate suppression:
 *    - Mathematical interval merging + unique slotId Set guarantees zero duplicate slots.
 */
export function generateAvailableSlots(params: SlotGenerationParams): InquirySlot[] {
  const {
    settings,
    weeklyRules,
    exceptions,
    startDate,
    endDate,
    targetLocationId = null,
    busyIntervals = [],
    now = new Date(),
  } = params

  if (!settings.enabled) {
    return []
  }

  if (settings.slotDurationMinutes <= 0 || settings.slotIntervalMinutes <= 0) {
    return []
  }

  const startParts = startDate.split('-').map(Number)
  const endParts = endDate.split('-').map(Number)
  if (startParts.length !== 3 || endParts.length !== 3) {
    return []
  }

  const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2])
  const endUtc = Date.UTC(endParts[0], endParts[1] - 1, endParts[2])

  if (startUtc > endUtc) {
    return []
  }

  // Bounded iteration limit
  const daysDiff = Math.floor((endUtc - startUtc) / 86400000)
  if (daysDiff > MAX_SEARCH_RANGE_DAYS) {
    throw new Error(`Date range exceeds maximum allowed limit of ${MAX_SEARCH_RANGE_DAYS} days`)
  }

  const timezone = isValidIanaTimezone(settings.timezone)
    ? settings.timezone.trim()
    : DEFAULT_TIMEZONE

  const noticeLimitDate = new Date(now.getTime() + settings.minimumNoticeMinutes * 60 * 1000)
  const maxAdvanceLimitDate = new Date(now.getTime() + settings.maximumAdvanceDays * 24 * 60 * 60 * 1000)

  const allSlots: InquirySlot[] = []
  const seenSlotIds = new Set<string>()

  for (let d = 0; d <= daysDiff; d++) {
    const currentDayDate = new Date(startUtc + d * 86400000)
    const localDate = currentDayDate.toISOString().split('T')[0]
    const dow = getDayOfWeekInTimezone(localDate, timezone)

    // Exceptions for this date
    const dayExceptions = exceptions.filter((e) => e.exceptionDate === localDate)

    const locClosed = targetLocationId
      ? dayExceptions.some((e) => e.exceptionType === 'CLOSED_DAY' && e.locationId === targetLocationId)
      : false

    if (locClosed) {
      // Specific location is closed for this date
      continue
    }

    const globalClosed = dayExceptions.some(
      (e) => e.exceptionType === 'CLOSED_DAY' && (e.locationId === null || e.locationId === undefined)
    )

    const locCustomHours = targetLocationId
      ? dayExceptions.filter(
          (e) => e.exceptionType === 'CUSTOM_HOURS' && e.locationId === targetLocationId && e.startTime && e.endTime
        )
      : []

    // If globally closed and no specific custom hours override this location, date is closed
    if (globalClosed && locCustomHours.length === 0) {
      continue
    }

    // Determine Base Windows
    let baseWindows: TimeWindow[] = []

    if (locCustomHours.length > 0) {
      // 1. Specific location custom hours override
      baseWindows = locCustomHours.map((e) => ({
        startTime: normalizeTime(e.startTime!),
        endTime: normalizeTime(e.endTime!),
      }))
    } else {
      const globalCustomHours = dayExceptions.filter(
        (e) =>
          e.exceptionType === 'CUSTOM_HOURS' &&
          (e.locationId === null || e.locationId === undefined) &&
          e.startTime &&
          e.endTime
      )

      if (globalCustomHours.length > 0) {
        // 2. Global custom hours override
        baseWindows = globalCustomHours.map((e) => ({
          startTime: normalizeTime(e.startTime!),
          endTime: normalizeTime(e.endTime!),
        }))
      } else {
        // 3. Weekly recurring rules
        const dayRules = weeklyRules.filter((r) => r.dayOfWeek === dow)

        if (targetLocationId) {
          const locRules = dayRules.filter((r) => r.locationId === targetLocationId)
          if (locRules.length > 0) {
            // Location-specific weekly schedule overrides global
            baseWindows = locRules.map((r) => ({
              startTime: normalizeTime(r.startTime),
              endTime: normalizeTime(r.endTime),
            }))
          } else {
            // Fallback to global weekly schedule
            const globalRules = dayRules.filter((r) => r.locationId === null || r.locationId === undefined)
            baseWindows = globalRules.map((r) => ({
              startTime: normalizeTime(r.startTime),
              endTime: normalizeTime(r.endTime),
            }))
          }
        } else {
          // Global query: union all rules for this day
          baseWindows = dayRules.map((r) => ({
            startTime: normalizeTime(r.startTime),
            endTime: normalizeTime(r.endTime),
          }))
        }
      }
    }

    if (baseWindows.length === 0) {
      continue
    }

    // Merge base windows to normalize overlaps
    const normalizedBaseWindows = mergeOverlappingWindows(baseWindows)

    // 4. Subtract blocked intervals (both global and matching location)
    const relevantBlockedExceptions = dayExceptions.filter((e) => {
      if (e.exceptionType !== 'BLOCKED_INTERVAL' || !e.startTime || !e.endTime) return false
      if (!targetLocationId) return true
      return e.locationId === null || e.locationId === undefined || e.locationId === targetLocationId
    })

    const blockedWindows: TimeWindow[] = relevantBlockedExceptions.map((e) => ({
      startTime: normalizeTime(e.startTime!),
      endTime: normalizeTime(e.endTime!),
    }))

    const activeWindows = clipWindows(normalizedBaseWindows, blockedWindows)

    // 5. Generate slots for each continuous window
    for (const win of activeWindows) {
      const windowSlots = generateSlotsForWindow({
        profileId: settings.profileId,
        localDate,
        window: win,
        slotDurationMinutes: settings.slotDurationMinutes,
        slotIntervalMinutes: settings.slotIntervalMinutes,
        timezone,
        locationId: targetLocationId,
        noticeLimitDate,
        maxAdvanceLimitDate,
        busyIntervals,
      })

      for (const slot of windowSlots) {
        if (!seenSlotIds.has(slot.slotId)) {
          seenSlotIds.add(slot.slotId)
          allSlots.push(slot)
        }
      }
    }
  }

  return allSlots
}
