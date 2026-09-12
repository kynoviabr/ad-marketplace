'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useI18n } from '@/components/i18n'
import type { MessageKey } from '@/lib/i18n/catalog'
import {
  type PrivacyOperationsSummary,
  type PrivacyRequestItem,
  type PrivacyRequestDetail,
  type PrivacyExecutionItem,
  type PrivacyExecutionDetail,
  type PrivacyReportsData,
  type PrivacyRiskItem,
  type PrivacyAuditEvent,
} from '@/modules/privacy/operations-dal'
import type { ExternalProcessor } from '@/modules/privacy/processors'
import type { RetentionPolicyEntry } from '@/modules/privacy/retention'
import {
  getAdminPrivacyRequestsAction,
  getAdminPrivacyRequestDetailAction,
  getAdminPrivacyExecutionsAction,
  getAdminPrivacyExecutionDetailAction,
  exportAdminPrivacyReportCsvAction,
} from '@/modules/privacy/actions'
import { PrivacyDryRunSimulator } from '@/components/admin/privacy-dry-run-simulator'

export type ConsoleTab =
  | 'overview'
  | 'requests'
  | 'executions'
  | 'reports'
  | 'processors'
  | 'retention'
  | 'audit'
  | 'risks'

interface PrivacyOperationsConsoleProps {
  initialSummary: PrivacyOperationsSummary
  initialRequests: { items: PrivacyRequestItem[]; total: number }
  initialExecutions: { items: PrivacyExecutionItem[]; total: number }
  initialReports: PrivacyReportsData
  initialProcessors: readonly ExternalProcessor[]
  initialRetentionPolicies: readonly RetentionPolicyEntry[]
  initialRisks: PrivacyRiskItem[]
  initialAuditEvents: PrivacyAuditEvent[]
}

export function PrivacyOperationsConsole({
  initialSummary,
  initialRequests,
  initialExecutions,
  initialReports,
  initialProcessors,
  initialRetentionPolicies,
  initialRisks,
  initialAuditEvents,
}: PrivacyOperationsConsoleProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialTab = (searchParams.get('view') as ConsoleTab) || 'overview'
  const [activeTab, setActiveTab] = useState<ConsoleTab>(initialTab)
  const [includeSynthetic, setIncludeSynthetic] = useState(false)
  const [isPending, startTransition] = useTransition()

  // State for Requests Tab
  const [requestsList, setRequestsList] = useState(initialRequests.items)
  const [requestsTotal, setRequestsTotal] = useState(initialRequests.total)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [activeRequestDetail, setActiveRequestDetail] = useState<PrivacyRequestDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // State for Executions Tab
  const [executionsList, setExecutionsList] = useState(initialExecutions.items)
  const [executionsTotal, setExecutionsTotal] = useState(initialExecutions.total)
  const [activeExecutionDetail, setActiveExecutionDetail] = useState<PrivacyExecutionDetail | null>(null)

  // State for Reports Tab
  const [reportsPeriod, setReportsPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [reportsData, setReportsData] = useState(initialReports)
  const [isExportingCsv, setIsExportingCsv] = useState(false)

  // State for Audit Tab
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'DSR' | 'LIFECYCLE'>('ALL')

  // Switch Tab & Sync URL cleanly
  const handleTabChange = (tab: ConsoleTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Toggle Synthetic Mode
  const handleToggleSynthetic = async (enabled: boolean) => {
    setIncludeSynthetic(enabled)
    startTransition(async () => {
      // Reload requests
      const reqRes = await getAdminPrivacyRequestsAction({
        includeSynthetic: enabled,
        period: selectedPeriod,
        status: selectedStatus,
        requestType: selectedType,
        role: selectedRole,
      })
      if (reqRes.success && reqRes.data) {
        setRequestsList(reqRes.data.items)
        setRequestsTotal(reqRes.data.total)
      }

      // Reload executions
      const execRes = await getAdminPrivacyExecutionsAction({
        includeSynthetic: enabled,
      })
      if (execRes.success && execRes.data) {
        setExecutionsList(execRes.data.items)
        setExecutionsTotal(execRes.data.total)
      }
    })
  }

  // Filter Requests
  const handleApplyRequestFilters = async (
    period: '7d' | '30d' | '90d' | 'all',
    type: string,
    status: string,
    role: string
  ) => {
    setSelectedPeriod(period)
    setSelectedType(type)
    setSelectedStatus(status)
    setSelectedRole(role)

    startTransition(async () => {
      const res = await getAdminPrivacyRequestsAction({
        includeSynthetic,
        period,
        requestType: type,
        status,
        role,
      })
      if (res.success && res.data) {
        setRequestsList(res.data.items)
        setRequestsTotal(res.data.total)
      }
    })
  }

  // View Request Detail
  const handleOpenRequestDetail = async (requestId: string) => {
    setLoadingDetail(true)
    try {
      const res = await getAdminPrivacyRequestDetailAction(requestId)
      if (res.success && res.data) {
        setActiveRequestDetail(res.data)
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  // View Execution Detail
  const handleOpenExecutionDetail = async (executionId: string) => {
    setLoadingDetail(true)
    try {
      const res = await getAdminPrivacyExecutionDetailAction(executionId)
      if (res.success && res.data) {
        setActiveExecutionDetail(res.data)
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  // CSV Export
  const handleExportCsv = async () => {
    setIsExportingCsv(true)
    try {
      const res = await exportAdminPrivacyReportCsvAction({
        includeSynthetic,
        period: reportsPeriod,
      })
      if (res.success && res.data) {
        const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = res.data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } finally {
      setIsExportingCsv(false)
    }
  }

  // Helper for human rights labels
  const getRightLabel = (type: string) => {
    switch (type) {
      case 'ACCESS': return t('admin.rightAccess')
      case 'CORRECTION': return t('admin.rightCorrection')
      case 'ANONYMIZATION': return t('admin.rightAnonymization')
      case 'BLOCKING': return t('admin.rightBlocking')
      case 'DELETION': return t('admin.rightDeletion')
      case 'PORTABILITY': return t('admin.rightPortability')
      case 'CONSENT_REVOCATION': return t('admin.rightConsentRevocation')
      case 'SHARING_INFORMATION': return t('admin.rightSharingInformation')
      case 'AUTOMATED_DECISION_REVIEW': return t('admin.rightAutomatedDecisionReview')
      default: return type
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* 1. Header Banner */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
              {t('admin.privacyTitle')}
            </h1>
            <span className="rounded-full border border-neutral-700 bg-neutral-800/80 px-2.5 py-0.5 text-xs font-semibold text-neutral-300">
              LGPD
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-400">
            {t('admin.privacySubtitle')}
          </p>
        </div>

        {/* Synthetic Dev Isolation Toggle */}
        <div className="flex flex-col items-start gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 sm:items-end">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-neutral-200">
            <span>{t('admin.includeSynthetic')}</span>
            <input
              type="checkbox"
              checked={includeSynthetic}
              onChange={(e) => handleToggleSynthetic(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-neutral-100 focus:ring-1 focus:ring-neutral-400"
            />
          </label>
          <span className="text-[11px] text-neutral-500">
            {t('admin.includeSyntheticHint')}
          </span>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="mb-8 flex overflow-x-auto border-b border-neutral-800 scrollbar-thin">
        {[
          { id: 'overview', label: t('admin.privacyTabOverview') },
          { id: 'requests', label: `${t('admin.privacyTabRequests')} (${requestsTotal})` },
          { id: 'executions', label: `${t('admin.privacyTabExecutions')} (${executionsTotal})` },
          { id: 'reports', label: t('admin.privacyTabReports') },
          { id: 'processors', label: t('admin.privacyTabProcessors') },
          { id: 'retention', label: t('admin.privacyTabRetention') },
          { id: 'audit', label: t('admin.privacyTabAudit') },
          { id: 'risks', label: `${t('admin.privacyTabRisks')} (${initialRisks.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id as ConsoleTab)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-neutral-200 text-neutral-100 font-semibold'
                : 'border-transparent text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}

      {/* ================================================================= */}
      {/* TAB 1: OVERVIEW                                                   */}
      {/* ================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Environment Separation Banner */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-sm font-semibold text-neutral-200">
                  {includeSynthetic ? t('admin.includeSynthetic') : t('admin.realOperationalBadge')}
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {includeSynthetic
                    ? 'Exibindo dados operacionais reais combinados com testes sintéticos de engenharia DEV.'
                    : 'Exibindo estritamente operações reais. Testes sintéticos do ambiente DEV estão isolados.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded bg-neutral-800 px-2.5 py-1 text-neutral-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Operações Reais: {initialSummary.requests.realCount} DSRs / {initialSummary.lifecycle.realCount} Execuções
                </span>
                <span className="inline-flex items-center gap-1.5 rounded bg-neutral-800 px-2.5 py-1 text-amber-400/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Testes Sintéticos DEV: {initialSummary.requests.syntheticCount} DSRs / {initialSummary.lifecycle.syntheticCount} Execuções
                </span>
              </div>
            </div>
          </div>

          {/* DSR KPI Cards */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('admin.dsrKpiSection')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {[
                { label: t('admin.kpiTotal'), value: initialSummary.requests.total, color: 'text-neutral-100' },
                { label: t('admin.kpiReceived'), value: initialSummary.requests.byStatus.RECEIVED, color: 'text-amber-400' },
                { label: t('admin.kpiIdentityPending'), value: initialSummary.requests.byStatus.IDENTITY_VERIFICATION_REQUIRED, color: 'text-yellow-400' },
                { label: t('admin.kpiInReview'), value: initialSummary.requests.byStatus.IN_REVIEW, color: 'text-blue-400' },
                { label: t('admin.kpiProcessing'), value: initialSummary.requests.byStatus.PROCESSING, color: 'text-indigo-400' },
                { label: t('admin.kpiCompleted'), value: initialSummary.requests.byStatus.COMPLETED, color: 'text-emerald-400' },
                { label: t('admin.kpiRejected'), value: initialSummary.requests.byStatus.REJECTED, color: 'text-rose-400' },
                { label: t('admin.kpiCancelled'), value: initialSummary.requests.byStatus.CANCELLED, color: 'text-neutral-500' },
              ].map((kpi, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                  <p className="text-[11px] font-medium text-neutral-400 truncate">{kpi.label}</p>
                  <p className={`mt-1.5 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lifecycle Execution KPI Cards */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('admin.lifecycleKpiSection')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {[
                { label: t('admin.kpiDryRuns'), value: initialSummary.lifecycle.dryRuns, color: 'text-neutral-300' },
                { label: t('admin.kpiExecutions'), value: initialSummary.lifecycle.totalExecutions, color: 'text-neutral-100' },
                { label: t('admin.kpiCompleted'), value: initialSummary.lifecycle.completed, color: 'text-emerald-400' },
                { label: t('admin.kpiFailed'), value: initialSummary.lifecycle.failed, color: 'text-rose-400' },
                { label: t('admin.kpiBlocked'), value: initialSummary.lifecycle.blocked, color: 'text-amber-400' },
                { label: t('admin.kpiReviewRequired'), value: initialSummary.lifecycle.reviewRequiredPreserved, color: 'text-blue-400' },
                { label: t('admin.kpiExternalErasurePending'), value: initialSummary.lifecycle.externalErasurePending, color: 'text-purple-400' },
              ].map((kpi, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                  <p className="text-[11px] font-medium text-neutral-400 truncate">{kpi.label}</p>
                  <p className={`mt-1.5 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canonical Rights Distribution */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <h3 className="text-sm font-semibold text-neutral-200">
                {t('admin.repVolumeByType')}
              </h3>
              <div className="mt-4 space-y-2.5">
                {Object.entries(initialSummary.requests.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 truncate max-w-[80%]">
                      {getRightLabel(type)}
                    </span>
                    <span className="font-mono font-medium text-neutral-200">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Age Distribution */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <h3 className="text-sm font-semibold text-neutral-200">
                {t('admin.repAgeDistribution')}
              </h3>
              <div className="mt-4 space-y-2.5">
                {[
                  { bucket: t('admin.ageUnder24h'), count: initialSummary.requests.byAgeBucket.under24h },
                  { bucket: t('admin.age1to5d'), count: initialSummary.requests.byAgeBucket.days1to5 },
                  { bucket: t('admin.age6to15d'), count: initialSummary.requests.byAgeBucket.days6to15 },
                  { bucket: t('admin.age16to30d'), count: initialSummary.requests.byAgeBucket.days16to30 },
                  { bucket: t('admin.ageOver30d'), count: initialSummary.requests.byAgeBucket.over30days },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{item.bucket}</span>
                    <span className="font-mono font-medium text-neutral-200">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: REQUESTS                                                   */}
      {/* ================================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 text-xs">
            {/* Period */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">{t('admin.filterPeriod')}:</span>
              <select
                value={selectedPeriod}
                onChange={(e) =>
                  handleApplyRequestFilters(e.target.value as any, selectedType, selectedStatus, selectedRole)
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
              >
                <option value="all">{t('admin.periodAll')}</option>
                <option value="7d">{t('admin.period7d')}</option>
                <option value="30d">{t('admin.period30d')}</option>
                <option value="90d">{t('admin.period90d')}</option>
              </select>
            </div>

            {/* Request Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">{t('admin.filterRequestType')}:</span>
              <select
                value={selectedType}
                onChange={(e) =>
                  handleApplyRequestFilters(selectedPeriod, e.target.value, selectedStatus, selectedRole)
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200 max-w-[160px] truncate"
              >
                <option value="ALL">{t('admin.filterAllTypes')}</option>
                <option value="ACCESS">{t('admin.rightAccess')}</option>
                <option value="CORRECTION">{t('admin.rightCorrection')}</option>
                <option value="ANONYMIZATION">{t('admin.rightAnonymization')}</option>
                <option value="BLOCKING">{t('admin.rightBlocking')}</option>
                <option value="DELETION">{t('admin.rightDeletion')}</option>
                <option value="PORTABILITY">{t('admin.rightPortability')}</option>
                <option value="CONSENT_REVOCATION">{t('admin.rightConsentRevocation')}</option>
                <option value="SHARING_INFORMATION">{t('admin.rightSharingInformation')}</option>
                <option value="AUTOMATED_DECISION_REVIEW">{t('admin.rightAutomatedDecisionReview')}</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">{t('admin.filterStatus')}:</span>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  handleApplyRequestFilters(selectedPeriod, selectedType, e.target.value, selectedRole)
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
              >
                <option value="ALL">{t('admin.filterAllStatuses')}</option>
                <option value="RECEIVED">{t('admin.kpiReceived')}</option>
                <option value="IDENTITY_VERIFICATION_REQUIRED">{t('admin.kpiIdentityPending')}</option>
                <option value="IN_REVIEW">{t('admin.kpiInReview')}</option>
                <option value="PROCESSING">{t('admin.kpiProcessing')}</option>
                <option value="COMPLETED">{t('admin.kpiCompleted')}</option>
                <option value="REJECTED">{t('admin.kpiRejected')}</option>
                <option value="CANCELLED">{t('admin.kpiCancelled')}</option>
              </select>
            </div>

            {/* Role */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">{t('admin.filterRole')}:</span>
              <select
                value={selectedRole}
                onChange={(e) =>
                  handleApplyRequestFilters(selectedPeriod, selectedType, selectedStatus, e.target.value)
                }
                className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-200"
              >
                <option value="ALL">{t('admin.filterAllRoles')}</option>
                <option value="ADVERTISER">{t('admin.roleAdvertiser')}</option>
                <option value="CLIENT">{t('admin.roleClient')}</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            {requestsList.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                {t('admin.emptyRequests')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="border-b border-neutral-800 bg-neutral-900/50 uppercase text-neutral-400">
                    <tr>
                      <th className="px-4 py-3">{t('admin.colRequestId')}</th>
                      <th className="px-4 py-3">{t('admin.colRightType')}</th>
                      <th className="px-4 py-3">{t('admin.colStatus')}</th>
                      <th className="px-4 py-3">{t('admin.colSubjectRole')}</th>
                      <th className="px-4 py-3">{t('admin.colRequestAge')}</th>
                      <th className="px-4 py-3">{t('admin.colCreatedAt')}</th>
                      <th className="px-4 py-3">{t('admin.colEnvironment')}</th>
                      <th className="px-4 py-3 text-right">{t('admin.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {requestsList.map((req) => (
                      <tr key={req.id} className="hover:bg-neutral-900/30">
                        <td className="px-4 py-3 font-mono text-neutral-400">
                          {req.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-200">
                          {getRightLabel(req.requestType)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              req.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : req.status === 'RECEIVED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : req.status === 'IN_REVIEW' || req.status === 'PROCESSING'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {req.subjectRole === 'ADVERTISER'
                            ? t('admin.roleAdvertiser')
                            : req.subjectRole === 'CLIENT'
                            ? t('admin.roleClient')
                            : t('admin.roleUnknown')}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {req.ageBucket}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {new Date(req.createdAt).toLocaleDateString(locale)}
                        </td>
                        <td className="px-4 py-3">
                          {req.isSynthetic ? (
                            <span className="inline-flex rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800">
                              {t('admin.syntheticDevBadge')}
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400">
                              {t('admin.realOperationalBadge')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenRequestDetail(req.id)}
                            className="rounded bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
                          >
                            {t('admin.btnViewDetail')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Request Detail Modal */}
          {activeRequestDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-100">
                      {getRightLabel(activeRequestDetail.requestType)}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-neutral-400">
                      ID: {activeRequestDetail.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveRequestDetail(null)}
                    className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                  >
                    {t('admin.btnClose')}
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  {/* Status & Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neutral-800 px-2 py-1 font-semibold text-neutral-200">
                      Status: {activeRequestDetail.status}
                    </span>
                    <span className="rounded bg-neutral-800 px-2 py-1 text-neutral-300">
                      Papel: {activeRequestDetail.subjectRole}
                    </span>
                    <span className="rounded bg-neutral-800 px-2 py-1 text-neutral-400">
                      Idade: {activeRequestDetail.ageBucket} ({activeRequestDetail.ageDays} dias)
                    </span>
                    {activeRequestDetail.isSynthetic && (
                      <span className="rounded border border-amber-800 bg-amber-950/80 px-2 py-1 text-amber-300">
                        {t('admin.syntheticDevBadge')}
                      </span>
                    )}
                  </div>

                  {/* Audit Event Timeline */}
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
                    <h4 className="font-semibold text-neutral-200 mb-2">Trilha de Eventos (Ledger Imutável)</h4>
                    {activeRequestDetail.events.length === 0 ? (
                      <p className="text-neutral-500">Nenhum evento registrado.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeRequestDetail.events.map((ev) => (
                          <div key={ev.id} className="flex items-start justify-between border-b border-neutral-800/40 pb-1.5">
                            <div>
                              <p className="font-semibold text-neutral-300">{ev.eventType}</p>
                              <p className="text-[10px] text-neutral-500">Ator: {ev.actorRole} {ev.actorId ? `(${ev.actorId})` : ''}</p>
                            </div>
                            <span className="text-[11px] text-neutral-400">
                              {new Date(ev.createdAt).toLocaleString(locale)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Review Required Protected Records if DELETION */}
                  {activeRequestDetail.reviewRequiredItems.length > 0 && (
                    <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
                      <h4 className="font-semibold text-blue-300 mb-1">
                        Registros Protegidos com Revisão Necessária (PRESERVED_PENDING_REVIEW)
                      </h4>
                      <p className="text-neutral-400 mb-3 text-[11px]">
                        Em solicitações de eliminação, estes registros não são excluídos automaticamente por exigirem validação jurídica ou preservação legal.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-neutral-300">
                        {activeRequestDetail.reviewRequiredItems.map((item, idx) => (
                          <li key={idx}>
                            <span className="font-medium text-neutral-200">{item.category}:</span> {item.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Safe Details */}
                  {Object.keys(activeRequestDetail.details).length > 0 && (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                      <h4 className="font-semibold text-neutral-300 mb-1">Metadados da Solicitação</h4>
                      <pre className="font-mono text-[11px] text-neutral-400 overflow-x-auto">
                        {JSON.stringify(activeRequestDetail.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: EXECUTIONS                                                 */}
      {/* ================================================================= */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            {executionsList.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                {t('admin.emptyExecutions')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="border-b border-neutral-800 bg-neutral-900/50 uppercase text-neutral-400">
                    <tr>
                      <th className="px-4 py-3">{t('admin.colExecutionId')}</th>
                      <th className="px-4 py-3">{t('admin.colMode')}</th>
                      <th className="px-4 py-3">{t('admin.colStatus')}</th>
                      <th className="px-4 py-3">{t('admin.colPhase')}</th>
                      <th className="px-4 py-3">{t('admin.colFingerprint')}</th>
                      <th className="px-4 py-3">{t('admin.colDeletions')}</th>
                      <th className="px-4 py-3">{t('admin.colAnonymizations')}</th>
                      <th className="px-4 py-3">{t('admin.colReviewRequired')}</th>
                      <th className="px-4 py-3 text-right">{t('admin.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {executionsList.map((ex) => (
                      <tr key={ex.id} className="hover:bg-neutral-900/30">
                        <td className="px-4 py-3 font-mono text-neutral-400">
                          {ex.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {ex.mode}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              ex.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : ex.status === 'FAILED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-300">
                          {ex.currentPhase}
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-400">
                          {ex.planFingerprint}
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {ex.deleteItemCount} itens / {ex.deleteRecordCount} reg
                        </td>
                        <td className="px-4 py-3 text-neutral-300">
                          {ex.anonymizeItemCount}
                        </td>
                        <td className="px-4 py-3 text-blue-400">
                          {ex.reviewRequiredCount} preservados
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenExecutionDetail(ex.id)}
                            className="rounded bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
                          >
                            {t('admin.btnViewDetail')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Execution Detail Modal */}
          {activeExecutionDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-100">
                      Execução do Ciclo de Vida
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-neutral-400">
                      ID: {activeExecutionDetail.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveExecutionDetail(null)}
                    className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700"
                  >
                    {t('admin.btnClose')}
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neutral-800 px-2 py-1 font-semibold text-neutral-200">
                      Status: {activeExecutionDetail.status}
                    </span>
                    <span className="rounded bg-neutral-800 px-2 py-1 text-neutral-300">
                      Fase: {activeExecutionDetail.currentPhase}
                    </span>
                    {activeExecutionDetail.isSynthetic && (
                      <span className="rounded border border-amber-800 bg-amber-950/80 px-2 py-1 text-amber-300">
                        {t('admin.syntheticDevBadge')}
                      </span>
                    )}
                  </div>

                  {/* Safe Event Timeline */}
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
                    <h4 className="font-semibold text-neutral-200 mb-3">Linha do Tempo da Saga (Append-Only)</h4>
                    <div className="space-y-3">
                      {activeExecutionDetail.events.map((ev) => (
                        <div key={ev.id} className="border-l-2 border-neutral-700 pl-3 py-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-neutral-200">{ev.phase} — {ev.eventType}</span>
                            <span className="text-[10px] text-neutral-500">{new Date(ev.createdAt).toLocaleTimeString(locale)}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">Ator: {ev.actor}</p>
                          {Object.keys(ev.safeMetadata).length > 0 && (
                            <pre className="mt-1 font-mono text-[10px] text-neutral-500 bg-neutral-950/60 p-1.5 rounded overflow-x-auto">
                              {JSON.stringify(ev.safeMetadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: REPORTS                                                    */}
      {/* ================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Controls & Export */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">{t('admin.reportsTitle')}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{t('admin.csvNotice')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                className="rounded-lg bg-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-300 disabled:opacity-50 transition-colors"
              >
                {isExportingCsv ? t('admin.exportingCsv') : t('admin.btnExportCsv')}
              </button>
            </div>
          </div>

          {/* Volume Summary Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: t('admin.repPreservedVolume'), count: reportsData.reviewRequiredVolume, color: 'text-blue-400' },
              { label: t('admin.repExternalPendingVolume'), count: reportsData.externalErasurePendingVolume, color: 'text-purple-400' },
              { label: t('admin.repFailedBlockedVolume'), count: reportsData.failedBlockedVolume, color: 'text-rose-400' },
              { label: t('admin.repAnonymizationVolume'), count: reportsData.anonymizationVolume, color: 'text-amber-400' },
              { label: t('admin.repDeletionVolume'), count: reportsData.deletionVolume, color: 'text-emerald-400' },
            ].map((card, idx) => (
              <div key={idx} className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-xs font-medium text-neutral-400">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.count}</p>
              </div>
            ))}
          </div>

          {/* Canonical DSR Distribution Bars */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4">{t('admin.repVolumeByType')}</h3>
            <div className="space-y-3">
              {reportsData.requestsByType.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300">{getRightLabel(item.type)}</span>
                    <span className="font-mono text-neutral-400">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-400"
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: PROCESSORS                                                 */}
      {/* ================================================================= */}
      {activeTab === 'processors' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <h2 className="text-sm font-semibold text-neutral-200">{t('admin.processorsTitle')}</h2>
            <p className="text-xs text-neutral-400 mt-1">{t('admin.processorsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {initialProcessors.map((proc, idx) => (
              <div key={idx} className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100">{proc.system}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{proc.purpose}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      proc.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : proc.status === 'CONFIGURED_BUT_DISABLED'
                        ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                        : proc.status === 'MOCK_ONLY'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {proc.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-neutral-800/60 pt-3">
                  <div>
                    <span className="text-[11px] text-neutral-500 block">{t('admin.procColDpa')}</span>
                    <span className="font-semibold text-amber-400/90">{proc.contractReviewStatus}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500 block">{t('admin.procColTransfer')}</span>
                    <span className="text-neutral-300">{proc.internationalTransfer} ({proc.transferDestination})</span>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-[11px] text-neutral-500 block">{t('admin.procColErasure')}</span>
                    <span className="text-neutral-300">{proc.deletionCapability}</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 bg-neutral-900/50 p-2 rounded">
                  {proc.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 6: RETENTION                                                  */}
      {/* ================================================================= */}
      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4">
            <h3 className="text-sm font-semibold text-amber-300">
              {t('admin.retentionDraftNotice')}
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              {t('admin.unapprovedRetentionNote')}. Nenhum botão de aprovação ou alteração de prazos está ativo nesta fase.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="border-b border-neutral-800 bg-neutral-900/50 uppercase text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">{t('admin.retColCategory')}</th>
                    <th className="px-4 py-3">{t('admin.retColTrigger')}</th>
                    <th className="px-4 py-3">{t('admin.retColDuration')}</th>
                    <th className="px-4 py-3">{t('admin.retColBasis')}</th>
                    <th className="px-4 py-3">{t('admin.retColVersion')}</th>
                    <th className="px-4 py-3">{t('admin.retColApproval')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {initialRetentionPolicies.map((pol, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/30">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-neutral-200 block">{pol.displayName}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{pol.tables.join(', ')}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-400">
                        {pol.triggerEvent}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-400">
                        {pol.durationDescription}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {pol.legalReferenceDraft}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-400">
                        {pol.policyVersion}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                          {pol.legalBasisStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 7: AUDIT                                                      */}
      {/* ================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200">{t('admin.auditTitle')}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">{t('admin.auditSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAuditFilter('ALL')}
                className={`rounded px-2.5 py-1 font-medium ${auditFilter === 'ALL' ? 'bg-neutral-200 text-neutral-950' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {t('admin.auditSourceAll')}
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('DSR')}
                className={`rounded px-2.5 py-1 font-medium ${auditFilter === 'DSR' ? 'bg-neutral-200 text-neutral-950' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {t('admin.auditSourceDsr')}
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('LIFECYCLE')}
                className={`rounded px-2.5 py-1 font-medium ${auditFilter === 'LIFECYCLE' ? 'bg-neutral-200 text-neutral-950' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {t('admin.auditSourceLifecycle')}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            {initialAuditEvents.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">{t('admin.emptyAudit')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="border-b border-neutral-800 bg-neutral-900/50 uppercase text-neutral-400">
                    <tr>
                      <th className="px-4 py-3">{t('admin.audColTimestamp')}</th>
                      <th className="px-4 py-3">{t('admin.audColSource')}</th>
                      <th className="px-4 py-3">{t('admin.audColEventType')}</th>
                      <th className="px-4 py-3">{t('admin.audColActor')}</th>
                      <th className="px-4 py-3">{t('admin.audColTarget')}</th>
                      <th className="px-4 py-3">{t('admin.audColMetadata')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {initialAuditEvents
                      .filter((ev) => (auditFilter === 'ALL' ? true : ev.category === auditFilter))
                      .map((ev) => (
                        <tr key={ev.id} className="hover:bg-neutral-900/30">
                          <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                            {new Date(ev.timestamp).toLocaleString(locale)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                              {ev.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-neutral-200">{ev.eventType}</td>
                          <td className="px-4 py-3 text-neutral-400">{ev.actor}</td>
                          <td className="px-4 py-3 font-mono text-neutral-400">{ev.targetReference}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-neutral-500 max-w-xs truncate">
                            {JSON.stringify(ev.safeMetadata)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 8: RISKS & PENDING DECISIONS                                  */}
      {/* ================================================================= */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <h2 className="text-sm font-semibold text-neutral-200">{t('admin.risksTitle')}</h2>
            <p className="text-xs text-neutral-400 mt-1">{t('admin.risksSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {initialRisks.map((risk) => (
              <div key={risk.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        risk.severity === 'HIGH'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : risk.severity === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {risk.severity === 'HIGH'
                        ? t('admin.riskSeverityHigh')
                        : risk.severity === 'MEDIUM'
                        ? t('admin.riskSeverityMedium')
                        : t('admin.riskSeverityLow')}
                    </span>
                    <h3 className="font-bold text-neutral-100 text-sm">{risk.title}</h3>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-400">
                    {risk.legalReviewRequired ? t('admin.riskLegalRequired') : t('admin.riskLegalNotRequired')}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-3">{risk.description}</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-neutral-900/40 p-2.5 rounded">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                      {t('admin.riskColImpact')}
                    </span>
                    <span className="text-neutral-400 text-[11px]">{risk.impact}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                      {t('admin.riskColSource')}
                    </span>
                    <span className="font-mono text-neutral-400 text-[11px]">{risk.sourceReference}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrated LGPD-02A Lifecycle Simulator in Collapsible Drawer */}
      <div className="mt-12 pt-8 border-t border-neutral-800">
        <details className="group rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
          <summary className="cursor-pointer text-xs font-semibold text-neutral-400 uppercase tracking-wider select-none hover:text-neutral-200">
            ▶ {t('admin.simulatorTitle')} (Simulação Observacional)
          </summary>
          <div className="mt-4">
            <PrivacyDryRunSimulator
              initialSubjects={requestsList.slice(0, 10).map((r) => ({
                requestId: r.id,
                subjectId: r.id,
                requestType: r.requestType,
              }))}
              translations={{
                simulatorTitle: t('admin.simulatorTitle'),
                simulatorSubtitle: t('admin.simulatorSubtitle'),
                dryRunWarning: t('admin.dryRunWarning'),
                simulateButton: t('admin.simulateButton'),
                simulating: t('admin.simulating'),
                enterSubjectId: t('admin.enterSubjectId'),
                selectFromDsr: t('admin.selectFromDsr'),
                planSummary: t('admin.planSummary'),
                plannedItems: t('admin.plannedItems'),
                targetStore: t('admin.targetStore'),
                actionPlanned: t('admin.actionPlanned'),
                records: t('admin.records'),
                rationale: t('admin.rationale'),
                exportData: t('admin.exportData'),
                exporting: t('admin.exporting'),
                exportZip: t('admin.exportZip'),
                exportJson: t('admin.exportJson'),
                noPlanGenerated: t('admin.noPlanGenerated'),
                actionDelete: t('admin.actionDelete'),
                actionAnonymize: t('admin.actionAnonymize'),
                actionDetach: t('admin.actionDetach'),
                actionRetain: t('admin.actionRetain'),
                actionExternalErasure: t('admin.actionExternalErasure'),
                actionReviewRequired: t('admin.actionReviewRequired'),
                unapprovedRetentionNote: t('admin.unapprovedRetentionNote'),
              }}
            />
          </div>
        </details>
      </div>
    </div>
  )
}
