'use server'

import { requireAdmin } from '@/modules/moderation/guards'
import { getSystemHealthSnapshot, type SystemHealthSnapshot } from '@/modules/observability/health'
import { generateRequestId } from '@/modules/observability/request-id'

/**
 * Server Action: Re-evaluates all platform health probes on operator request.
 *
 * Enforces server-side requireAdmin() guard.
 * Performs zero data mutations or synthetic user creation.
 */
export async function refreshHealthSnapshotAction(): Promise<SystemHealthSnapshot> {
  // 1. Enforce strict Admin authorization boundary
  await requireAdmin()

  // 2. Generate correlation ID for the manual recheck operation
  const operationId = generateRequestId()

  // 3. Obtain fresh canonical snapshot from PX1B engine
  const snapshot = await getSystemHealthSnapshot({
    correlationId: operationId,
    timeoutMs: 4000,
  })

  return snapshot
}
