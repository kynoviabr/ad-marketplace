/**
 * PX3 — Pure Availability Engine
 *
 * Deterministic generation of inquiry slots from recurring weekly schedules,
 * date exceptions, notice/advance rules, and operating preferences.
 *
 * Pure function module: NO database calls, NO side effects, zero external runtime dependencies.
 */

import type {
  AvailabilityException,
  AvailabilitySettings,
  DayOfWeek,
  InquirySlot,
  SlotGenerationParams,
  TimeWindow,
  WeeklyAvailabilityRule,
} from './types'

const MAX_SEARCH_RANGE_DAYS = 90
const DOW_MAP: Record<string, DayOfWeek> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
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

/**
 * Clips a set of base available windows by subtracting blocked intervals.
 * Returns non-overlapping, strictly positive continuous windows.
 */
export function clipWindows(baseWindows: TimeWindow[], blockedWindows: TimeWindow[]): TimeWindow[] {
  if (baseWindows.length === 0) return []
  if (blockedWindows.length === 0) return [...baseWindows]

  let currentWindows = baseWindows.map((w) => ({
    start: timeToMinutes(w.startTime),
    end: timeToMinutes(w.endTime),
  }))

  const blocked = blockedWindows
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

/** Formats a local date and time in the specified timezone into an unambiguous ISO-8601 string. */
export function localToIso(localDate: string, localTime: string, timezone: string = 'America/Sao_Paulo'): string {
  const cleanTime = normalizeTime(localTime)
  const [h, m] = cleanTime.split(':')
  const roughUtc = new Date(`${localDate}T${h}:${m}:00Z`)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(roughUtc)

  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value
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

  return `${localDate}T${h}:${m}:00${offset}`
}

/** Determines day of week (0..6) for a given date in the target timezone. */
export function getDayOfWeekInTimezone(dateStr: string, timezone: string = 'America/Sao_Paulo'): DayOfWeek {
  const parts = dateStr.split('-').map(Number)
  const roughUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0))
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' })
  const dowName = fmt.format(roughUtc)
  const dow = DOW_MAP[dowName]
  if (dow === undefined) {
    throw new Error(`Unable to determine day of week for date ${dateStr} in timezone ${timezone}`)
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

    // Check notice window (slot start must be >= noticeLimitDate)
    // Check max advance window (slot start must be <= maxAdvanceLimitDate)
    if (startDate >= noticeLimitDate && startDate <= maxAdvanceLimitDate) {
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

    curStart += slotIntervalMinutes
  }

  return slots
}

/**
 * Pure generator function: derives all available inquiry slots in the specified date range.
 * Fully deterministic given input parameters and current time clock.
 */
export function generateAvailableSlots(params: SlotGenerationParams): InquirySlot[] {
  const {
    settings,
    weeklyRules,
    exceptions,
    startDate,
    endDate,
    targetLocationId = null,
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

  const timezone = settings.timezone || 'America/Sao_Paulo'
  const noticeLimitDate = new Date(now.getTime() + settings.minimumNoticeMinutes * 60 * 1000)
  const maxAdvanceLimitDate = new Date(now.getTime() + settings.maximumAdvanceDays * 24 * 60 * 60 * 1000)

  const allSlots: InquirySlot[] = []

  for (let d = 0; d <= daysDiff; d++) {
    const currentDayDate = new Date(startUtc + d * 86400000)
    const localDate = currentDayDate.toISOString().split('T')[0]
    const dow = getDayOfWeekInTimezone(localDate, timezone)

    // Filter exceptions relevant to this date and location scope
    const dayExceptions = exceptions.filter((e) => {
      if (e.exceptionDate !== localDate) return false
      if (!targetLocationId) return true
      return e.locationId === null || e.locationId === targetLocationId
    })

    // 1. Closed day precedence
    const isClosed = dayExceptions.some((e) => e.exceptionType === 'CLOSED_DAY')
    if (isClosed) {
      continue
    }

    // 2. Custom hours vs Weekly schedule
    const customHoursExceptions = dayExceptions.filter(
      (e) => e.exceptionType === 'CUSTOM_HOURS' && e.startTime && e.endTime
    )

    let baseWindows: TimeWindow[] = []
    if (customHoursExceptions.length > 0) {
      baseWindows = customHoursExceptions.map((e) => ({
        startTime: normalizeTime(e.startTime!),
        endTime: normalizeTime(e.endTime!),
      }))
    } else {
      // Weekly rules matching day of week and location scope
      const matchingRules = weeklyRules.filter((r) => {
        if (r.dayOfWeek !== dow) return false
        if (!targetLocationId) return true
        return r.locationId === null || r.locationId === targetLocationId
      })

      baseWindows = matchingRules.map((r) => ({
        startTime: normalizeTime(r.startTime),
        endTime: normalizeTime(r.endTime),
      }))
    }

    if (baseWindows.length === 0) {
      continue
    }

    // 3. Subtract blocked intervals
    const blockedIntervals: TimeWindow[] = dayExceptions
      .filter((e) => e.exceptionType === 'BLOCKED_INTERVAL' && e.startTime && e.endTime)
      .map((e) => ({
        startTime: normalizeTime(e.startTime!),
        endTime: normalizeTime(e.endTime!),
      }))

    const activeWindows = clipWindows(baseWindows, blockedIntervals)

    // 4. Generate slots for each continuous window
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
      })
      allSlots.push(...windowSlots)
    }
  }

  return allSlots
}
