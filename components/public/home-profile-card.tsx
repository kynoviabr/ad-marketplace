import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SearchResultDTO } from '@/modules/search/types'

interface HomeProfileCardProps {
  profile: SearchResultDTO
  mediaUrl: string | null
  priority?: boolean
}

export function HomeProfileCard({ profile, mediaUrl, priority = false }: HomeProfileCardProps) {
  // FASE 12.1C: Whole card clickable targeting /perfil/[slug]
  return (
    <Link href={`/perfil/${profile.slug}`} className="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-verified)] rounded-xl">
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[var(--color-border-strong)] h-full flex flex-col">
        
        {/* Photo Container - 3:4 Aspect Ratio */}
        <div className="relative aspect-[3/4] bg-[var(--color-surface-muted)] overflow-hidden">
          {mediaUrl ? (
            <Image
              src={mediaUrl}
              alt={`Foto de ${profile.stageName}`}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--color-foreground-muted)] text-sm">
              Sem foto
            </div>
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

          {/* Badges Area (Top) */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
            {profile.isSponsored && (
              <span className="bg-[var(--color-sponsored)] text-[var(--color-sponsored-label)] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm">
                Patrocinado
              </span>
            )}
            {profile.isVerified && (
              <span className="bg-[var(--color-verified)] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider shadow-sm flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Verificada 18+
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 flex flex-col flex-1 justify-between bg-white">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--color-foreground)] text-lg truncate pr-2 group-hover:text-[var(--color-accent)] transition-colors">
                {profile.stageName}
              </h3>
              {profile.publicAge && (
                <span className="text-sm font-medium text-[var(--color-foreground-muted)] shrink-0">
                  {profile.publicAge} anos
                </span>
              )}
            </div>
            
            {profile.primaryLocation && (
              <div className="text-sm text-[var(--color-foreground-2)] truncate flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {profile.primaryLocation.name}
              </div>
            )}
          </div>
        </div>

      </div>
    </Link>
  )
}
