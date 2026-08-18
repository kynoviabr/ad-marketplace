'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/modules/moderation/guards'
import { SubmitReportSchema, ResolveReportSchema } from './schemas'
import { generateReporterHash, checkReportRateLimit } from './abuse'
import type { ReportReasonCategory, ReportResolutionAction } from './types'

export interface ReportActionResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Server Action: Submits a public, anonymous content report.
 * Applies abuse protection and rate limiting via pseudonymous hash.
 */
export async function submitContentReportAction(formData: {
  profileId?: string | null
  mediaId?: string | null
  reasonCategory: ReportReasonCategory
  description?: string
}): Promise<ReportActionResult> {
  try {
    const parsed = SubmitReportSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { profileId, mediaId, reasonCategory, description } = parsed.data

    // Extract client IP anonymously
    const headerList = await headers()
    const rawIp =
      headerList.get('x-forwarded-for')?.split(',')[0] ||
      headerList.get('x-real-ip') ||
      '127.0.0.1'

    const reporterHash = generateReporterHash(rawIp)

    // Check rate limit and 24h deduplication
    const rateLimit = await checkReportRateLimit(reporterHash, profileId, mediaId)
    if (!rateLimit.allowed) {
      if (rateLimit.deduplicated) {
        // Silently treat deduplication as success
        return {
          success: true,
          message: 'Sua denúncia já foi registrada e está em análise pela nossa equipe.',
        }
      }
      return { success: false, error: rateLimit.error || 'Limite de denúncias excedido.' }
    }

    const admin = createAdminClient()
    const { error: insertError } = await admin.from('content_reports').insert({
      profile_id: profileId || null,
      media_id: mediaId || null,
      reason_category: reasonCategory,
      description: description || null,
      reporter_hash: reporterHash,
      status: 'OPEN',
    })

    if (insertError) {
      console.error('[reports:action] Insert error:', insertError)
      return { success: false, error: 'Erro ao registrar denúncia. Tente novamente.' }
    }

    return {
      success: true,
      message: 'Denúncia recebida com sucesso. Nossa equipe de moderação avaliará o conteúdo com prioridade.',
    }
  } catch (err: any) {
    console.error('[reports:action] Unexpected error:', err)
    return { success: false, error: 'Erro interno ao processar denúncia.' }
  }
}

/**
 * Server Action: Resolves a content report with associated content action.
 * Enforces atomic database transaction via RPC resolve_content_report.
 */
export async function resolveReportAction(formData: {
  reportId: string
  action: ReportResolutionAction
  resolutionNotes?: string
}): Promise<ReportActionResult> {
  try {
    const admin = await requireAdmin()
    const parsed = ResolveReportSchema.safeParse(formData)

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    const { reportId, action, resolutionNotes } = parsed.data
    const supabaseAdmin = createAdminClient()

    const { error: rpcError } = await supabaseAdmin.rpc('resolve_content_report', {
      p_report_id: reportId,
      p_admin_id: admin.id,
      p_action: action,
      p_resolution_notes: resolutionNotes || null,
    })

    if (rpcError) {
      console.error('[reports:action] Error in resolve_content_report RPC:', rpcError)
      return { success: false, error: rpcError.message || 'Erro ao resolver denúncia' }
    }

    revalidatePath('/admin/reports')
    return { success: true, message: 'Denúncia resolvida com sucesso.' }
  } catch (err: any) {
    console.error('[reports:action] Unexpected error:', err)
    return { success: false, error: err.message || 'Erro interno ao resolver denúncia.' }
  }
}
