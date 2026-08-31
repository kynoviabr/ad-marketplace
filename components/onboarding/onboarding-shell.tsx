import Link from 'next/link'
import { logoutAction } from '@/modules/auth/actions'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'

export async function OnboardingShell({ children, currentStep = 1 }: { children: React.ReactNode; currentStep?: number }) {
  const { t } = await getTranslations()
  const steps = [t('onboarding.step.you'), t('onboarding.step.profile'), t('onboarding.step.locations'), t('onboarding.step.verification'), t('onboarding.step.photos'), t('onboarding.step.review')]
  return (
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <Link href="/" className="velvet-wordmark" aria-label={t('navigation.home')}>
          velvet<span>.</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="onboarding-exit">{t('common.logout')}</button>
        </form>
        <LanguageSelector compact />
      </header>

      <nav className="onboarding-progress" aria-label={t('onboarding.progress')}>
        <ol>
          {steps.map((step, index) => (
            <li
              key={step}
              className={index + 1 === currentStep ? 'is-current' : index + 1 < currentStep ? 'is-complete' : ''}
              aria-current={index + 1 === currentStep ? 'step' : undefined}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <b>{step}</b>
            </li>
          ))}
        </ol>
      </nav>

      {children}
    </div>
  )
}
