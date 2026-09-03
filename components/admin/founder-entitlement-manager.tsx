'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { grantFounderBenefitAction, revokeFounderBenefitAction } from '@/modules/billing/actions'
import type { AdminFounderEntitlementSummary } from '@/modules/billing/types'
import { useI18n } from '@/components/i18n'
import { formatDate as formatLocalizedDate } from '@/lib/i18n/format'

export function FounderEntitlementManager({ items }: { items: AdminFounderEntitlementSummary[] }) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pendingProfile, setPendingProfile] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const formatDate = (value: string | null) => value ? formatLocalizedDate(value, locale) : t('admin.noDate')

  async function grant(profileId: string) {
    if (pendingProfile) return
    setPendingProfile(profileId)
    setFeedback((current) => ({ ...current, [profileId]: '' }))
    const result = await grantFounderBenefitAction({ profileId })
    setPendingProfile(null)
    if (!result.success) {
      setFeedback((current) => ({ ...current, [profileId]: result.error }))
      return
    }
    setFeedback((current) => ({ ...current, [profileId]: t('admin.grantSuccess') }))
    router.refresh()
  }

  async function revoke(profileId: string) {
    if (pendingProfile) return
    setPendingProfile(profileId)
    const result = await revokeFounderBenefitAction({ profileId })
    setPendingProfile(null)
    setFeedback((current) => ({ ...current, [profileId]: result.success ? t('admin.revokeSuccess') : result.error }))
    if (result.success) router.refresh()
  }

  return <section style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2.5rem' }} aria-labelledby="founder-title">
    <h2 id="founder-title" style={{ color: '#fff', fontSize: '1.125rem', margin: 0 }}>{t('admin.founderAccess')}</h2>
    <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{t('admin.founderDescription')}</p>
    {items.length === 0 ? <p style={{ color: '#9ca3af' }}>{t('admin.noProfessionals')}</p> : <div style={{ display: 'grid', gap: '1rem' }}>
      {items.map((item) => <article key={item.profileId} style={{ padding: '1rem', border: '1px solid #374151', borderRadius: '0.5rem', background: '#111827' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 .5rem' }}>{item.stageName}</h3>
            <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.35rem 1rem', color: '#d1d5db', fontSize: '.875rem', margin: 0 }}>
              <dt>{t('admin.publication')}</dt><dd style={{ margin: 0 }}>{item.publicationActive ? t('admin.active') : t('admin.inactive')}</dd>
              <dt>{t('admin.plan')}</dt><dd style={{ margin: 0 }}>{item.planCode ?? t('admin.none')}</dd>
              <dt>{t('admin.price')}</dt><dd style={{ margin: 0 }}>{item.priceCode ?? t('admin.none')}</dd>
              <dt>{t('admin.status')}</dt><dd style={{ margin: 0 }}>{item.subscriptionStatus ?? t('admin.none')}</dd>
              <dt>{t('admin.start')}</dt><dd style={{ margin: 0 }}>{formatDate(item.currentPeriodStart)}</dd>
              <dt>{t('admin.validUntil')}</dt><dd style={{ margin: 0 }}>{formatDate(item.currentPeriodEnd)}</dd>
              <dt>{t('admin.founderPeriod')}</dt><dd style={{ margin: 0 }}>{item.founderFreePeriod === 'ACTIVE' ? t('admin.active') : item.founderFreePeriod === 'EXPIRED' ? t('admin.expired') : t('admin.notGranted')}</dd>
            </dl>
          </div>
          {item.founderFreePeriod === 'NOT_GRANTED' && !item.subscriptionStatus ? <button type="button" onClick={() => grant(item.profileId)} disabled={pendingProfile !== null} style={{ alignSelf: 'flex-start', minHeight: '44px', padding: '.65rem 1rem', borderRadius: '.375rem', border: 0, background: '#a16207', color: '#fff', fontWeight: 700, cursor: pendingProfile ? 'not-allowed' : 'pointer', opacity: pendingProfile ? .65 : 1 }}>
            {pendingProfile === item.profileId ? t('admin.granting') : t('admin.grantThreeMonths')}
          </button> : item.founderFreePeriod === 'ACTIVE' ? <button type="button" onClick={() => revoke(item.profileId)} disabled={pendingProfile !== null} style={{ alignSelf: 'flex-start', minHeight: '44px', padding: '.65rem 1rem', border: '1px solid #b91c1c', background: 'transparent', color: '#fca5a5', fontWeight: 700 }}>{t('admin.revokeFounder')}</button> : null}
        </div>
        {feedback[item.profileId] ? <p role="status" style={{ color: feedback[item.profileId] === t('admin.grantSuccess') ? '#86efac' : '#fca5a5', marginBottom: 0 }}>{feedback[item.profileId]}</p> : null}
      </article>)}
    </div>}
  </section>
}
