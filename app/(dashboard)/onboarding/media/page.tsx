import { redirect } from 'next/navigation'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfileMedia } from '@/modules/media/dal'
import { MediaGalleryManager } from '@/components/media/media-gallery-manager'
import Link from 'next/link'

export const metadata = {
  title: 'Fotos do Perfil | Onboarding',
}

export default async function OnboardingMediaPage() {
  const { account } = await requireVerifiedAdvertiser()

  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) {
    redirect('/onboarding/profile')
  }

  const media = await getProfileMedia(profile.id)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Onboarding Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Passo 5 de 5 — Galeria de Fotos
          </span>
          <Link
            href="/dashboard"
            className="text-xs text-gray-500 hover:text-gray-900 font-medium"
          >
            Ir para o Dashboard →
          </Link>
        </div>
        <h1 className="text-2xl font-black text-gray-900">Fotos do Seu Perfil</h1>
        <p className="text-sm text-gray-600">
          Envie fotos profissionais para o seu anúncio. A primeira foto adicionada será definida
          automaticamente como principal (você pode alterar a qualquer momento).
        </p>
      </div>

      {/* Main Gallery */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MediaGalleryManager initialMedia={media} />
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4">
        <Link
          href="/onboarding/profile"
          className="text-xs font-bold text-gray-600 hover:underline"
        >
          ← Voltar para Edição do Perfil
        </Link>
        <Link
          href="/dashboard"
          className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          Concluir e Ir para o Dashboard →
        </Link>
      </div>
    </div>
  )
}
