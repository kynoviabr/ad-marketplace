import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAccount } from '@/modules/auth/dal'
import { getTranslations } from '@/lib/i18n/server'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Área do cliente — Velvet', robots: 'noindex, nofollow' }

export default async function ClientAreaPage() {
  const [account, { t }] = await Promise.all([getAccount(), getTranslations()])
  if (!account) redirect('/login')
  if (account.role !== 'CLIENT') redirect('/dashboard')

  const { canAccessVipProfiles } = await resolveClientVipEntitlement(account.id)
  const isVip = canAccessVipProfiles

  return (
    <div className="velvet-dashboard">
      <main>
        <section className="velvet-dashboard-intro">
          <p className="dashboard-eyebrow">{t('client.areaTitle')}</p>
          <h1>{t('client.membershipStatus')}</h1>
        </section>

        <section className="dashboard-status dashboard-status--neutral" aria-labelledby="membership-title">
          <div>
            <p className="dashboard-eyebrow">{t('client.currentPlan')}</p>
            <h2 id="membership-title">{isVip ? 'VIP' : 'FREE'}</h2>
          </div>
          <p>
            <strong>{t('client.includedAccess')}</strong>{' '}
            {isVip ? t('client.vipAccessDescription') : t('client.freeAccessDescription')}
          </p>
          <Link href="/">{t('dashboard.myProfile')} →</Link>
        </section>

        {!isVip && (
          <section className="dashboard-attention" aria-labelledby="upgrade-title">
            <p className="dashboard-eyebrow">VIP</p>
            <h2 id="upgrade-title">{t('client.upgradeTitle')}</h2>
            <p>{t('client.upgradeDescription')}</p>
            <button
              disabled
              aria-disabled="true"
              className="dashboard-primary-action"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              {t('client.comingSoon')}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
