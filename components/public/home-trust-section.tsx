import React from 'react'
import { PublicSection } from './public-container'

export function HomeTrustSection() {
  return (
    <PublicSection background="muted" paddingY="lg">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            Nossa abordagem para segurança
          </h2>
          <p className="text-lg text-[var(--color-foreground-2)] max-w-2xl mx-auto">
            O marketplace atua exclusivamente na validação de identidade e maioridade. 
            O contato e a negociação ocorrem diretamente entre você e a profissional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="font-bold text-[var(--color-foreground)] mb-2">Identidade Confirmada</h3>
            <p className="text-[var(--color-foreground-muted)] text-sm leading-relaxed">
              Exigimos biometria facial e documento oficial para criar um perfil público. Nenhuma conta é ativada sem validação KYC.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3 className="font-bold text-[var(--color-foreground)] mb-2">Maioridade (18+)</h3>
            <p className="text-[var(--color-foreground-muted)] text-sm leading-relaxed">
              Garantimos estritamente que todos os perfis listados pertencem a adultos maiores de 18 anos, verificado em documento.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="font-bold text-[var(--color-foreground)] mb-2">Contato Direto</h3>
            <p className="text-[var(--color-foreground-muted)] text-sm leading-relaxed">
              O marketplace não atua como agência, não interfere nas comunicações e não retém pagamentos pelos serviços.
            </p>
          </div>
        </div>

      </div>
    </PublicSection>
  )
}
