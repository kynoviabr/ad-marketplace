import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'

export async function HomeTrustSection() {
  const { t } = await getTranslations()
  return (
    <section id="sobre" className="velvet-home-trust">
      <p className="velvet-overline">{t('home.trustOverline')}</p>
      <span aria-hidden="true">V</span>
      <h2>{t('home.trustTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2>
      <div><strong>{t('home.identityVerified')}</strong><i>·</i><strong>{t('home.ageConfirmed')}</strong><i>·</i><strong>{t('home.directContact')}</strong></div>
      <p>{t('home.trustDescription')}</p>
      <Link href="/anuncie">{t('home.howVerificationWorks')} <span>→</span></Link>
    </section>
  )
}
