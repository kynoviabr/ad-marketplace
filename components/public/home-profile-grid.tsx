import React from 'react'
import type { SearchResultDTO } from '@/modules/search/types'
import { HomeProfileCard } from './home-profile-card'
import { PublicContainer, PublicSection } from './public-container'

interface ProfileWithMedia extends SearchResultDTO {
  mediaUrl: string | null
}

interface HomeProfileGridProps {
  profiles: ProfileWithMedia[]
}

export function HomeProfileGrid({ profiles }: HomeProfileGridProps) {
  if (profiles.length === 0) {
    return (
      <PublicSection background="surface" paddingY="lg">
        <div className="max-w-2xl mx-auto text-center py-12 md:py-20 border border-[var(--color-border)] rounded-2xl bg-white shadow-sm px-6">
          <div className="w-16 h-16 mx-auto bg-[var(--color-surface-muted)] rounded-full flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-foreground-muted)]">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Estamos preparando os primeiros perfis em São Paulo
          </h2>
          <p className="text-[var(--color-foreground-muted)] text-lg leading-relaxed">
            Nossa equipe está validando a identidade e idade das primeiras profissionais. 
            Em breve o marketplace estará disponível.
          </p>
        </div>
      </PublicSection>
    )
  }

  return (
    <PublicSection background="surface" paddingY="md">
      <h2 className="text-xl md:text-2xl font-bold text-[var(--color-foreground)] mb-6 md:mb-8" style={{ fontFamily: 'var(--font-display)' }}>
        Perfis em destaque
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {profiles.map((profile, index) => (
          <HomeProfileCard 
            key={profile.id} 
            profile={profile} 
            mediaUrl={profile.mediaUrl}
            priority={index < 4} // Only prioritize first row
          />
        ))}
      </div>
    </PublicSection>
  )
}
