import { redirect } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { MediaGalleryManager } from '@/components/media/media-gallery-manager'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getManageableProfileMedia, reconcileStaleUploadingMedia } from '@/modules/media/dal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fotos — Onboarding Velvet', robots: 'noindex, nofollow' }

export default async function PhotosOnboardingPage() {
  const { account } = await requireVerifiedAdvertiser()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) redirect('/onboarding/voce')
  await reconcileStaleUploadingMedia(profile.id)
  const media = await getManageableProfileMedia(profile.id)
  return <OnboardingShell currentStep={5}><main className="onboarding-main onboarding-main--photos">
    <section className="onboarding-intro"><p className="onboarding-eyebrow">05 — FOTOS</p><h1>Mostre seu<br />melhor lado.</h1><p>Adicione as fotos que vão compor seu perfil na Velvet.</p></section>
    <MediaGalleryManager initialMedia={media} showOnboardingNavigation />
  </main></OnboardingShell>
}
