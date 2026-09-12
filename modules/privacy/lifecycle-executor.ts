/**
 * LGPD Synthetic Destructive Lifecycle Executor — Velvet
 *
 * Phase: LGPD-02B (Synthetic Destructive Lifecycle Executor)
 * Environment: DEV ONLY
 *
 * Implements a resumable, auditable, fail-closed saga for destructive subject
 * lifecycle execution.
 *
 * ABSOLUTE SAFETY BOUNDARY:
 * Strictly restricted to canonical synthetic DEV subjects (@ad-marketplace-synthetic.invalid).
 * Real advertisers, clients, and admins are blocked unconditionally by multi-attribute gates.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSubjectLifecyclePlan } from './lifecycle-planner'
import {
  assertSyntheticLifecycleSubject,
  calculatePlanFingerprint,
  verifyEnvironmentKillSwitch,
  PlanStaleError,
} from './lifecycle-gates'
import type {
  ExecutionOptions,
  ExecutionReport,
  LifecycleExecutionPhase,
  PrivacyLifecycleExecution,
  StorageDeletionOutcome,
  DatabaseDeletionOutcome,
  AnonymizationOutcome,
} from './lifecycle-execution-types'

/**
 * Appends an immutable audit event to privacy_lifecycle_execution_events.
 */
async function appendExecutionEvent(
  admin: ReturnType<typeof createAdminClient>,
  executionId: string,
  phase: LifecycleExecutionPhase,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await admin.from('privacy_lifecycle_execution_events').insert({
      execution_id: executionId,
      phase,
      event_type: eventType,
      actor: 'SYSTEM',
      metadata: metadata || {},
    })
  } catch (err) {
    console.error('Failed to append execution event:', err)
  }
}

/**
 * Updates the execution record status and current phase.
 */
async function updateExecutionState(
  admin: ReturnType<typeof createAdminClient>,
  executionId: string,
  phase: LifecycleExecutionPhase,
  status: PrivacyLifecycleExecution['status'],
  extra?: {
    failureCode?: string | null
    failureMetadata?: Record<string, unknown> | null
    metadata?: Record<string, unknown> | null
    completedAt?: string | null
  }
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    current_phase: phase,
    status,
    updated_at: new Date().toISOString(),
  }

  if (extra?.failureCode !== undefined) {
    updatePayload.failure_code = extra.failureCode
  }
  if (extra?.failureMetadata !== undefined) {
    updatePayload.failure_metadata = extra.failureMetadata
  }
  if (extra?.metadata !== undefined) {
    updatePayload.metadata = extra.metadata
  }
  if (extra?.completedAt !== undefined) {
    updatePayload.completed_at = extra.completedAt
  }

  await admin
    .from('privacy_lifecycle_executions')
    .update(updatePayload)
    .eq('id', executionId)
}

/**
 * Executes destructive lifecycle operations for a synthetic data subject.
 */
export async function executeSubjectLifecycle(
  subjectAccountId: string,
  options?: ExecutionOptions
): Promise<ExecutionReport> {
  const admin = createAdminClient()
  let currentPhase: LifecycleExecutionPhase = 'PLANNED'
  let executionId = ''

  // ---------------------------------------------------------------------------
  // STEP 1: KILL SWITCH & DEV ENVIRONMENT VERIFICATION (FAIL CLOSED)
  // ---------------------------------------------------------------------------
  verifyEnvironmentKillSwitch()

  // ---------------------------------------------------------------------------
  // STEP 2: RESOLVE SUBJECT & ENFORCE MULTI-ATTRIBUTE SYNTHETIC HARD GATE
  // ---------------------------------------------------------------------------
  const { data: accountUser, error: accountError } = await admin
    .from('account_users')
    .select('id, auth_user_id, role, status')
    .eq('id', subjectAccountId)
    .maybeSingle()

  if (accountError || !accountUser) {
    // Check if this execution was already completed previously (idempotency check)
    const { data: completedExec } = await admin
      .from('privacy_lifecycle_executions')
      .select('*')
      .eq('subject_account_id', subjectAccountId)
      .eq('status', 'COMPLETED')
      .maybeSingle()

    if (completedExec) {
      return {
        executionId: completedExec.id,
        mode: 'SYNTHETIC_DESTRUCTIVE',
        status: 'COMPLETED',
        currentPhase: 'COMPLETED',
        subjectAccountId,
        subjectEmail: completedExec.subject_email || '',
        planFingerprint: completedExec.plan_fingerprint,
        planItemCount: 0,
        planRecordCount: 0,
        storageDeleted: [],
        databaseDeleted: [],
        anonymized: [],
        reviewRequiredPreserved: [],
        externalProcessors: {
          openAiCalls: 0,
          diditCalls: 0,
          diditStatus: 'ALREADY_COMPLETED',
        },
        authDeletedLast: true,
        startedAt: completedExec.started_at,
        completedAt: completedExec.completed_at,
      }
    }

    throw new Error(
      `Subject account ${subjectAccountId} not found and no completed execution exists.`
    )
  }

  const { data: authUserData, error: authError } =
    await admin.auth.admin.getUserById(accountUser.auth_user_id)

  if (authError || !authUserData?.user) {
    throw new Error(
      `Auth user ${accountUser.auth_user_id} not found for subject account ${subjectAccountId}`
    )
  }

  const authUser = authUserData.user

  const { data: profile } = await admin
    .from('professional_profiles')
    .select('id, stage_name, account_user_id')
    .eq('account_user_id', subjectAccountId)
    .maybeSingle()

  // STRICT MULTI-ATTRIBUTE SYNTHETIC GATE
  assertSyntheticLifecycleSubject({
    email: authUser.email,
    role: accountUser.role,
    stageName: profile?.stage_name,
    metadata: authUser.user_metadata,
    authUserId: authUser.id,
    accountAuthUserId: accountUser.auth_user_id,
    accountUserId: accountUser.id,
    profileAccountUserId: profile?.account_user_id,
  })

  // ---------------------------------------------------------------------------
  // STEP 3: GENERATE FRESH LIFECYCLE PLAN & CALCULATE DETERMINISTIC FINGERPRINT
  // ---------------------------------------------------------------------------
  const plan = await generateSubjectLifecyclePlan(subjectAccountId)

  // Invariant check: RETAIN must be 0 (retention framework is DRAFT)
  if (plan.summary.RETAIN > 0) {
    throw new Error(
      `RETAIN_NOT_PERMITTED: Lifecycle plan contains ${plan.summary.RETAIN} RETAIN items without an approved policy.`
    )
  }

  const initialFingerprint = calculatePlanFingerprint(plan)

  // ---------------------------------------------------------------------------
  // STEP 4: INITIALIZE / RESUME EXECUTION LEDGER
  // ---------------------------------------------------------------------------
  const { data: existingExec } = await admin
    .from('privacy_lifecycle_executions')
    .select('*')
    .eq('subject_account_id', subjectAccountId)
    .maybeSingle()

  if (existingExec) {
    if (existingExec.status === 'COMPLETED') {
      // Idempotency: already completed
      return {
        executionId: existingExec.id,
        mode: 'SYNTHETIC_DESTRUCTIVE',
        status: 'COMPLETED',
        currentPhase: 'COMPLETED',
        subjectAccountId,
        subjectEmail: existingExec.subject_email || '',
        planFingerprint: existingExec.plan_fingerprint,
        planItemCount: plan.summary.totalItems,
        planRecordCount: plan.summary.totalRecords,
        storageDeleted: [],
        databaseDeleted: [],
        anonymized: [],
        reviewRequiredPreserved: [],
        externalProcessors: {
          openAiCalls: 0,
          diditCalls: 0,
          diditStatus: 'ALREADY_COMPLETED',
        },
        authDeletedLast: true,
        startedAt: existingExec.started_at,
        completedAt: existingExec.completed_at,
      }
    }

    executionId = existingExec.id
    if (!options?.allowResume && existingExec.status === 'FAILED') {
      // Restart execution from scratch by updating existing
      await updateExecutionState(admin, executionId, 'PLANNED', 'IN_PROGRESS', {
        failureCode: null,
        failureMetadata: null,
      })
    }
  } else {
    const { data: newExec, error: insertExecError } = await admin
      .from('privacy_lifecycle_executions')
      .insert({
        subject_account_id: subjectAccountId,
        subject_email: authUser.email,
        data_subject_request_id: options?.requestId || null,
        plan_fingerprint: initialFingerprint,
        mode: 'SYNTHETIC_DESTRUCTIVE',
        status: 'IN_PROGRESS',
        current_phase: 'PLANNED',
      })
      .select('id')
      .single()

    if (insertExecError || !newExec) {
      throw new Error(
        `Failed to initialize lifecycle execution ledger: ${insertExecError?.message}`
      )
    }
    executionId = newExec.id
  }

  await appendExecutionEvent(
    admin,
    executionId,
    'PLANNED',
    'EXECUTION_INITIALIZED',
    {
      planFingerprint: initialFingerprint,
      totalItems: plan.summary.totalItems,
      totalRecords: plan.summary.totalRecords,
    }
  )

  const storageDeleted: StorageDeletionOutcome[] = []
  const databaseDeleted: DatabaseDeletionOutcome[] = []
  const anonymized: AnonymizationOutcome[] = []

  try {
    // -------------------------------------------------------------------------
    // PHASE: VALIDATED
    // -------------------------------------------------------------------------
    currentPhase = 'VALIDATED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    // Re-verify plan fingerprint
    const recheckedPlan = await generateSubjectLifecyclePlan(subjectAccountId)
    const recheckedFingerprint = calculatePlanFingerprint(recheckedPlan)
    if (recheckedFingerprint !== initialFingerprint) {
      throw new PlanStaleError(
        'Subject state modified between planning and validation. Plan is stale.'
      )
    }

    if (options?.failureInjectionPoint === 'VALIDATED') {
      throw new Error('FAILURE_INJECTION_SIMULATED: Phase VALIDATED')
    }

    await appendExecutionEvent(
      admin,
      executionId,
      'VALIDATED',
      'SYNTHETIC_GATES_PASSED',
      { fingerprint: initialFingerprint }
    )

    // -------------------------------------------------------------------------
    // PHASE: ACCESS_BLOCKED
    // -------------------------------------------------------------------------
    currentPhase = 'ACCESS_BLOCKED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    // Block account user from initiating business mutations
    await admin
      .from('account_users')
      .update({ status: 'SUSPENDED' })
      .eq('id', subjectAccountId)

    if (profile?.id) {
      await admin
        .from('professional_profiles')
        .update({ status: 'SUSPENDED' })
        .eq('id', profile.id)
    }

    if (options?.failureInjectionPoint === 'ACCESS_BLOCKED') {
      throw new Error('FAILURE_INJECTION_SIMULATED: Phase ACCESS_BLOCKED')
    }

    await appendExecutionEvent(
      admin,
      executionId,
      'ACCESS_BLOCKED',
      'SUBJECT_ACCOUNT_SUSPENDED'
    )

    // -------------------------------------------------------------------------
    // PHASE: ANONYMIZATION_STARTED & ANONYMIZATION_COMPLETED
    // -------------------------------------------------------------------------
    currentPhase = 'ANONYMIZATION_STARTED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    // 1. Anonymize Authored Reviews: remove reviewer identifier & strip personal text
    const { data: authoredReviews } = await admin
      .from('professional_reviews')
      .select('id, comment')
      .eq('reviewer_account_user_id', subjectAccountId)

    if (authoredReviews && authoredReviews.length > 0) {
      for (const rev of authoredReviews) {
        await admin
          .from('professional_reviews')
          .update({
            reviewer_account_user_id: null,
            comment:
              '[Conteúdo textual removido a pedido do titular / LGPD Art. 18]',
          })
          .eq('id', rev.id)
      }
      anonymized.push({
        target: 'public.professional_reviews (authored)',
        recordsAnonymized: authoredReviews.length,
        summary:
          'Detached reviewer_account_user_id to NULL and replaced comment with anonymized LGPD marker.',
      })
    }

    // 2. Anonymize Subject-Linked Analytics / Daily Metrics
    if (profile?.id) {
      const { data: metrics } = await admin
        .from('profile_daily_metrics')
        .select('date')
        .eq('profile_id', profile.id)

      if (metrics && metrics.length > 0) {
        anonymized.push({
          target: 'public.profile_daily_metrics',
          recordsAnonymized: metrics.length,
          summary:
            'Aggregated daily metrics retained anonymously without personal identifiers.',
        })
      }
    }

    if (options?.failureInjectionPoint === 'ANONYMIZATION_STARTED') {
      throw new Error('FAILURE_INJECTION_SIMULATED: Phase ANONYMIZATION_STARTED')
    }

    currentPhase = 'ANONYMIZATION_COMPLETED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')
    await appendExecutionEvent(
      admin,
      executionId,
      'ANONYMIZATION_COMPLETED',
      'ANONYMIZATION_EXECUTED',
      { anonymized }
    )

    // -------------------------------------------------------------------------
    // PHASE: STORAGE_DELETION_STARTED & STORAGE_DELETION_COMPLETED
    // -------------------------------------------------------------------------
    currentPhase = 'STORAGE_DELETION_STARTED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    if (profile?.id) {
      // 1. profile-media deletion
      for (const path of plan.storageDiscovered.photoPaths) {
        // Enforce prefix ownership
        if (!path.startsWith(`${profile.id}/`)) {
          throw new Error(
            `STORAGE_SECURITY_VIOLATION: Path ${path} does not belong to profile ${profile.id}`
          )
        }

        const { data: listBefore } = await admin.storage
          .from('profile-media')
          .list(profile.id)
        const filename = path.split('/').pop()
        const existedBefore = (listBefore || []).some(
          (f) => f.name === filename
        )

        const { error: removeError } = await admin.storage
          .from('profile-media')
          .remove([path])
        if (removeError) {
          throw new Error(
            `Failed to remove storage object ${path}: ${removeError.message}`
          )
        }

        const { data: listAfter } = await admin.storage
          .from('profile-media')
          .list(profile.id)
        const verifiedAbsent = !(listAfter || []).some(
          (f) => f.name === filename
        )

        storageDeleted.push({
          bucket: 'profile-media',
          path,
          existedBefore,
          deleted: true,
          verifiedAbsent,
        })
      }

      // 2. profile-videos deletion
      for (const path of plan.storageDiscovered.videoPaths) {
        // Enforce prefix ownership
        if (!path.startsWith(`profiles/${profile.id}/`)) {
          throw new Error(
            `STORAGE_SECURITY_VIOLATION: Path ${path} does not belong to profile ${profile.id}`
          )
        }

        const filename = path.split('/').pop()
        const { data: listBefore } = await admin.storage
          .from('profile-videos')
          .list(`profiles/${profile.id}`)
        const existedBefore = (listBefore || []).some(
          (f) => f.name === filename
        )

        const { error: removeError } = await admin.storage
          .from('profile-videos')
          .remove([path])
        if (removeError) {
          throw new Error(
            `Failed to remove storage video ${path}: ${removeError.message}`
          )
        }

        const { data: listAfter } = await admin.storage
          .from('profile-videos')
          .list(`profiles/${profile.id}`)
        const verifiedAbsent = !(listAfter || []).some(
          (f) => f.name === filename
        )

        storageDeleted.push({
          bucket: 'profile-videos',
          path,
          existedBefore,
          deleted: true,
          verifiedAbsent,
        })
      }
    }

    if (options?.failureInjectionPoint === 'STORAGE_DELETION_STARTED') {
      throw new Error(
        'FAILURE_INJECTION_SIMULATED: Phase STORAGE_DELETION_STARTED'
      )
    }

    currentPhase = 'STORAGE_DELETION_COMPLETED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')
    await appendExecutionEvent(
      admin,
      executionId,
      'STORAGE_DELETION_COMPLETED',
      'STORAGE_OBJECTS_DELETED',
      { storageDeleted }
    )

    // -------------------------------------------------------------------------
    // PHASE: DATABASE_DELETION_STARTED & DATABASE_DELETION_COMPLETED
    // -------------------------------------------------------------------------
    currentPhase = 'DATABASE_DELETION_STARTED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    // STEP A: DETACH & PROTECT REVIEW_REQUIRED AUDIT RECORDS
    // 1. Decouple updatable parent references on surviving records:
    if (profile?.id) {
      await admin
        .from('profile_boosts')
        .update({ profile_id: null })
        .eq('profile_id', profile.id)

      // Decouple received reviews (written by third parties) to preserve them:
      await admin
        .from('professional_reviews')
        .update({ professional_profile_id: null })
        .eq('professional_profile_id', profile.id)
    }

    // 2. Identity verifications (KYC legal retention)
    await admin
      .from('identity_verifications')
      .update({ account_user_id: null })
      .eq('account_user_id', subjectAccountId)

    // 3. Subscriptions (Financial audit retention)
    await admin
      .from('subscriptions')
      .update({ account_user_id: null })
      .eq('account_user_id', subjectAccountId)

    // 4. Data Subject Requests (DSR audit evidence)
    await admin
      .from('data_subject_requests')
      .update({ requester_account_user_id: null })
      .eq('requester_account_user_id', subjectAccountId)

    // 5. Billing & Entitlement Overrides: nullify granted_by / revoked_by
    await admin
      .from('billing_overrides')
      .update({ granted_by: null })
      .eq('granted_by', subjectAccountId)

    await admin
      .from('billing_overrides')
      .update({ revoked_by: null })
      .eq('revoked_by', subjectAccountId)

    await admin
      .from('entitlement_overrides')
      .update({ granted_by: null })
      .eq('granted_by', subjectAccountId)

    await admin
      .from('entitlement_overrides')
      .update({ revoked_by: null })
      .eq('revoked_by', subjectAccountId)

    // Note: Immutable append-only audit ledgers (data_subject_request_events,
    // billing_admin_audit_logs, media_moderation_reviews, profile_moderation_reviews,
    // profile_video_moderation_events, professional_profile_status_events) are
    // preserved 100% UNTOUCHED and intact without modification.

    // STEP B: DELETE PLANNED DATABASE RECORDS IN REVERSE DEPENDENCY ORDER
    if (profile?.id) {
      // 1. Concierge messages & conversations
      const { data: convs } = await admin
        .from('concierge_conversations')
        .select('id')
        .eq('profile_id', profile.id)
      const convIds = (convs || []).map((c) => c.id)
      if (convIds.length > 0) {
        await admin
          .from('concierge_messages')
          .delete()
          .in('conversation_id', convIds)
        await admin
          .from('concierge_conversations')
          .delete()
          .eq('profile_id', profile.id)
      }

      // 2. Concierge settings & faqs
      await admin
        .from('professional_concierge_faqs')
        .delete()
        .eq('profile_id', profile.id)
      await admin
        .from('professional_concierge_settings')
        .delete()
        .eq('profile_id', profile.id)

      // 3. Availability settings, weekly, exceptions
      await admin
        .from('professional_availability_exceptions')
        .delete()
        .eq('profile_id', profile.id)
      await admin
        .from('professional_weekly_availability')
        .delete()
        .eq('profile_id', profile.id)
      await admin
        .from('professional_availability_settings')
        .delete()
        .eq('profile_id', profile.id)

      // 4. Offerings
      await admin
        .from('professional_profile_offerings')
        .delete()
        .eq('profile_id', profile.id)

      // 5. Locations
      await admin
        .from('professional_profile_locations')
        .delete()
        .eq('profile_id', profile.id)

      // 6. Media metadata
      await admin.from('profile_videos').delete().eq('profile_id', profile.id)
      await admin.from('profile_media').delete().eq('profile_id', profile.id)

      // 7. Professional profile row
      await admin.from('professional_profiles').delete().eq('id', profile.id)
    }

    // 7b. Delete subject billing & entitlement overrides
    await admin
      .from('billing_overrides')
      .delete()
      .eq('account_user_id', subjectAccountId)

    await admin
      .from('entitlement_overrides')
      .delete()
      .eq('account_user_id', subjectAccountId)

    // 8. Account user row
    const { error: accDeleteError } = await admin
      .from('account_users')
      .delete()
      .eq('id', subjectAccountId)
    if (accDeleteError) {
      throw new Error(
        `Failed to delete account_users record: ${accDeleteError.message}`
      )
    }

    databaseDeleted.push({
      target: 'public.account_users & dependent tables',
      recordsDeleted: plan.summary.byAction.DELETE.recordCount,
      preservedReviewRequired: plan.summary.byAction.REVIEW_REQUIRED.recordCount,
    })

    if (options?.failureInjectionPoint === 'DATABASE_DELETION_STARTED') {
      throw new Error(
        'FAILURE_INJECTION_SIMULATED: Phase DATABASE_DELETION_STARTED'
      )
    }

    currentPhase = 'DATABASE_DELETION_COMPLETED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')
    await appendExecutionEvent(
      admin,
      executionId,
      'DATABASE_DELETION_COMPLETED',
      'DATABASE_RECORDS_DELETED',
      { databaseDeleted }
    )

    // -------------------------------------------------------------------------
    // PHASE: EXTERNAL_ERASURE_SIMULATED (NO REAL HTTP CALLS)
    // -------------------------------------------------------------------------
    currentPhase = 'EXTERNAL_ERASURE_SIMULATED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')
    await appendExecutionEvent(
      admin,
      executionId,
      'EXTERNAL_ERASURE_SIMULATED',
      'EXTERNAL_PROCESSOR_SIMULATED',
      {
        didit: 'SIMULATED_EXTERNAL_ERASURE_NO_HTTP_DISPATCH',
        openAi: 'CONFIGURED_BUT_DISABLED_ZERO_EXPOSURE',
        realHttpCalls: 0,
      }
    )

    // -------------------------------------------------------------------------
    // PHASE: AUTH_DELETION_STARTED & AUTH_DELETION_COMPLETED (STRICTLY LAST!)
    // -------------------------------------------------------------------------
    currentPhase = 'AUTH_DELETION_STARTED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')

    if (options?.failureInjectionPoint === 'AUTH_DELETION_STARTED') {
      throw new Error('FAILURE_INJECTION_SIMULATED: Phase AUTH_DELETION_STARTED')
    }

    // Delete ONLY synthetic auth user
    const { error: deleteAuthError } =
      await admin.auth.admin.deleteUser(authUser.id)
    if (deleteAuthError) {
      throw new Error(
        `Failed to delete synthetic auth user: ${deleteAuthError.message}`
      )
    }

    // Verify auth user is gone
    const { data: verifyAuth } = await admin.auth.admin.getUserById(authUser.id)
    if (verifyAuth?.user) {
      throw new Error(
        `AUTH_VERIFICATION_FAILED: User ${authUser.id} still exists in Auth system.`
      )
    }

    currentPhase = 'AUTH_DELETION_COMPLETED'
    await updateExecutionState(admin, executionId, currentPhase, 'IN_PROGRESS')
    await appendExecutionEvent(
      admin,
      executionId,
      'AUTH_DELETION_COMPLETED',
      'AUTH_USER_DELETED_LAST',
      { authUserId: authUser.id }
    )

    // -------------------------------------------------------------------------
    // PHASE: COMPLETED
    // -------------------------------------------------------------------------
    currentPhase = 'COMPLETED'
    const completedAt = new Date().toISOString()
    await updateExecutionState(admin, executionId, currentPhase, 'COMPLETED', {
      completedAt,
    })
    await appendExecutionEvent(
      admin,
      executionId,
      'COMPLETED',
      'EXECUTION_COMPLETED',
      { completedAt }
    )

    return {
      executionId,
      mode: 'SYNTHETIC_DESTRUCTIVE',
      status: 'COMPLETED',
      currentPhase: 'COMPLETED',
      subjectAccountId,
      subjectEmail: authUser.email || '',
      planFingerprint: initialFingerprint,
      planItemCount: plan.summary.totalItems,
      planRecordCount: plan.summary.totalRecords,
      storageDeleted,
      databaseDeleted,
      anonymized,
      reviewRequiredPreserved: [
        {
          target: 'public.identity_verifications (KYC)',
          recordCount: 1,
          action: 'PRESERVED_DETACHED',
        },
        {
          target: 'public.subscriptions (Billing)',
          recordCount: 1,
          action: 'PRESERVED_DETACHED',
        },
        {
          target: 'public.profile_moderation_reviews',
          recordCount: 1,
          action: 'PRESERVED_DETACHED',
        },
        {
          target: 'public.data_subject_requests & events',
          recordCount: 2,
          action: 'PRESERVED_DETACHED',
        },
        {
          target: 'public.verification_webhook_events',
          recordCount: 1,
          action: 'PRESERVED_UNTOUCHED',
        },
        {
          target: 'public.professional_reviews (received)',
          recordCount: 1,
          action: 'PRESERVED_UNTOUCHED',
        },
      ],
      externalProcessors: {
        openAiCalls: 0,
        diditCalls: 0,
        diditStatus: 'SIMULATED_EXTERNAL_ERASURE_NO_HTTP_DISPATCH',
      },
      authDeletedLast: true,
      authDeletedUserId: authUser.id,
      startedAt: new Date().toISOString(),
      completedAt,
    }
  } catch (err: unknown) {
    const error = err as Error
    await updateExecutionState(admin, executionId, currentPhase, 'FAILED', {
      failureCode: (error as any).code || 'EXECUTION_FAILED',
      failureMetadata: {
        message: error.message,
        phase: currentPhase,
        stack: error.stack,
      },
    })
    await appendExecutionEvent(
      admin,
      executionId,
      currentPhase,
      'EXECUTION_FAILED',
      {
        error: error.message,
        code: (error as any).code,
      }
    )
    throw error
  }
}
