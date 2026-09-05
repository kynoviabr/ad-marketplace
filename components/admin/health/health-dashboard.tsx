'use client'

import React, { useState, useTransition } from 'react'
import type { SystemHealthSnapshot, HealthStatus } from '@/modules/observability/health'
import { HealthCard } from './health-card'
import { refreshHealthSnapshotAction } from '@/app/(admin)/admin/health/actions'

export interface HealthDashboardProps {
  initialSnapshot: SystemHealthSnapshot
  locale?: string
}

function getOverallStatusInfo(status: HealthStatus, isPt: boolean) {
  switch (status) {
    case 'HEALTHY':
      return {
        icon: '✓',
        title: isPt ? 'Saudável — Operação Normal' : 'Healthy — Normal Operation',
        description: isPt
          ? 'Todos os subsistemas críticos e secundários estão operando dentro dos parâmetros esperados.'
          : 'All critical and secondary subsystems are operating within expected parameters.',
        color: '#34d399',
        bgColor: '#064e3b',
        borderColor: '#059669',
      }
    case 'DEGRADED':
      return {
        icon: '!',
        title: isPt ? 'Degradado — Requer Atenção Operacional' : 'Degraded — Requires Operational Attention',
        description: isPt
          ? 'A plataforma permanece operacional, mas uma ou mais dependências não-críticas requerem intervenção.'
          : 'Platform remains operational, but one or more non-critical capabilities require attention.',
        color: '#fbbf24',
        bgColor: '#78350f',
        borderColor: '#d97706',
      }
    case 'UNHEALTHY':
      return {
        icon: '✕',
        title: isPt ? 'Não Saudável — Falha de Infraestrutura Crítica' : 'Unhealthy — Critical Infrastructure Failure',
        description: isPt
          ? 'Falha em subsistema crítico (Banco de dados, Autenticação ou Configuração). Impacto imediato nas operações.'
          : 'Failure in a critical subsystem (Database, Auth, or Configuration). Immediate operational impact.',
        color: '#f87171',
        bgColor: '#7f1d1d',
        borderColor: '#b91c1c',
      }
    case 'UNKNOWN':
    default:
      return {
        icon: '?',
        title: isPt ? 'Desconhecido — Estado Não Verificável' : 'Unknown — State Unverifiable',
        description: isPt
          ? 'Não foi possível compor um diagnóstico seguro dos subsistemas da plataforma.'
          : 'Could not assemble a reliable health assessment of platform subsystems.',
        color: '#9ca3af',
        bgColor: '#374151',
        borderColor: '#4b5563',
      }
  }
}

export function HealthDashboard({ initialSnapshot, locale = 'pt-BR' }: HealthDashboardProps) {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot>(initialSnapshot)
  const [isPending, startTransition] = useTransition()
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(snapshot.timestamp)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const isPt = locale === 'pt-BR'
  const overallInfo = getOverallStatusInfo(snapshot.status, isPt)
  const probeList = Object.values(snapshot.probes)

  const handleManualRefresh = () => {
    setErrorNotice(null)
    startTransition(async () => {
      try {
        const freshSnapshot = await refreshHealthSnapshotAction()
        setSnapshot(freshSnapshot)
        setLastRefreshedTime(freshSnapshot.timestamp)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao reavaliar integridade'
        setErrorNotice(msg)
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header: Title, Subtitle, and Refresh Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ color: '#f59e0b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>
            {isPt ? 'TELEMETRIA & OPERAÇÕES' : 'TELEMETRY & OPERATIONS'}
          </p>
          <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            {isPt ? 'Saúde do Sistema' : 'System Health'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            {isPt
              ? 'Monitor em tempo real da integridade operacional, latência e prontidão dos subsistemas da plataforma.'
              : 'Real-time operational monitor for platform subsystem health, latency, and operational readiness.'}
          </p>
        </div>

        <div>
          <button
            onClick={handleManualRefresh}
            disabled={isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: isPending ? '#4b5563' : '#f59e0b',
              color: '#111827',
              fontWeight: 700,
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1rem', display: 'inline-block', transform: isPending ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>
              ↻
            </span>
            <span>
              {isPending
                ? (isPt ? 'Verificando subsistemas…' : 'Checking subsystems…')
                : (isPt ? 'Atualizar Saúde' : 'Refresh Health')}
            </span>
          </button>
        </div>
      </div>

      {/* Error notification if recheck fails */}
      {errorNotice && (
        <div
          role="alert"
          style={{
            backgroundColor: '#7f1d1d',
            border: '1px solid #b91c1c',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#fecaca',
            fontSize: '0.875rem',
          }}
        >
          <strong>{isPt ? 'Erro ao atualizar:' : 'Update Error:'} </strong>
          {errorNotice}
        </div>
      )}

      {/* Overall Health Status Banner */}
      <section
        aria-label={isPt ? 'Status geral da plataforma' : 'Overall platform status'}
        style={{
          backgroundColor: overallInfo.bgColor,
          border: `1px solid ${overallInfo.borderColor}`,
          borderRadius: '0.5rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: overallInfo.color,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111827',
            border: `1px solid ${overallInfo.borderColor}`,
            flexShrink: 0,
          }}
        >
          {overallInfo.icon}
        </div>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
            {overallInfo.title}
          </h2>
          <p style={{ color: '#e5e7eb', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
            {overallInfo.description}
          </p>
        </div>
      </section>

      {/* Metric Summary Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* Total Latency */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Latência de Avaliação' : 'Evaluation Latency'}
          </span>
          <strong style={{ display: 'block', color: '#ffffff', fontSize: '1.6rem', marginTop: '0.35rem' }}>
            {snapshot.totalLatencyMs} ms
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {isPt ? 'Execução paralela das sondas' : 'Parallel probe execution'}
          </span>
        </div>

        {/* Healthy Count */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Subsistemas Saudáveis' : 'Healthy Subsystems'}
          </span>
          <strong style={{ display: 'block', color: '#34d399', fontSize: '1.6rem', marginTop: '0.35rem' }}>
            {snapshot.summary.healthyCount} / {snapshot.summary.totalCount}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {isPt ? 'Operação regular' : 'Regular operation'}
          </span>
        </div>

        {/* Degraded Count */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Subsistemas Degradados' : 'Degraded Subsystems'}
          </span>
          <strong style={{ display: 'block', color: snapshot.summary.degradedCount > 0 ? '#fbbf24' : '#ffffff', fontSize: '1.6rem', marginTop: '0.35rem' }}>
            {snapshot.summary.degradedCount}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {isPt ? 'Atenção operacional recomendada' : 'Operational attention recommended'}
          </span>
        </div>

        {/* Unhealthy Count */}
        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            {isPt ? 'Subsistemas com Falha' : 'Failing Subsystems'}
          </span>
          <strong style={{ display: 'block', color: snapshot.summary.unhealthyCount > 0 ? '#f87171' : '#ffffff', fontSize: '1.6rem', marginTop: '0.35rem' }}>
            {snapshot.summary.unhealthyCount}
          </strong>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {isPt ? 'Falhas em dependências críticas' : 'Critical dependency failures'}
          </span>
        </div>
      </div>

      {/* Subsystem Health Cards Grid */}
      <section aria-labelledby="subsystem-probes-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 id="subsystem-probes-title" style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            {isPt ? 'Sondas de Subsistema' : 'Subsystem Probes'}
          </h2>
          <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
            {probeList.length} {isPt ? 'subsistemas monitorados' : 'monitored subsystems'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {probeList.map((probe) => (
            <HealthCard key={probe.name} probe={probe} locale={locale} />
          ))}
        </div>
      </section>

      {/* Operational Diagnostics Section */}
      <section
        style={{
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          color: '#9ca3af',
          fontSize: '0.8rem',
        }}
        aria-label={isPt ? 'Diagnósticos de telemetria' : 'Telemetry diagnostics'}
      >
        <h3 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
          {isPt ? 'Diagnósticos Operacionais' : 'Operational Diagnostics'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
          <div>
            <strong style={{ color: '#d1d5db' }}>{isPt ? 'Última Verificação' : 'Last Checked'}: </strong>
            <span>{new Date(lastRefreshedTime).toLocaleString(locale)}</span>
          </div>
          <div>
            <strong style={{ color: '#d1d5db' }}>{isPt ? 'Timestamp ISO' : 'ISO Timestamp'}: </strong>
            <span style={{ fontFamily: 'monospace' }}>{lastRefreshedTime}</span>
          </div>
          {snapshot.correlationId && (
            <div>
              <strong style={{ color: '#d1d5db' }}>{isPt ? 'ID de Correlação' : 'Correlation ID'}: </strong>
              <span style={{ fontFamily: 'monospace' }}>{snapshot.correlationId}</span>
            </div>
          )}
          <div>
            <strong style={{ color: '#d1d5db' }}>{isPt ? 'Política de Cache' : 'Cache Policy'}: </strong>
            <span>{isPt ? 'Tempo Real (Sem cache persistente)' : 'Real-time (No persistent cache)'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
