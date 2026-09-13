import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdvertiserPrivacyPage() {
  redirect('/privacidade-dados')
}

