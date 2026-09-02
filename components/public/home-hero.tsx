import Image from 'next/image'
import Link from 'next/link'
import type { ProfileWithMedia } from './public-profile-grid'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'

export async function HomeHero({ profiles }: { profiles: ProfileWithMedia[] }) {
  const { locale, t } = await getTranslations()
  const explore = localizePathname('/sao-paulo', locale)
  const [primary, secondary] = profiles.filter((profile) => profile.mediaUrl)
  return (
    <section className="velvet-home-hero">
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
      {primary ? <div className={`velvet-home-hero-art${secondary ? '' : ' is-single'}`} aria-label={t('home.editorialSelection')}>
        <figure className="velvet-home-hero-main"><Image src={primary.mediaUrl!} alt={t('home.editorialPortrait', { name: primary.stageName })} fill priority sizes="(max-width: 700px) 72vw, 34vw" /><figcaption><span>{primary.stageName}{primary.publicAge ? `, ${primary.publicAge}` : ''}</span><small>{primary.primaryLocation?.name ?? 'São Paulo'} · São Paulo</small></figcaption></figure>
        {secondary ? <figure className="velvet-home-hero-offset"><Image src={secondary.mediaUrl!} alt={t('home.editorialPortrait', { name: secondary.stageName })} fill sizes="(max-width: 700px) 38vw, 17vw" /><figcaption><span>{secondary.stageName}{secondary.publicAge ? `, ${secondary.publicAge}` : ''}</span><small>{secondary.primaryLocation?.name ?? 'São Paulo'} · São Paulo</small></figcaption></figure> : null}
        <span className="velvet-home-hero-index">V / 01</span>
      </div> : <Link className="velvet-home-hero-placeholder" href={explore}><span>V</span><small>{t('home.exploreSaoPaulo')}</small></Link>}
    </section>
  )
}
