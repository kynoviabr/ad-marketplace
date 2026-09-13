import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAccount } from '@/modules/auth/dal'
import { getAccountDataSummary, getAccountDataSubjectRequests } from '@/modules/privacy/dal'
import { PrivacyCenterConsole } from '@/components/privacy/privacy-center-console'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Privacidade e Dados | Velvet',
  description: 'Gerencie seus dados pessoais, exerça seus direitos sob a LGPD e visualize seu histórico na Velvet.',
  robots: { index: false, follow: false },
}

export default async function PrivacyCenterPage() {
  const account = await requireAccount()
  if (!account || !account.id) {
    redirect('/login')
  }

  const [summary, requests] = await Promise.all([
    getAccountDataSummary(account.id),
    getAccountDataSubjectRequests(account.id),
  ])

  if (!summary) {
    redirect('/login')
  }

  return <PrivacyCenterConsole initialSummary={summary} initialRequests={requests} />
}
