import { redirect } from 'next/navigation'
import { getAccount } from '@/modules/auth/dal'
import { getTranslations } from '@/lib/i18n/server'
import { resolveCanAccessVipProfiles } from '@/modules/clients/dal'

export default async function ClientAreaPage() {
  const account = await getAccount()
  if (!account) redirect('/auth')

  const { locale, t } = await getTranslations()
  const isVip = await resolveCanAccessVipProfiles(account.id)
  const en = locale === 'en'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>{en ? 'Client Area' : 'Área do Cliente'}</h1>
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2>{en ? 'Membership Status' : 'Status da Assinatura'}</h2>
        <p>
          <strong>{en ? 'Current Plan:' : 'Plano Atual:'}</strong>{' '}
          {isVip ? 'VIP' : 'FREE'}
        </p>
        <p>
          <strong>{en ? 'Included Access:' : 'Acesso Incluído:'}</strong>{' '}
          {isVip
            ? (en ? 'Full access to VIP profiles and exclusive media.' : 'Acesso total a perfis VIP e mídia exclusiva.')
            : (en ? 'Standard public profiles only.' : 'Apenas perfis públicos padrão.')}
        </p>

        {!isVip && (
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
            <h3>{en ? 'Upgrade to VIP' : 'Seja VIP'}</h3>
            <p>{en ? 'Get full access to VIP-only professionals and exclusive content.' : 'Tenha acesso total a profissionais exclusivos e conteúdo reservado VIP.'}</p>
            <button disabled style={{ padding: '0.75rem 1.5rem', background: 'black', color: 'white', border: 'none', borderRadius: '4px', cursor: 'not-allowed', opacity: 0.5 }}>
              {en ? 'Coming Soon' : 'Em breve'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
