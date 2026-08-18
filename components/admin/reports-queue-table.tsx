/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { resolveReportAction } from '@/modules/reports/actions'
import type { ReportQueueItem, ReportResolutionAction } from '@/modules/reports/types'

interface ReportsQueueTableProps {
  initialReports: ReportQueueItem[]
}

const REASON_LABELS: Record<string, string> = {
  UNDERAGE_SUSPICION: 'Suspeita de Menoridade',
  NON_CONSENSUAL: 'Imagem Não Consensual',
  IMPERSONATION_OR_STOLEN: 'Perfil Falso / Foto Roubada',
  VIOLENCE_OR_EXPLOITATION: 'Violência / Exploração',
  SCAM_OR_FRAUD: 'Golpe / Fraude',
  MISLEADING_LOCATION: 'Localização Incorreta',
  OTHER: 'Outro',
}

export function ReportsQueueTable({ initialReports }: ReportsQueueTableProps) {
  const [reports, setReports] = useState(initialReports)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportQueueItem | null>(null)
  const [actionType, setActionType] = useState<ReportResolutionAction>('DISMISS')
  const [notes, setNotes] = useState('')

  const handleResolveConfirm = async () => {
    if (!selectedReport) return
    setActionInProgress(selectedReport.id)

    const res = await resolveReportAction({
      reportId: selectedReport.id,
      action: actionType,
      resolutionNotes: notes,
    })

    setActionInProgress(null)

    if (res.success) {
      setReports((prev) => prev.filter((r) => r.id !== selectedReport.id))
      setSelectedReport(null)
      setNotes('')
    } else {
      alert(res.error || 'Erro ao resolver denúncia')
    }
  }

  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1f2937', borderRadius: '0.5rem', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#f3f4f6' }}>Nenhuma Denúncia Pendente</p>
        <p style={{ fontSize: '0.875rem' }}>Não há denúncias abertas aguardando resolução.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #374151' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#111827', color: '#9ca3af', borderBottom: '1px solid #374151' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Alvo</th>
              <th style={{ padding: '0.75rem 1rem' }}>Motivo</th>
              <th style={{ padding: '0.75rem 1rem' }}>Descrição do Visitante</th>
              <th style={{ padding: '0.75rem 1rem' }}>Data</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const isUnderage = report.reason_category === 'UNDERAGE_SUSPICION'
              return (
                <tr
                  key={report.id}
                  style={{
                    borderBottom: '1px solid #374151',
                    backgroundColor: isUnderage ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {report.media_preview_url && (
                        <img
                          src={report.media_preview_url}
                          alt="Target"
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '0.25rem' }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{report.stage_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{report.target_type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: isUnderage ? '#991b1b' : '#374151',
                        color: isUnderage ? '#fecaca' : '#d1d5db',
                      }}
                    >
                      {REASON_LABELS[report.reason_category] || report.reason_category}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', maxWidth: '300px' }}>
                    {report.description || <span style={{ color: '#6b7280' }}>(Sem descrição adicional)</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                    {new Date(report.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedReport(report)
                        setActionType(report.target_type === 'MEDIA' ? 'QUARANTINE_MEDIA' : 'FLAG_PROFILE')
                      }}
                      disabled={actionInProgress === report.id}
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Avaliar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resolution Modal */}
      {selectedReport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '500px', width: '100%', color: '#f3f4f6' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Resolver Denúncia — {selectedReport.stage_name}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
              Motivo: <strong>{REASON_LABELS[selectedReport.reason_category]}</strong>
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ação Administrativa *</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ReportResolutionAction)}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              >
                {selectedReport.target_type === 'MEDIA' && (
                  <option value="QUARANTINE_MEDIA">Quarentenar Mídia (Remove do Ar)</option>
                )}
                {selectedReport.target_type === 'PROFILE' && (
                  <option value="FLAG_PROFILE">Flaggar Perfil (Bloqueia Publicação)</option>
                )}
                <option value="DISMISS">Descartar Denúncia (Sem Ação / Improcedente)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Notas de Resolução (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observações da análise..."
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#374151', color: '#fff', borderRadius: '0.375rem', border: '1px solid #4b5563' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setSelectedReport(null)} style={{ padding: '0.5rem 1rem', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleResolveConfirm} style={{ padding: '0.5rem 1rem', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>Concluir Resolução</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
