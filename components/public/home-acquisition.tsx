import React from 'react'
import Link from 'next/link'
import { PublicSection } from './public-container'
import { getMarketplaceName } from '@/lib/brand'

export function HomeAcquisition() {
  const brandName = getMarketplaceName()

  return (
    <PublicSection background="surface" paddingY="lg">
      <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-sm border border-[var(--color-border)] relative">
        {/* Background gradient (restrained, modern) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface-muted)] to-[var(--color-surface)]" />
        
        <div className="relative p-8 md:p-12 lg:p-16 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--color-foreground)] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            É profissional em São Paulo?
          </h2>
          <p className="text-lg md:text-xl text-[var(--color-foreground-2)] max-w-2xl mb-8 leading-relaxed">
            Tenha um perfil público no {brandName}, receba contato direto no seu WhatsApp e gerencie seus anúncios com autonomia.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/anuncie"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Conheça os planos
            </Link>
            <Link 
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[var(--color-foreground)] font-semibold rounded-xl border border-[var(--color-border-strong)] hover:bg-gray-50 transition-colors"
            >
              Criar conta gratuita
            </Link>
          </div>
        </div>
      </div>
    </PublicSection>
  )
}
