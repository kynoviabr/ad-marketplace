import Link from 'next/link'
import type { AnalyticsPeriodDays } from '@/modules/analytics/types'

interface AnalyticsPeriodSelectorProps {
  currentDays: AnalyticsPeriodDays
  locale: string
}

export function AnalyticsPeriodSelector({ currentDays, locale }: AnalyticsPeriodSelectorProps) {
  const isPt = locale === 'pt-BR'
  const periods: AnalyticsPeriodDays[] = [7, 30, 90]

  return (
    <nav className="analytics-period" aria-label={isPt ? 'Período das métricas' : 'Metrics period'}>
      <span>{isPt ? 'PERÍODO' : 'PERIOD'}</span>
      <div>
        {periods.map((range) => (
          <Link
            key={range}
            href={`/dashboard/analytics?days=${range}`}
            aria-current={currentDays === range ? 'page' : undefined}
          >
            {range} {isPt ? 'dias' : 'days'}
          </Link>
        ))}
      </div>
    </nav>
  )
}
