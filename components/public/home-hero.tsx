import React from 'react'
import { getMarketplaceName } from '@/lib/brand'
import { PublicContainer } from './public-container'

export function HomeHero() {
  const brandName = getMarketplaceName()

  return (
    <section className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
      <PublicContainer>
        <div className="py-12 md:py-20 max-w-3xl flex flex-col justify-center min-h-[30vh] md:min-h-[380px]">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-foreground)] tracking-tight leading-[1.15] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Encontre perfis em São Paulo
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-foreground-muted)] max-w-2xl leading-relaxed">
            Descubra perfis verificados diretamente no {brandName}. Acesso direto, sem intermediários.
          </p>
        </div>
      </PublicContainer>
    </section>
  )
}
