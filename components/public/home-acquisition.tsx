import React from 'react'
import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'

export async function HomeAcquisition() {
  const { t } = await getTranslations()
  return (
    <section className="velvet-home-acquisition">
      <div><p className="velvet-overline">{t('home.forProfessionals')}</p><h2>{t('home.professionalTitle').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2></div>
      <div><p>{t('home.professionalDescription')}</p><Link href="/anuncie">{t('home.createProfile')} <span>→</span></Link></div>
      <span className="velvet-home-acquisition-mark" aria-hidden="true">V</span>
    </section>
  )
}
