'use client'

import { useState } from 'react'
import Link from 'next/link'
import { moderateProfileAction } from '@/modules/moderation/actions'
import type { PendingProfileQueueItem } from '@/modules/moderation/types'

interface ProfileModerationCardProps {
  initialProfiles: PendingProfileQueueItem[]
}

export function ProfileModerationCard({ initialProfiles }: ProfileModerationCardProps) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const handleAction = async (profileId: string, decision: 'APPROVE' | 'REJECT' | 'FLAG', reasonCode?: string) => {
    setActionInProgress(profileId)
    const res = await moderateProfileAction({
      profileId,
      decision,
      reasonCode,
    })
    setActionInProgress(null)

    if (res.success) {
      setProfiles((prev) => prev.filter((p) => p.id !== profileId))
    } else {
      alert(res.error || 'Erro ao moderar perfil')
    }
  }

  if (profiles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#1f2937', borderRadius: '0.5rem', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#f3f4f6' }}>Fila de Perfis Vazia</p>
        <p style={{ fontSize: '0.875rem' }}>Não há textos de perfis pendentes de moderação.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {profiles.map((profile) => (
        <div
          key={profile.id}
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            border: '1px solid #374151',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>{profile.stage_name}</h3>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                Slug: <code>{profile.slug}</code> • Idade: {profile.public_age ? `${profile.public_age} anos` : 'Não informada'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#065f46', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                Identidade: {profile.identity_verified ? 'Verificada' : 'Pendente'} · 18+: {profile.age_verified ? 'Confirmado' : 'Pendente'}
              </span>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                {profile.approved_photos_count} Fotos Aprovadas
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#111827', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Headline</strong>
              <p style={{ fontSize: '0.875rem', color: '#f3f4f6' }}>{profile.headline || '(Sem headline)'}</p>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Bio</strong>
              <p style={{ fontSize: '0.875rem', color: '#d1d5db', whiteSpace: 'pre-wrap' }}>{profile.bio || '(Sem bio)'}</p>
            </div>
            <div>
              <strong style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>Contatos Declarados</strong>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                WhatsApp: {profile.whatsapp_phone || 'N/A'} • Fone: {profile.direct_phone || 'N/A'} • Telegram: {profile.telegram_username || 'N/A'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link href={`/admin/moderation?profile=${profile.id}`} style={{ padding: '0.5rem 1rem', color: '#93c5fd', fontSize: '0.875rem' }}>
              Ver fotos pendentes
            </Link>
            <button
              onClick={() => handleAction(profile.id, 'FLAG', 'UNDERAGE_OR_POLICY')}
              disabled={actionInProgress === profile.id}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#b45309',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Flaggar Perfil
            </button>
            <button
              onClick={() => handleAction(profile.id, 'REJECT', 'INAPPROPRIATE_TEXT')}
              disabled={actionInProgress === profile.id}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Rejeitar Textos
            </button>
            <button
              onClick={() => handleAction(profile.id, 'APPROVE')}
              disabled={actionInProgress === profile.id}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Aprovar Textos
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
