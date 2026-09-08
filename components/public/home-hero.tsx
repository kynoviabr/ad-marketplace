import type { ProfileWithMedia } from './public-profile-grid'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { HeroPortraitMural } from './hero-portrait-mural'

export async function HomeHero({ profiles }: { profiles?: ProfileWithMedia[] }) {
  const { locale, t } = await getTranslations()
  const explore = localizePathname('/sao-paulo', locale)

  return (
    <section className="velvet-home-hero" aria-label={t('home.heroOverline')}>
      <div className="velvet-home-hero-copy">
        <p className="velvet-overline">{t('home.heroOverline')}</p>
        <h1>{t('home.heroTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h1>
        <p>{t('home.heroDescription')}</p>
        <form className="velvet-home-search" action={explore}>
          <span aria-hidden="true">⌕</span>
          <label><small>{t('home.location')}</small><input name="local" placeholder={t('home.locationPlaceholder')} /></label>
          <button type="submit">{t('home.search')}</button>
        </form>
      </div>

      <HeroPortraitMural />
    </section>
  )
}
