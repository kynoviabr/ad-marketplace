'use client'

import React from 'react'
import type { HealthProbeResult, HealthStatus, ProbeCriticality, HealthProbeMode } from '@/modules/observability/health'
import { formatSafeProbeMetadata } from './safe-metadata'

export interface HealthCardProps {
  probe: HealthProbeResult
  locale?: string
}

function getSubsystemFriendlyName(probeName: string, subsystem: string, isPt: boolean): string {
  switch (probeName) {
    case 'supabase-database':
      return isPt ? 'Banco de Dados (Supabase PostgreSQL)' : 'Database (Supabase PostgreSQL)'
    case 'supabase-auth':
      return isPt ? 'Autenticação & Contas (Supabase Auth)' : 'Authentication & Accounts (Supabase Auth)'
    case 'supabase-storage':
      return isPt ? 'Armazenamento de Mídia do Perfil' : 'Profile Media Storage'
    case 'didit-kyc':
      return isPt ? 'Verificação de Identidade (Didit KYC)' : 'Identity Verification (Didit KYC)'
    case 'billing-provider':
      return isPt ? 'Faturamento & Assinaturas' : 'Billing & Subscriptions'
    case 'email-otp':
      return isPt ? 'Entrega de E-mail & Senha OTP' : 'Email & Passwordless OTP Delivery'
    case 'app-config':
      return isPt ? 'Configuração da Aplicação' : 'Application Configuration'
    default:
      return subsystem
  }
}

function getStatusBadge(status: HealthStatus, isPt: boolean) {
  switch (status) {
    case 'HEALTHY':
      return {
        icon: '✓',
        label: isPt ? 'Saudável' : 'Healthy',
        color: '#34d399',
        bgColor: '#064e3b',
        borderColor: '#059669',
      }
    case 'DEGRADED':
      return {
        icon: '!',
        label: isPt ? 'Degradado' : 'Degraded',
        color: '#fbbf24',
        bgColor: '#78350f',
        borderColor: '#d97706',
      }
    case 'UNHEALTHY':
      return {
        icon: '✕',
        label: isPt ? 'Não Saudável' : 'Unhealthy',
        color: '#f87171',
        bgColor: '#7f1d1d',
        borderColor: '#b91c1c',
      }
    case 'UNKNOWN':
    default:
      return {
        icon: '?',
        label: isPt ? 'Desconhecido' : 'Unknown',
        color: '#9ca3af',
        bgColor: '#374151',
        borderColor: '#4b5563',
      }
  }
}

function getCriticalityBadge(crit: ProbeCriticality, isPt: boolean) {
  switch (crit) {
    case 'CRITICAL':
      return {
        label: isPt ? 'Crítico' : 'Critical',
        color: '#f87171',
        description: isPt ? 'Indispensável para o marketplace' : 'Essential marketplace dependency',
      }
    case 'IMPORTANT':
      return {
        label: isPt ? 'Importante' : 'Important',
        color: '#fbbf24',
        description: isPt ? 'Afeta capacidades centrais' : 'Affects core capabilities',
      }
    case 'INFORMATIONAL':
      return {
        label: isPt ? 'Informativo' : 'Informational',
        color: '#9ca3af',
        description: isPt ? 'Telemetria e suporte operacional' : 'Operational telemetry & support',
      }
  }
}

function getModeInfo(mode: HealthProbeMode, isPt: boolean) {
  switch (mode) {
    case 'ACTIVE':
      return {
        label: isPt ? 'Consulta Ativa' : 'Active Query',
        badgeColor: '#60a5fa',
        description: isPt
          ? 'Dependência consultada em tempo real com consulta segura de leitura.'
          : 'Dependency actively queried live via safe read-only call.',
      }
    case 'PASSIVE':
      return {
        label: isPt ? 'Passivo' : 'Passive',
        badgeColor: '#c084fc',
        description: isPt
          ? 'Avaliado a partir do estado interno do processo.'
          : 'Evaluated from internal in-memory process state.',
      }
    case 'CONFIG_ONLY':
      return {
        label: isPt ? 'Apenas Configuração' : 'Config Only',
        badgeColor: '#fb923c',
        description: isPt
          ? 'Verifica prontidão de parâmetros locais; não testa conectividade externa.'
          : 'Verifies local parameters/readiness; does not test external reachability.',
      }
  }
}

function getSafeOperatorGuidance(reasonCode: string, isPt: boolean): string {
  switch (reasonCode) {
    case 'OK':
      return isPt
        ? 'Operando normalmente dentro dos parâmetros de desempenho e segurança esperados.'
        : 'Operating normally within expected performance and security parameters.'
    case 'CONFIG_MISSING':
      return isPt
        ? 'Parâmetros de ambiente ou credenciais não configurados no ambiente atual.'
        : 'Required environment variables or credentials missing in current environment.'
    case 'CONFIG_INVALID':
      return isPt
        ? 'Um ou mais parâmetros de configuração possuem formato inválido ou malformado.'
        : 'One or more configuration parameters contain invalid or malformed format.'
    case 'PROBE_TIMEOUT':
      return isPt
        ? 'A dependência não respondeu dentro do limite de tempo configurado.'
        : 'Dependency did not respond within configured timeout limit.'
    case 'DATABASE_QUERY_FAILED':
      return isPt
        ? 'A consulta de teste ao banco de dados falhou ou foi rejeitada.'
        : 'Database test query failed or was rejected.'
    case 'STORAGE_UNAVAILABLE':
      return isPt
        ? 'O serviço de armazenamento de mídia retornou indisponibilidade ou erro.'
        : 'Media storage bucket returned unavailability or access error.'
    case 'DEPENDENCY_UNREACHABLE':
      return isPt
        ? 'Falha de conexão de rede ou rota inacessível para o serviço remoto.'
        : 'Network connection failure or unreachable route to remote service.'
    case 'AUTH_NOT_VERIFIABLE':
      return isPt
        ? 'O cliente de autenticação falhou na inicialização interna.'
        : 'Authentication client failed internal initialization.'
    default:
      return isPt
        ? 'Condição operacional anômala detectada. Verifique os logs estruturados.'
        : 'Anomalous operational state detected. Review structured server logs.'
  }
}

export function HealthCard({ probe, locale = 'pt-BR' }: HealthCardProps) {
  const isPt = locale === 'pt-BR'
  const friendlyName = getSubsystemFriendlyName(probe.name, probe.subsystem, isPt)
  const statusInfo = getStatusBadge(probe.status, isPt)
  const critInfo = getCriticalityBadge(probe.criticality, isPt)
  const modeInfo = getModeInfo(probe.mode, isPt)
  const guidance = getSafeOperatorGuidance(probe.reasonCode, isPt)
  const safeMetadata = formatSafeProbeMetadata(probe.metadata, locale)

  return (
    <div
      style={{
        background: '#1f2937',
        border: `1px solid ${statusInfo.borderColor}`,
        borderRadius: '0.5rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Top Header: Friendly Name, Subsystem and Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h3 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
            {friendlyName}
          </h3>
          <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {probe.subsystem} · {probe.name}
          </span>
        </div>

        <div
          role="status"
          aria-label={`${isPt ? 'Status' : 'Status'}: ${statusInfo.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            backgroundColor: statusInfo.bgColor,
            border: `1px solid ${statusInfo.borderColor}`,
            color: statusInfo.color,
            fontSize: '0.8rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden="true">{statusInfo.icon}</span>
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Badges Bar: Criticality, Mode & Latency */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        {/* Criticality */}
        <span
          title={critInfo.description}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            color: critInfo.color,
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.725rem',
            fontWeight: 600,
          }}
        >
          {isPt ? 'Criticidade' : 'Criticality'}: {critInfo.label}
        </span>

        {/* Probe Mode */}
        <span
          title={modeInfo.description}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            color: modeInfo.badgeColor,
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.725rem',
            fontWeight: 600,
          }}
        >
          {isPt ? 'Modo' : 'Mode'}: {modeInfo.label}
        </span>

        {/* Latency */}
        <span
          style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            color: '#e5e7eb',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.725rem',
            fontWeight: 500,
          }}
        >
          {isPt ? 'Latência' : 'Latency'}: {probe.reasonCode === 'PROBE_TIMEOUT' ? (isPt ? 'Tempo Esgotado' : 'Timed out') : `${probe.latencyMs} ms`}
        </span>

        {/* Reason Code */}
        <span
          style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            color: '#9ca3af',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.725rem',
            fontFamily: 'monospace',
          }}
        >
          {probe.reasonCode}
        </span>
      </div>

      {/* Mode Clarification Caption (Prevents fake reachability impression) */}
      <p style={{ color: '#9ca3af', fontSize: '0.775rem', margin: 0, lineHeight: 1.4 }}>
        <strong style={{ color: '#d1d5db' }}>{modeInfo.label}:</strong> {modeInfo.description}
      </p>

      {/* Safe Operator Message / Guidance */}
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: '0.375rem',
          padding: '0.65rem 0.75rem',
          borderLeft: `3px solid ${statusInfo.borderColor}`,
        }}
      >
        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>
          {isPt ? 'Orientação ao Operador' : 'Operator Guidance'}
        </span>
        <p style={{ color: '#e5e7eb', fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
          {probe.message ? `${probe.message}. ` : ''}
          {guidance}
        </p>
      </div>

      {/* Safe Allowlisted Metadata */}
      {safeMetadata.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem' }}>
          {safeMetadata.map((entry) => (
            <div
              key={entry.key}
              style={{
                backgroundColor: '#111827',
                border: entry.isWarning ? '1px solid #d97706' : '1px solid #374151',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.725rem',
                color: entry.isWarning ? '#fbbf24' : '#9ca3af',
              }}
            >
              <strong style={{ color: entry.isWarning ? '#f59e0b' : '#d1d5db' }}>{entry.label}: </strong>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
