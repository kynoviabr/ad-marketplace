import { Suspense } from 'react'
import { requireAdmin } from '@/modules/moderation/guards'
import {
  getPrivacyOperationsSummary,
  getPrivacyRequests,
  getPrivacyExecutions,
  getPrivacyReports,
  getPrivacyProcessors,
  getPrivacyRetentionPolicies,
  getPrivacyRisksAndPendingDecisions,
  getPrivacyAuditEvents,
} from '@/modules/privacy/operations-dal'
import { PrivacyOperationsConsole } from '@/components/admin/privacy-operations-console'

export const dynamic = 'force-dynamic'

export default async function AdminPrivacyPage() {
  await requireAdmin()

  // Load canonical initial data server-side (default: exclude synthetic dev tests)
  const [
    summary,
    requests,
    executions,
    reports,
    risks,
    auditEvents,
  ] = await Promise.all([
    getPrivacyOperationsSummary({ includeSynthetic: false }),
    getPrivacyRequests({ includeSynthetic: false, limit: 50 }),
    getPrivacyExecutions({ includeSynthetic: false, limit: 50 }),
    getPrivacyReports({ includeSynthetic: false, period: '30d' }),
    getPrivacyRisksAndPendingDecisions({ includeSynthetic: false }),
    getPrivacyAuditEvents({ includeSynthetic: false, limit: 50 }),
  ])

  const processors = getPrivacyProcessors()
  const retentionPolicies = getPrivacyRetentionPolicies()

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-500">Carregando painel de privacidade…</div>}>
      <PrivacyOperationsConsole
        initialSummary={summary}
        initialRequests={requests}
        initialExecutions={executions}
        initialReports={reports}
        initialProcessors={processors}
        initialRetentionPolicies={retentionPolicies}
        initialRisks={risks}
        initialAuditEvents={auditEvents}
      />
    </Suspense>
  )
}
