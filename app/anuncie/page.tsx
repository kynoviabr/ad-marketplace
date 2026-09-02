import { redirect } from 'next/navigation'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'

export default async function AdvertiseEntryPage() {
  const locale = await getRequestLocale()
  redirect(localizePathname('/signup', locale))
}
