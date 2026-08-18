'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VerificationSafeDTO } from '@/modules/verification/types'
import { startVerificationAction, getVerificationStatusAction } from '@/modules/verification/actions'
import { Button } from '@/components/ui/button'

interface VerificationStatusCardProps {
  initialVerification: VerificationSafeDTO | null
}

export function VerificationStatusCard({ initialVerification }: VerificationStatusCardProps) {
  const router = useRouter()
  const [verification, setVerification] = useState<VerificationSafeDTO | null>(initialVerification)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const status = verification?.status || 'NOT_STARTED'

  const handleStartVerification = () => {
    setError(null)
    startTransition(async () => {
      const result = await startVerificationAction()
      if (result.success) {
        // Redirect to the provider's hosted verification URL
        window.location.href = result.data.verificationUrl
      } else {
        setError(result.error)
      }
    })
  }

  const handleRefreshStatus = () => {
    setError(null)
    startTransition(async () => {
      const result = await getVerificationStatusAction()
      if (result.success) {
        setVerification(result.data)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Verificação de Identidade e Idade (KYC)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Requisito obrigatório para anunciantes do AD-Marketplace
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            status === 'VERIFIED'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'REJECTED'
              ? 'bg-rose-100 text-rose-800'
              : status === 'IN_REVIEW'
              ? 'bg-amber-100 text-amber-800'
              : status === 'PENDING' || status === 'IN_PROGRESS'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status}
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* State: NOT_STARTED */}
      {status === 'NOT_STARTED' && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Para garantir a segurança do marketplace e cumprir com os termos de uso, todos os
            anunciantes devem comprovar documentalmente sua identidade e maioridade (18+ anos).
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">O que você precisará:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Documento oficial com foto (RG ou CNH)</li>
              <li>Câmera do celular ou computador para biometria facial</li>
              <li>Apenas 2 a 3 minutos para conclusão</li>
            </ul>
          </div>
          <Button
            onClick={handleStartVerification}
            disabled={isPending}
            className="w-full py-2.5"
          >
            {isPending ? 'Iniciando sessão...' : 'Iniciar Verificação'}
          </Button>
        </div>
      )}

      {/* State: PENDING or IN_PROGRESS */}
      {(status === 'PENDING' || status === 'IN_PROGRESS') && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Sua sessão de verificação foi iniciada. Conclua o processo no ambiente seguro do
            provedor para liberar as próximas etapas.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleStartVerification}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? 'Carregando...' : 'Continuar Verificação'}
            </Button>
            <Button
              onClick={handleRefreshStatus}
              disabled={isPending}
              variant="ghost"
            >
              Atualizar Status
            </Button>
          </div>
        </div>
      )}

      {/* State: IN_REVIEW */}
      {status === 'IN_REVIEW' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <p className="font-semibold mb-1">Verificação em Análise Manual</p>
            <p className="text-xs text-amber-700">
              Seus documentos foram enviados e estão sendo analisados. Você receberá a confirmação
              assim que a análise for concluída.
            </p>
          </div>
          <Button
            onClick={handleRefreshStatus}
            disabled={isPending}
            variant="ghost"
            className="w-full"
          >
            {isPending ? 'Verificando...' : 'Verificar Atualização'}
          </Button>
        </div>
      )}

      {/* State: VERIFIED */}
      {status === 'VERIFIED' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <span className="text-emerald-600">✓</span> Identidade & Maioridade Confirmadas
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Sua conta está aprovada e habilitada para criar o perfil profissional.
            </p>
            {verification?.verifiedAt && (
              <p className="text-xs text-emerald-600 mt-2">
                Verificado em: {new Date(verification.verifiedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full"
          >
            Ir para o Dashboard
          </Button>
        </div>
      )}

      {/* State: REJECTED */}
      {status === 'REJECTED' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm">
            <p className="font-semibold mb-1">Verificação Não Aprovada</p>
            <p className="text-xs text-rose-700">
              Não foi possível validar seus documentos ou os critérios de maioridade (18+ anos) não
              foram atendidos.
            </p>
          </div>
          <Button
            onClick={handleStartVerification}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Iniciando...' : 'Tentar Novamente'}
          </Button>
        </div>
      )}

      {/* State: EXPIRED */}
      {status === 'EXPIRED' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm">
            <p className="font-semibold mb-1">Sessão Expirada</p>
            <p className="text-xs text-slate-500">
              O tempo limite para conclusão da verificação expirou. Inicie uma nova sessão para
              continuar.
            </p>
          </div>
          <Button
            onClick={handleStartVerification}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Iniciando...' : 'Iniciar Nova Sessão'}
          </Button>
        </div>
      )}
    </div>
  )
}
