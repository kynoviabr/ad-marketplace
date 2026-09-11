'use client'

import { useState } from 'react'
import {
  getAdminSubjectLifecycleDryRunAction,
  getAdminSubjectExportBundleAction,
  getAdminSubjectExportZipAction,
} from '@/modules/privacy/actions'
import {
  LifecyclePlan,
  LifecycleAction,
  SubjectExportBundle,
} from '@/modules/privacy/lifecycle-types'

interface DsrSubjectOption {
  requestId: string
  subjectId: string
  requestType: string
}

interface PrivacyDryRunSimulatorProps {
  initialSubjects: DsrSubjectOption[]
  translations: {
    simulatorTitle: string
    simulatorSubtitle: string
    dryRunWarning: string
    simulateButton: string
    simulating: string
    enterSubjectId: string
    selectFromDsr: string
    planSummary: string
    plannedItems: string
    targetStore: string
    actionPlanned: string
    records: string
    rationale: string
    exportData: string
    exporting: string
    exportZip: string
    exportJson: string
    noPlanGenerated: string
    actionDelete: string
    actionAnonymize: string
    actionDetach: string
    actionRetain: string
    actionExternalErasure: string
    actionReviewRequired: string
    unapprovedRetentionNote: string
  }
}

export function PrivacyDryRunSimulator({
  initialSubjects,
  translations: t,
}: PrivacyDryRunSimulatorProps) {
  const [subjectId, setSubjectId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingZip, setIsExportingZip] = useState(false)
  const [plan, setPlan] = useState<LifecyclePlan | null>(null)
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL')
  const [exportBundle, setExportBundle] = useState<SubjectExportBundle | null>(null)
  const [activeJsonTab, setActiveJsonTab] = useState<string>('manifest.json')
  const [error, setError] = useState<string | null>(null)

  const handleSimulate = async (targetId?: string) => {
    const idToRun = (targetId || subjectId).trim()
    if (!idToRun) {
      setError(t.enterSubjectId)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const res = await getAdminSubjectLifecycleDryRunAction(idToRun)
      if (res.success && res.data) {
        setPlan(res.data)
        setSubjectId(idToRun)
      } else {
        setError(res.error || 'Falha ao gerar simulação de ciclo de vida.')
      }
    } catch {
      setError('Erro de comunicação ao simular ciclo de vida.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenExportJson = async () => {
    if (!plan) return
    setIsExporting(true)
    setError(null)

    try {
      const res = await getAdminSubjectExportBundleAction(plan.subjectAccountId)
      if (res.success && res.data) {
        setExportBundle(res.data)
        setActiveJsonTab(Object.keys(res.data.files)[0] || 'manifest.json')
      } else {
        setError(res.error || 'Falha ao gerar pacote de exportação.')
      }
    } catch {
      setError('Erro de comunicação ao carregar pacote de exportação.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadZip = async () => {
    if (!plan) return
    setIsExportingZip(true)
    setError(null)

    try {
      const res = await getAdminSubjectExportZipAction(plan.subjectAccountId)
      if (res.success && res.data) {
        const byteCharacters = atob(res.data.base64Zip)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = res.data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        setError(res.error || 'Falha ao baixar arquivo ZIP.')
      }
    } catch {
      setError('Erro de comunicação ao baixar arquivo ZIP.')
    } finally {
      setIsExportingZip(false)
    }
  }

  const filteredItems = plan?.items.filter((item) => {
    if (selectedActionFilter === 'ALL') return true
    return item.action === selectedActionFilter
  }) ?? []

  const getActionBadgeStyle = (action: LifecycleAction) => {
    switch (action) {
      case 'DELETE':
        return 'bg-rose-950/80 text-rose-300 border-rose-800'
      case 'ANONYMIZE':
        return 'bg-amber-950/80 text-amber-300 border-amber-800'
      case 'DETACH':
        return 'bg-blue-950/80 text-blue-300 border-blue-800'
      case 'RETAIN':
        return 'bg-purple-950/80 text-purple-300 border-purple-800'
      case 'EXTERNAL_ERASURE':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
      case 'REVIEW_REQUIRED':
        return 'bg-orange-950/80 text-orange-300 border-orange-800'
    }
  }

  const getActionLabel = (action: LifecycleAction) => {
    switch (action) {
      case 'DELETE':
        return t.actionDelete
      case 'ANONYMIZE':
        return t.actionAnonymize
      case 'DETACH':
        return t.actionDetach
      case 'RETAIN':
        return t.actionRetain
      case 'EXTERNAL_ERASURE':
        return t.actionExternalErasure
      case 'REVIEW_REQUIRED':
        return t.actionReviewRequired
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-100">{t.simulatorTitle}</h2>
          <p className="text-xs text-neutral-400">{t.simulatorSubtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>DRY-RUN MODE (0 MUTATIONS)</span>
        </div>
      </div>

      {/* Prominent Red Warning Banner */}
      <div className="mt-4 rounded-lg border-2 border-rose-600/60 bg-rose-950/40 p-4 text-rose-200">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-rose-900/60 p-1.5 text-rose-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold tracking-wide text-rose-100">
              {t.dryRunWarning}
            </p>
            <p className="mt-1 text-xs text-rose-300/80">
              Ambiente de desenvolvimento seguro. Sem botões de exclusão física nesta fase.
            </p>
          </div>
        </div>
      </div>

      {/* Subject Input & DSR Quick Selector */}
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-300">
            {t.enterSubjectId}
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={() => handleSimulate()}
              disabled={isLoading || !subjectId.trim()}
              className="inline-flex items-center justify-center rounded-md bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {isLoading ? t.simulating : t.simulateButton}
            </button>
          </div>
        </div>

        {initialSubjects.length > 0 && (
          <div>
            <span className="text-[11px] font-medium text-neutral-400">
              {t.selectFromDsr}:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {initialSubjects.map((sub) => (
                <button
                  key={sub.requestId}
                  onClick={() => {
                    setSubjectId(sub.subjectId)
                    handleSimulate(sub.subjectId)
                  }}
                  className="rounded border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[11px] font-mono text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800"
                >
                  {sub.requestType}: {sub.subjectId.slice(0, 8)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* Plan Results View */}
      {plan ? (
        <div className="mt-6 space-y-6">
          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4 text-xs text-neutral-400">
            <div>
              <span className="text-neutral-500">Subject:</span>{' '}
              <span className="font-mono text-neutral-200">{plan.subjectAccountId}</span>{' '}
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
                {plan.subjectRole}
              </span>
              {plan.stageName && (
                <span className="ml-2 font-medium text-amber-300">
                  ({plan.stageName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenExportJson}
                disabled={isExporting}
                className="inline-flex items-center rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition disabled:opacity-50"
              >
                {isExporting ? t.exporting : t.exportJson}
              </button>
              <button
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="inline-flex items-center rounded border border-cyan-700/60 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition disabled:opacity-50"
              >
                {isExportingZip ? 'Packaging ZIP…' : t.exportZip}
              </button>
            </div>
          </div>

          {/* Action Summary Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t.planSummary}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  'DELETE',
                  'ANONYMIZE',
                  'DETACH',
                  'RETAIN',
                  'EXTERNAL_ERASURE',
                  'REVIEW_REQUIRED',
                ] as const
              ).map((act) => {
                const count = plan.summary[act]
                const isSelected = selectedActionFilter === act
                return (
                  <button
                    key={act}
                    onClick={() =>
                      setSelectedActionFilter(isSelected ? 'ALL' : act)
                    }
                    className={`rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? 'ring-2 ring-neutral-400'
                        : 'hover:border-neutral-700'
                    } ${getActionBadgeStyle(act)}`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      {getActionLabel(act)}
                    </div>
                    <div className="mt-1 text-xl font-extrabold">{count}</div>
                    {act === 'RETAIN' && (
                      <div className="mt-1 text-[9px] text-purple-300/70 leading-tight">
                        0 (Unapproved)
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-neutral-500 italic">
              {t.unapprovedRetentionNote}
            </p>
          </div>

          {/* Storage Discovery & Orphan Guard */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
            <h4 className="text-xs font-semibold text-neutral-300">
              Armazenamento Privado Descoberto (Supabase Storage)
            </h4>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-400">
              <div>
                Fotos Descobertas: <span className="font-mono text-neutral-200">{plan.storageDiscovered.photoCount}</span>
              </div>
              <div>
                Vídeos Descobertos: <span className="font-mono text-neutral-200">{plan.storageDiscovered.videoCount}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Risco de Arquivos Órfãos: Prevenido pelo Planejador
              </div>
            </div>
          </div>

          {/* Planned Items Table */}
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <h4 className="text-xs font-semibold text-neutral-300">
                {t.plannedItems} ({filteredItems.length})
              </h4>
              {selectedActionFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedActionFilter('ALL')}
                  className="text-[11px] text-neutral-400 underline hover:text-neutral-200"
                >
                  Ver Todos
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">{t.targetStore}</th>
                    <th className="px-4 py-2.5">Sistema</th>
                    <th className="px-4 py-2.5">{t.records}</th>
                    <th className="px-4 py-2.5">{t.actionPlanned}</th>
                    <th className="px-4 py-2.5">{t.rationale}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-900/30">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-200">
                        {item.target}
                        {item.isAuthLast && (
                          <span className="ml-2 inline-flex rounded bg-rose-950 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-800">
                            AUTH-LAST INVARIANT
                          </span>
                        )}
                        {item.auditSafeguarded && (
                          <span className="ml-2 inline-flex rounded bg-amber-950 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-800">
                            AUDIT SAFEGUARD
                          </span>
                        )}
                        {item.orphanRiskPrevented && (
                          <span className="ml-2 inline-flex rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-800">
                            ORPHAN GUARD
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-neutral-400 font-mono">
                        {item.system}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-200">
                        {item.recordCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getActionBadgeStyle(
                            item.action
                          )}`}
                        >
                          {getActionLabel(item.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400 max-w-md">
                        {item.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-800 p-8 text-center text-xs text-neutral-500">
          {t.noPlanGenerated}
        </div>
      )}

      {/* Export Bundle Modal */}
      {exportBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  Pacote de Exportação de Dados — LGPD Art. 18
                </h3>
                <p className="text-xs text-neutral-400">
                  Export ID: {exportBundle.manifest.exportId} | Checksum SHA-256: {exportBundle.manifest.checksumSha256.slice(0, 16)}…
                </p>
              </div>
              <button
                onClick={() => setExportBundle(null)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 rounded border border-amber-900/60 bg-amber-950/40 p-2.5 text-xs text-amber-300">
              {exportBundle.manifest.securityNotice}
            </div>

            {/* File Tabs */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-b border-neutral-800 pb-2">
              {Object.keys(exportBundle.files).map((filename) => (
                <button
                  key={filename}
                  onClick={() => setActiveJsonTab(filename)}
                  className={`rounded px-2.5 py-1 text-xs font-mono transition ${
                    activeJsonTab === filename
                      ? 'bg-neutral-100 text-neutral-900 font-bold'
                      : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {filename}
                </button>
              ))}
            </div>

            {/* Content Display */}
            <div className="mt-3 flex-1 overflow-auto rounded bg-neutral-900 p-4 font-mono text-xs text-neutral-200">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(exportBundle.files[activeJsonTab], null, 2)}
              </pre>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-800 pt-3">
              <button
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="rounded bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
              >
                {isExportingZip ? 'Baixando…' : 'Baixar ZIP Completo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
