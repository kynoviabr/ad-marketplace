'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VerificationSafeDTO, VerificationStatus } from '@/modules/verification/types'
import { continueAfterVerificationAction, getVerificationStatusAction, startVerificationAction } from '@/modules/verification/actions'

interface VerificationStatusCardProps {
  initialVerification: VerificationSafeDTO | null
  initialVerifiedAdult: boolean
}

const statusLabels: Record<VerificationStatus, string> = {
  NOT_STARTED: 'Não iniciada', PENDING: 'Aguardando conclusão', IN_PROGRESS: 'Em andamento',
  IN_REVIEW: 'Em análise', VERIFIED: 'Confirmada', REJECTED: 'Não concluída', EXPIRED: 'Expirada',
}

function isVerifiedAdult(verification: VerificationSafeDTO | null): boolean {
  if (!verification || verification.status !== 'VERIFIED') return false
  if (!verification.identityVerified || !verification.ageVerified) return false
  return !verification.expiresAt || new Date(verification.expiresAt).getTime() > Date.now()
}

export function VerificationStatusCard({ initialVerification, initialVerifiedAdult }: VerificationStatusCardProps) {
  const router = useRouter()
  const [verification, setVerification] = useState<VerificationSafeDTO | null>(initialVerification)
  const [verifiedAdult, setVerifiedAdult] = useState(initialVerifiedAdult)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const status = verification?.status ?? 'NOT_STARTED'

  const startVerification = () => {
    setError(null)
    startTransition(async () => {
      const result = await startVerificationAction()
      if (result.success) window.location.assign(result.data.verificationUrl)
      else setError(result.error)
    })
  }

  const refreshStatus = () => {
    setError(null)
    startTransition(async () => {
      const result = await getVerificationStatusAction()
      if (!result.success) return setError(result.error)
      setVerification(result.data)
      setVerifiedAdult(isVerifiedAdult(result.data))
      router.refresh()
    })
  }

  const continueToPhotos = () => {
    setError(null)
    startTransition(async () => {
      const result = await continueAfterVerificationAction()
      if (!result.success) setError(result.error)
    })
  }

  return (
    <section className="verification-panel" aria-labelledby="verification-panel-title">
      <div className="verification-mark" aria-hidden="true">V</div>
      <div className="verification-status-line" role="status" aria-live="polite">
        <span>Estado da verificação</span><b>{statusLabels[status]}</b>
      </div>
      {error && <p className="verification-error" role="alert">{error}</p>}

      {status === 'NOT_STARTED' && (
        <div className="verification-state">
          <h2 id="verification-panel-title">Confirme sua identidade</h2>
          <p>Você será direcionada ao ambiente seguro do parceiro de verificação.</p>
          <ol className="verification-steps">
            <li><span>01</span>Você inicia a verificação.</li>
            <li><span>02</span>Identidade e maioridade são analisadas.</li>
            <li><span>03</span>Você retorna à Velvet para continuar.</li>
          </ol>
          <button type="button" className="onboarding-primary" onClick={startVerification} disabled={isPending}>
            {isPending ? 'Preparando ambiente seguro…' : 'Verificar minha identidade'}<span aria-hidden="true">↗</span>
          </button>
          <p className="verification-external-note">Abre o ambiente externo do parceiro de verificação.</p>
        </div>
      )}

      {['PENDING', 'IN_PROGRESS', 'IN_REVIEW'].includes(status) && (
        <div className="verification-state">
          <h2 id="verification-panel-title">Verificação em andamento</h2>
          <p>{status === 'IN_REVIEW' ? 'Seus dados estão em análise. O resultado pode levar algum tempo.' : 'Conclua o processo no ambiente de verificação. O resultado oficial chegará à Velvet com segurança.'}</p>
          <button type="button" className="onboarding-primary" onClick={refreshStatus} disabled={isPending}>
            {isPending ? 'Consultando…' : 'Atualizar status'}<span aria-hidden="true">↻</span>
          </button>
        </div>
      )}

      {status === 'VERIFIED' && verifiedAdult && (
        <div className="verification-state verification-state--verified">
          <h2 id="verification-panel-title">Identidade confirmada</h2>
          <ul className="verification-confirmations">
            <li><span aria-hidden="true">✓</span> Identidade confirmada</li>
            <li><span aria-hidden="true">✓</span> Maioridade confirmada</li>
          </ul>
          <button type="button" className="onboarding-primary" onClick={continueToPhotos} disabled={isPending}>
            {isPending ? 'Continuando…' : 'Continuar'}<span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {((status === 'VERIFIED' && !verifiedAdult) || status === 'REJECTED' || status === 'EXPIRED') && (
        <div className="verification-state">
          <h2 id="verification-panel-title">{status === 'EXPIRED' ? 'Verificação expirada' : 'Não foi possível concluir'}</h2>
          <p>{status === 'EXPIRED' ? 'A sessão ou validade da verificação terminou. Inicie uma nova tentativa.' : 'A confirmação necessária não foi concluída. Você pode iniciar uma nova tentativa.'}</p>
          <button type="button" className="onboarding-primary" onClick={startVerification} disabled={isPending}>
            {isPending ? 'Preparando…' : 'Tentar novamente'}<span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
    </section>
  )
}
