import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerificationProvider } from '@/modules/verification/providers/factory'
import { getVerificationBySessionId } from '@/modules/verification/dal'
import { isTerminalState } from '@/modules/verification/state-machine'
import { logger, getRequestId } from '@/modules/observability'

/**
 * Route Handler: POST /api/webhooks/didit
 *
 * Implements strict event ledger idempotency, HMAC-SHA256 signature verification,
 * authoritative server-to-server decision retrieval, terminal state protection,
 * and recovery reprocessing for FAILED or interrupted RECEIVED events.
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const admin = createAdminClient()

  const respond = (body: unknown, status: number = 200) => {
    return NextResponse.json(body, {
      status,
      headers: { 'x-request-id': requestId },
    })
  }

  let rawBody: Buffer

  try {
    const arrayBuffer = await request.arrayBuffer()
    rawBody = Buffer.from(arrayBuffer)
  } catch {
    return respond({ error: 'Failed to read request body' }, 400)
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
    logger.warn('kyc.didit.webhook_rejected', {
      subsystem: 'KYC',
      requestId,
      outcome: 'REJECTED',
      errorCode: 'INVALID_SIGNATURE',
    })
    return respond({ error: 'Invalid or missing signature' }, 401)
  }

  const { eventId, sessionId, eventType } = parsedEvent

  // 3. Acquire or create ledger record
  let ledgerId: string
  let isReprocessingRetry = false

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
    // Unique constraint violation: duplicate event delivery or provider retry
    if (insertError.code === '23505') {
      const { data: existingLedger, error: fetchError } = await admin
        .from('verification_webhook_events')
        .select('id, processing_status, provider_session_id')
        .eq('provider', provider.providerName)
        .eq('provider_event_id', eventId)
        .maybeSingle()

      if (fetchError || !existingLedger) {
        logger.error('kyc.didit.webhook_failed', {
          subsystem: 'KYC',
          requestId,
          outcome: 'FAILURE',
          errorCode: 'FETCH_LEDGER_FAILED',
          error: fetchError,
        })
        return respond({ error: 'Internal server error resolving event' }, 500)
      }

      // Idempotent completion: return 200 without duplicate side effects
      if (existingLedger.processing_status === 'PROCESSED') {
        return respond({ message: 'Event already received and processed' }, 200)
      }

      if (existingLedger.processing_status === 'IGNORED') {
        return respond({ message: 'Event previously ignored' }, 200)
      }

      // Recoverable states: FAILED (previous attempt failed) or RECEIVED (interrupted execution)
      ledgerId = existingLedger.id
      isReprocessingRetry = true
      logger.info('kyc.didit.webhook_recovered', {
        subsystem: 'KYC',
        requestId,
        outcome: 'RECOVERED',
        metadata: {
          provider: provider.providerName,
          processingStatus: existingLedger.processing_status,
        },
      })
    } else {
      logger.error('kyc.didit.webhook_failed', {
        subsystem: 'KYC',
        requestId,
        outcome: 'FAILURE',
        errorCode: 'RECORD_LEDGER_FAILED',
        error: insertError,
      })
      return respond({ error: 'Internal server error recording event' }, 500)
    }
  } else if (insertedEvent) {
    ledgerId = insertedEvent.id
  } else {
    // Fallback in case of conflict without explicit error code
    const { data: existingLedger } = await admin
      .from('verification_webhook_events')
      .select('id, processing_status')
      .eq('provider', provider.providerName)
      .eq('provider_event_id', eventId)
      .maybeSingle()

    if (existingLedger?.processing_status === 'PROCESSED') {
      return respond({ message: 'Event already received and processed' }, 200)
    }
    if (existingLedger?.processing_status === 'IGNORED') {
      return respond({ message: 'Event previously ignored' }, 200)
    }
    if (existingLedger?.id) {
      ledgerId = existingLedger.id
      isReprocessingRetry = true
    } else {
      return respond({ message: 'Duplicate event ignored' }, 200)
    }
  }

  // 4. Authoritative event processing
  try {
    // If reprocessing a retry, reset error_message
    if (isReprocessingRetry) {
      await admin
        .from('verification_webhook_events')
        .update({
          error_message: null,
        })
        .eq('id', ledgerId)
    }

    // Correlate with internal verification record
    const verificationRecord = await getVerificationBySessionId(sessionId)
    if (!verificationRecord) {
      logger.warn('kyc.didit.webhook_ignored', {
        subsystem: 'KYC',
        requestId,
        outcome: 'SKIPPED',
        errorCode: 'SESSION_NOT_FOUND',
      })
      await admin
        .from('verification_webhook_events')
        .update({
          processing_status: 'IGNORED',
          error_message: 'Session record not found',
          processed_at: new Date().toISOString(),
        })
        .eq('id', ledgerId)

      return respond({ message: 'Session not found, event ignored' }, 200)
    }

    // Terminal state protection: Do not degrade VERIFIED records
    if (isTerminalState(verificationRecord.status)) {
      logger.info('kyc.didit.webhook_ignored', {
        subsystem: 'KYC',
        requestId,
        outcome: 'SKIPPED',
        metadata: { reason: 'TERMINAL_STATE_PROTECTED' },
      })
      await admin
        .from('verification_webhook_events')
        .update({
          processing_status: 'IGNORED',
          error_message: 'Terminal state protected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', ledgerId)

      return respond({ message: 'Terminal state protected' }, 200)
    }

    // Fetch authoritative decision from provider (Zero Trust on webhook payload)
    const decision = await provider.fetchAuthoritativeDecision(sessionId)
    const now = new Date().toISOString()

    // Update verification record with authoritative results
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

    // Advance only when both identity and adult-age checks are authoritative
    if (decision.normalizedStatus === 'VERIFIED' && decision.identityVerified && decision.ageVerified) {
      const { error: accountUpdateError } = await admin
        .from('account_users')
        .update({
          onboarding_step: 5,
          updated_at: now,
        })
        .eq('id', verificationRecord.account_user_id)
        .lt('onboarding_step', 5)

      if (accountUpdateError) {
        logger.error('kyc.didit.account_advance_failed', {
          subsystem: 'KYC',
          requestId,
          outcome: 'FAILURE',
          error: accountUpdateError,
        })
      }
    }

    // Mark ledger as PROCESSED
    await admin
      .from('verification_webhook_events')
      .update({
        processing_status: 'PROCESSED',
        error_message: null,
        processed_at: now,
      })
      .eq('id', ledgerId)

    logger.info('kyc.didit.webhook_processed', {
      subsystem: 'KYC',
      requestId,
      outcome: 'SUCCESS',
      metadata: { status: decision.normalizedStatus },
    })

    return respond({
      success: true,
      status: decision.normalizedStatus,
    }, 200)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during webhook processing'
    logger.error('kyc.didit.webhook_failed', {
      subsystem: 'KYC',
      requestId,
      outcome: 'FAILURE',
      error: err,
    })

    await admin
      .from('verification_webhook_events')
      .update({
        processing_status: 'FAILED',
        error_message: errorMsg,
        processed_at: new Date().toISOString(),
      })
      .eq('id', ledgerId)

    return respond({ error: 'Webhook processing error' }, 500)
  }
}
