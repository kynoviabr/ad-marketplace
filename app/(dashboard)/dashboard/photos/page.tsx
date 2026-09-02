import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { MediaGalleryManager } from '@/components/media/media-gallery-manager'
import { getManageableProfileMedia, reconcileStaleUploadingMedia } from '@/modules/media/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getPublicationReviewState } from '@/modules/publication/dal'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { VideoManager } from '@/components/media/video-manager'
import { getManageableProfileVideos } from '@/modules/videos/dal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fotos | Velvet', robots: 'noindex, nofollow' }

export default async function DashboardPhotosPage() {
  const { account } = await requireVerifiedAdvertiser()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) redirect('/onboarding/seu-perfil')

  await reconcileStaleUploadingMedia(profile.id)
  const [media, videos, publication] = await Promise.all([
    getManageableProfileMedia(profile.id),
    getManageableProfileVideos(profile.id),
    getPublicationReviewState(account),
  ])

  return <div className="velvet-dashboard velvet-photo-studio">
    <ProfessionalDashboardHeader activeHref="/dashboard/photos" />
    <main>
      <header className="photo-studio-intro">
        <div><p className="dashboard-eyebrow">FOTOS</p><h1>Construa sua<br />galeria.</h1></div>
        <div><p>Escolha as imagens que melhor representam seu perfil.</p>{publication.isPublic && publication.slug ? <Link href={`/perfil/${publication.slug}`}>Ver meu perfil <span aria-hidden="true">↗</span></Link> : <Link href="/dashboard">Voltar à visão geral <span aria-hidden="true">→</span></Link>}</div>
      </header>
      <MediaGalleryManager initialMedia={media} mode="dashboard" />
      <VideoManager initialVideos={videos} />
    </main>
  </div>
}
