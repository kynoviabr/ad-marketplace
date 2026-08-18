/**
 * Fair Rotation Engine — FASE 08
 *
 * Implements deterministic time-bucketed fair rotation across active sponsored campaigns.
 * Guarantees equal impression exposure among all paying advertisers in a given scope
 * without requiring Redis or distributed state.
 *
 * Invariants:
 * 1. Scope-Aware: Scope type and location ID participate directly in the hash seed.
 * 2. Time-Bucketed: Rotation shifts deterministically each hour (ROTATION_BUCKET_MINUTES).
 * 3. Stable Within Bucket: Page 1 and Page 2 queries within the same hour evaluate the same order.
 * 4. Zero Pay-to-Win: Amount paid or creation timestamp never dictates ranking order.
 */

import { createHash } from 'crypto'
import { ROTATION_BUCKET_MINUTES } from './constants'

/**
 * Computes a standardized time-bucket string (e.g. "2026-08-18T20:00").
 */
export function getRotationBucket(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  
  // Bucket by minutes (default 60 min -> top of each hour)
  const minuteBucket = Math.floor(date.getUTCMinutes() / ROTATION_BUCKET_MINUTES) * ROTATION_BUCKET_MINUTES
  const minutes = String(minuteBucket).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Computes a deterministic hash score for a profile in a specific scope and time bucket.
 */
export function computeRotationScore(params: {
  profileId: string
  scopeType: string
  scopeId: string
  date?: Date
}): string {
  const bucket = getRotationBucket(params.date)
  const seed = `${params.scopeType}:${params.scopeId}:${bucket}:${params.profileId}`
  return createHash('sha256').update(seed).digest('hex')
}

/**
 * Sorts an array of candidates deterministically based on their fair rotation score.
 */
export function sortCandidatesByFairRotation<T extends { profileId: string }>(
  candidates: T[],
  scopeType: string,
  scopeId: string,
  date: Date = new Date()
): T[] {
  if (candidates.length <= 1) return [...candidates]

  return [...candidates].sort((a, b) => {
    const scoreA = computeRotationScore({
      profileId: a.profileId,
      scopeType,
      scopeId,
      date,
    })
    const scoreB = computeRotationScore({
      profileId: b.profileId,
      scopeType,
      scopeId,
      date,
    })
    return scoreA.localeCompare(scoreB)
  })
}
