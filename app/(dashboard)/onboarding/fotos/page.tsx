import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { MediaGalleryManager } from '@/components/media/media-gallery-manager'
import { requireVerifiedAdvertiser } from '@/modules/verification/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getManageableProfileMedia, reconcileStaleUploadingMedia } from '@/modules/media/dal'
import { getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fotos — Onboarding velvet.', robots: 'noindex, nofollow' }

export default async function PhotosOnboardingPage() {
  const { locale, t } = await getTranslations()
  const { account } = await requireVerifiedAdvertiser()
  const profile = await getProfileByAccountUserId(account.id)
  if (!profile) redirect('/onboarding/voce')
  await reconcileStaleUploadingMedia(profile.id)
  const media = await getManageableProfileMedia(profile.id)
  const isPt = locale === 'pt-BR'
  const helpHref = isPt
    ? '/ajuda/fotos-e-videos-envio-aprovacao-e-limites'
    : '/en/ajuda/fotos-e-videos-envio-aprovacao-e-limites'

  return <OnboardingShell currentStep={5}><main className="onboarding-main onboarding-main--photos">
    <section className="onboarding-intro">
      <p className="onboarding-eyebrow">{t('onboarding.photosEyebrow')}</p>
      <h1>{t('onboarding.photosTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
      <p>
        {t('onboarding.photosDescription')}{' '}
        <Link href={helpHref} className="onboarding-inline-help-link">
          {isPt ? 'Precisa de ajuda? Saiba mais →' : 'Need help? Learn more →'}
        </Link>
      </p>
    </section>
    <MediaGalleryManager initialMedia={media} showOnboardingNavigation />
  </main></OnboardingShell>
}
