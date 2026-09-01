import { stripLocalePrefix } from '@/lib/i18n/routing'

export type PublicNavigationItem = 'explore' | 'advertise' | 'account'

export function isPublicNavigationItemActive(
  pathname: string,
  item: PublicNavigationItem,
  isAuthenticated: boolean
): boolean {
  const logicalPath = stripLocalePrefix(pathname)

  if (item === 'explore') {
    return logicalPath === '/sao-paulo' || logicalPath.startsWith('/sao-paulo/') || logicalPath.startsWith('/perfil/')
  }

  if (item === 'advertise') {
    return logicalPath === '/anuncie' || logicalPath.startsWith('/anuncie/')
  }

  return isAuthenticated
    ? logicalPath === '/dashboard' || logicalPath.startsWith('/dashboard/')
    : logicalPath === '/login'
}
