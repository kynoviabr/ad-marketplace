'use client'

import React, { useState, useTransition } from 'react'
import type { AdminPlatformMetricsDTO } from '@/modules/analytics/types'
import { triggerDailyAggregationAction } from '@/modules/analytics/actions'

interface AdminAnalyticsDashboardViewProps {
  initialMetrics: AdminPlatformMetricsDTO
}

export function AdminAnalyticsDashboardView({ initialMetrics }: AdminAnalyticsDashboardViewProps) {
  const [metrics] = useState<AdminPlatformPlatformDTO>(initialMetrics)
  const [isPending, startTransition] = useTransition()
  const [aggregationMsg, setAggregationMsg] = useState<string | null>(null)
  const [customDate, setCustomDate] = useState('')

  const handleRunAggregation = () => {
    startTransition(async () => {
      setAggregationMsg(null)
      const res = await triggerDailyAggregationAction(customDate || undefined)
      if (res.success) {
        setAggregationMsg(`✓ Agregação concluída para ${res.data.processedDate}: ${res.data.summary}`)
      } else {
        setAggregationMsg(`✗ Erro: ${res.error}`)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Top Action Bar: Run Aggregation */}
      <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Agregação Diária de Métricas (MVP Manual)</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
              Consolida eventos brutos em tabelas agregadas diárias de forma determinística e idempotente.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              style={{
                backgroundColor: '#111827',
                border: '1px solid #4b5563',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleRunAggregation}
              disabled={isPending}
              style={{
                backgroundColor: '#f59e0b',
                color: '#111827',
                fontWeight: 600,
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? 'Executando...' : 'Executar Agregação Diária'}
            </button>
          </div>
        </div>

        {aggregationMsg && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: aggregationMsg.startsWith('✓') ? '#064e3b' : '#7f1d1d',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            {aggregationMsg}
          </div>
        )}
      </div>

      {/* Main KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Searches */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>Buscas Totais (Últimos {metrics.periodDays}d)</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
            {metrics.searchesTotal.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            Com filtros: {metrics.searchesWithFilters} • Sem resultado: {metrics.searchesZeroResults}
          </div>
        </div>

        {/* Impressions */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>Impressões no Feed</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
            {metrics.impressionsTotal.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            Orgânicas: {metrics.impressionsOrganic} • Patrocinadas: <span style={{ color: '#f59e0b' }}>{metrics.impressionsSponsored}</span>
          </div>
        </div>

        {/* WhatsApp Clicks */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>Cliques no WhatsApp</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {metrics.whatsappClicksTotal.toLocaleString('pt-BR')}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            Orgânicos: {metrics.whatsappClicksOrganic} • Patrocinados: {metrics.whatsappClicksSponsored}
          </div>
        </div>

        {/* CTR */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>Taxa de Cliques (CTR Geral)</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>
            {metrics.overallCtr}%
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            Cliques WhatsApp / Impressões
          </div>
        </div>

        {/* North Star: Clicks per Active Advertiser */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '2px solid #ec4899' }}>
          <div style={{ color: '#ec4899', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            ⭐ North Star Metric
          </div>
          <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px' }}>Cliques / Anunciante Ativo</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
            {metrics.contactClicksPerActiveAdvertiser}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
            Base: {metrics.activeAdvertisersCount} anunciantes ativas
          </div>
        </div>
      </div>

      {/* Top Tables Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Top Profiles */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Top 10 Perfis com Maior Engajamento
          </h3>
          {metrics.topProfiles.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              Nenhum dado agregado ainda. Execute a agregação diária após receber eventos.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ padding: '8px' }}>Nome Artístico</th>
                  <th style={{ padding: '8px' }}>Impressões</th>
                  <th style={{ padding: '8px' }}>WhatsApp</th>
                  <th style={{ padding: '8px' }}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topProfiles.map((p, idx) => (
                  <tr key={p.profileId} style={{ borderBottom: '1px solid #2d3748' }}>
                    <td style={{ padding: '8px', color: '#ffffff', fontWeight: 500 }}>
                      {idx + 1}. {p.stageName}
                    </td>
                    <td style={{ padding: '8px' }}>{p.impressionsTotal}</td>
                    <td style={{ padding: '8px', color: '#10b981', fontWeight: 600 }}>{p.whatsappClicks}</td>
                    <td style={{ padding: '8px', color: '#38bdf8' }}>{p.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Locations */}
        <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Top Bairros / Localizações
          </h3>
          {metrics.topLocations.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              Nenhum dado de localização registrado no período.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ padding: '8px' }}>Bairro</th>
                  <th style={{ padding: '8px' }}>Cidade</th>
                  <th style={{ padding: '8px' }}>Eventos</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topLocations.map((l) => (
                  <tr key={l.locationId} style={{ borderBottom: '1px solid #2d3748' }}>
                    <td style={{ padding: '8px', color: '#ffffff', fontWeight: 500 }}>{l.locationName}</td>
                    <td style={{ padding: '8px', color: '#9ca3af' }}>{l.cityName}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{l.impressionsTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

type AdminPlatformPlatformDTO = AdminPlatformMetricsDTO
