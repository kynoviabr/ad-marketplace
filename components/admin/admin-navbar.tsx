'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSelector, useI18n } from '@/components/i18n'

export function AdminNavbar() {
  const { t } = useI18n()
  const pathname = usePathname()

  const navItems = [
    { href: '/admin/moderation', label: t('admin.photoModeration') },
    { href: '/admin/profiles', label: t('admin.profileModeration') },
    { href: '/admin/kyc', label: t('admin.kyc') },
    { href: '/admin/reports', label: t('admin.reports') },
    { href: '/admin/billing', label: t('admin.subscriptions') },
    { href: '/admin/boosts', label: t('admin.boosts') },
    { href: '/admin/analytics', label: t('admin.analytics') },
  ]

  return (
    <header style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151', padding: '0.75rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/admin/moderation" style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.125rem', textDecoration: 'none' }}>
            {t('admin.panel')}
          </Link>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: isActive ? '#ffffff' : '#9ca3af',
                    backgroundColor: isActive ? '#374151' : 'transparent',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#ef4444', color: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
            ADMIN
          </span>
          <LanguageSelector compact />
          <Link href="/dashboard" style={{ color: '#9ca3af', fontSize: '0.875rem', textDecoration: 'none' }}>
            {t('admin.goDashboard')}
          </Link>
        </div>
      </div>
    </header>
  )
}
