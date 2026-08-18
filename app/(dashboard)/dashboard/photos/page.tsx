import { redirect } from 'next/navigation'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfileMedia } from '@/modules/media/dal'
import { MediaGalleryManager } from '@/components/media/media-gallery-manager'
import Link from 'next/link'

export const metadata = {
  title: 'Gerenciar Fotos | Dashboard',
}

export default async function DashboardPhotosPage() {
  const { account } = await requireVerifiedAdvertiser()

  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) {
    redirect('/onboarding/profile')
  }

  const media = await getProfileMedia(profile.id)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gerenciador de Fotos</h1>
          <p className="text-sm text-gray-600">
            Adicione, reordene ou altere a foto principal do seu anúncio.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-gray-600 hover:text-gray-900 font-semibold"
        >
          ← Voltar ao Painel
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MediaGalleryManager initialMedia={media} />
      </div>
    </div>
  )
}
