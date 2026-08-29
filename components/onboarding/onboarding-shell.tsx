import Link from 'next/link'
import { logoutAction } from '@/modules/auth/actions'

const steps = ['Você', 'Seu perfil', 'Onde atende', 'Verificação', 'Fotos', 'Revisar']

export function OnboardingShell({ children, currentStep = 1 }: { children: React.ReactNode; currentStep?: number }) {
  return (
    <div className="onboarding-shell">
      <header className="onboarding-header">
        <Link href="/" className="velvet-wordmark" aria-label="Velvet, início">
          velvet<span>.</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="onboarding-exit">Sair</button>
        </form>
      </header>

      <nav className="onboarding-progress" aria-label="Progresso do cadastro">
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
