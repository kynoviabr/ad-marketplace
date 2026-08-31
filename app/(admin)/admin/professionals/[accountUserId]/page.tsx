import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/modules/moderation/guards'
import { getKycSupportContext } from '@/modules/verification/admin-monitor'
import { getTranslations } from '@/lib/i18n/server'
import { verificationStatusLabel } from '@/lib/i18n/labels'
import { formatDate } from '@/lib/i18n/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suporte ao cadastro — Painel Administrativo', robots: 'noindex, nofollow' }

function formatWaiting(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`
}

export default async function AdminProfessionalSupportPage({ params }: { params: Promise<{ accountUserId: string }> }) {
  await requireAdmin()
  const { locale, t } = await getTranslations()
  const { accountUserId } = await params
  const context = await getKycSupportContext(accountUserId)
  if (!context) notFound()

  return <div>
    <Link href="/admin/kyc" style={{ color: '#93c5fd', textDecoration: 'none' }}>← {t('admin.backKyc')}</Link>
    <header style={{ margin: '1.5rem 0' }}>
      <p style={{ color: '#f59e0b', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>{t('admin.support')}</p>
      <h1 style={{ color: '#fff', fontSize: '1.75rem', margin: '.35rem 0' }}>{context.professionalName}</h1>
      <p style={{ color: '#9ca3af' }}>{t('admin.supportDescription')}</p>
    </header>

    <section style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '.5rem', padding: '1.25rem', maxWidth: '760px' }} aria-labelledby="support-context-title">
      <h2 id="support-context-title" style={{ color: '#fff', fontSize: '1.1rem', marginTop: 0 }}>{t('admin.registrationVerification')}</h2>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.65rem 1.25rem', color: '#d1d5db', margin: 0 }}>
        <dt>{t('admin.profile')}</dt><dd style={{ margin: 0 }}>{context.profileStatus ?? t('admin.noProfile')}</dd>
        <dt>{t('admin.onboarding')}</dt><dd style={{ margin: 0 }}>{context.onboardingStatus} · {t('admin.step')} {context.onboardingStep}</dd>
        <dt>{t('admin.kycState')}</dt><dd style={{ margin: 0 }}>{verificationStatusLabel(locale, context.verificationStatus)}</dd>
        <dt>{t('admin.lastUpdate')}</dt><dd style={{ margin: 0 }}>{formatDate(context.lastUpdatedAt, locale, { dateStyle: 'short', timeStyle: 'short' })}</dd>
        <dt>{t('admin.waitingTime')}</dt><dd style={{ margin: 0 }}>{context.verificationStatus === 'VERIFIED' ? t('admin.completed') : formatWaiting(context.waitingMinutes)}</dd>
        <dt>WhatsApp</dt><dd style={{ margin: 0 }}>{context.whatsappPhone ?? t('admin.whatsappMissing')}</dd>
      </dl>

      {context.whatsappUrl ? <a href={context.whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', marginTop: '1.25rem', minHeight: '44px', alignItems: 'center', padding: '.6rem 1rem', borderRadius: '.375rem', background: '#15803d', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{t('admin.openWhatsapp')} ↗</a> : <p style={{ color: '#9ca3af', margin: '1.25rem 0 0' }}>{t('admin.whatsappMissing')}</p>}
    </section>

    <aside style={{ color: '#9ca3af', fontSize: '.8rem', marginTop: '1rem', maxWidth: '760px' }}>{t('admin.supportDisclaimer')}</aside>
  </div>
}
