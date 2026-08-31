import Link from 'next/link'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'

export async function PublicFooter() {
  const { t } = await getTranslations()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="velvet-public-footer">
      <Link href="/" className="velvet-public-wordmark">velvet<span>.</span></Link>
      <p>{t('footer.description')}</p>
      <nav aria-label={t('footer.label')}><Link href="/#sobre">{t('footer.about')}</Link><Link href="/seguranca">{t('footer.security')}</Link><Link href="/termos">{t('footer.terms')}</Link><Link href="/privacidade">{t('footer.privacy')}</Link></nav>
      <LanguageSelector />
      <small>{t('footer.adultsOnly', { year: currentYear })}</small>
    </footer>
  )
}
