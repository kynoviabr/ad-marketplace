import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerificationProvider } from '@/modules/verification/providers/factory'
import { getVerificationBySessionId } from '@/modules/verification/dal'
import { isTerminalState } from '@/modules/verification/state-machine'

/**
 * Route Handler: POST /api/webhooks/didit
 *
 * Implements strict event ledger idempotency, HMAC-SHA256 signature verification,
 * authoritative server-to-server decision retrieval, and terminal state protection.
 */
export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  let rawBody: Buffer

  try {
    const arrayBuffer = await request.arrayBuffer()
    rawBody = Buffer.from(arrayBuffer)
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  // 1. Convert headers into a standard record
  const headersRecord: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headersRecord[key.toLowerCase()] = value
  })

  // 2. Cryptographic signature verification
  const provider = getVerificationProvider()
  const parsedEvent = await provider.verifyWebhook(rawBody, headersRecord)

  if (!parsedEvent) {
    console.warn('[webhook:didit] Rejected request: missing or invalid signature')
    return NextResponse.json({ error: 'Invalid or missing signature' }, { status: 401 })
  }

  const { eventId, sessionId, eventType } = parsedEvent

  // 3. Database-enforced idempotency via Event Ledger (ON CONFLICT DO NOTHING)
  const { data: insertedEvent, error: insertError } = await admin
    .from('verification_webhook_events')
    .insert({
      provider: provider.providerName,
      provider_event_id: eventId,
      provider_session_id: sessionId,
      event_type: eventType,
      processing_status: 'RECEIVED',
    })
    .select('id')
    .maybeSingle()

  if (insertError) {
    // Unique constraint violation or DB error
    if (insertError.code === '23505') {
      // 23505 = unique_violation
      return NextResponse.json({ message: 'Event already received and processed' }, { status: 200 })
    }
    console.error('[webhook:didit] Failed to record event ledger:', insertError.message)
    return NextResponse.json({ error: 'Internal server error recording event' }, { status: 500 })
  }

  if (!insertedEvent) {
    // In case of conflict with DO NOTHING
    return NextResponse.json({ message: 'Duplicate event ignored' }, { status: 200 })
  }

  const ledgerId = insertedEvent.id

  try {
    // 4. Correlate with internal verification record
    const verificationRecord = await getVerificationBySessionId(sessionId)
    if (!verificationRecord) {
      console.warn('[webhook:didit] Session ID not found in database:', sessionId.slice(0, 8) + '***')
      await admin
        .from('verification_webhook_events')
        .update({
          processing_status: 'IGNORED',
          error_message: 'Session record not found',
          processed_at: new Date().toISOString(),
        })
        .eq('id', ledgerId)

      return NextResponse.json({ message: 'Session not found, event ignored' }, { status: 200 })
    }

    // 5. Terminal state protection: Do not degrade VERIFIED records
    if (isTerminalState(verificationRecord.status)) {
      console.info('[webhook:didit] Terminal state VERIFIED protected against incoming update')
      await admin
        .from('verification_webhook_events')
        .update({
          processing_status: 'IGNORED',
          error_message: 'Terminal state protected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', ledgerId)

      return NextResponse.json({ message: 'Terminal state protected' }, { status: 200 })
    }

    // 6. Fetch authoritative decision from provider (Zero Trust on webhook payload)
    const decision = await provider.fetchAuthoritativeDecision(sessionId)
    const now = new Date().toISOString()

    // 7. Update verification record with authoritative results
    const { error: updateError } = await admin
      .from('identity_verifications')
      .update({
        status: decision.normalizedStatus,
        identity_verified: decision.identityVerified,
        age_verified: decision.ageVerified,
        cpf_verified: decision.cpfVerified,
        verified_country: decision.verifiedCountry,
        submitted_at: now,
        verified_at: decision.verifiedAt,
        updated_at: now,
      })
      .eq('id', verificationRecord.id)

    if (updateError) {
      throw new Error(`Failed to update identity verification: ${updateError.message}`)
    }

    // 8. If decision is VERIFIED, advance account onboarding_step to at least 3 monotonically
    if (decision.normalizedStatus === 'VERIFIED') {
      const { error: accountUpdateError } = await admin
        .from('account_users')
        .update({
          onboarding_step: 3, // KYC verified -> ready for Profile (FASE 03)
          updated_at: now,
        })
        .eq('id', verificationRecord.account_user_id)
        .lt('onboarding_step', 3) // Monotonic update

      if (accountUpdateError) {
        console.error('[webhook:didit] Error advancing account onboarding_step:', accountUpdateError.message)
      }
    }

    // 9. Mark ledger as PROCESSED
    await admin
      .from('verification_webhook_events')
      .update({
        processing_status: 'PROCESSED',
        processed_at: now,
      })
      .eq('id', ledgerId)

    return NextResponse.json({
      success: true,
      status: decision.normalizedStatus,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during webhook processing'
    console.error('[webhook:didit] Processing error:', errorMsg)

    await admin
      .from('verification_webhook_events')
      .update({
        processing_status: 'FAILED',
        error_message: errorMsg,
        processed_at: new Date().toISOString(),
      })
      .eq('id', ledgerId)

    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}
