import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const page = readFileSync(join(root, 'app/(dashboard)/dashboard/analytics/page.tsx'), 'utf8')
const dal = readFileSync(join(root, 'modules/analytics/dal.ts'), 'utf8')
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')

describe('Velvet dashboard analytics visual harmonization R2', () => {
  it('reuses the authenticated professional dashboard shell with Analytics active', () => {
    expect(page).toContain('requireAccount()')
    expect(page).toContain('<ProfessionalDashboardHeader activeHref="/dashboard/analytics" />')
    expect(page).toContain('className="velvet-dashboard velvet-analytics"')
  })

  it('keeps only the canonical 7, 30 and 90 day ranges', () => {
    expect(page).toContain('const ranges = [7, 30, 90] as const')
    expect(page).toContain('resolvedParams.days')
    expect(page).toContain('getAdvertiserMetrics(profile.id, days)')
  })

  it('exposes existing aggregated profile views without reading raw visitor data', () => {
    const advertiserQuery = dal.slice(dal.indexOf('export async function getAdvertiserMetrics'), dal.indexOf('/**\n * Retrieves platform-wide'))
    expect(dal).toContain('profileViews += r.views_total || 0')
    expect(advertiserQuery).toContain(".from('profile_daily_metrics')")
    expect(advertiserQuery).not.toContain(".from('analytics_events')")
    expect(page).toContain('Visualizações do perfil')
  })

  it('preserves the canonical contact CTR definition', () => {
    expect(dal).toContain('(whatsappClicks / impressionsTotal) * 100')
    expect(page).toContain('cliques no WhatsApp ÷ impressões')
    expect(page).toContain('CTR de contato')
  })

  it('provides deliberate zero-data and neutral low-data states', () => {
    expect(page).toContain('Seus primeiros dados aparecerão aqui.')
    expect(page).toContain('Os dados ainda são iniciais.')
    expect(page).toContain('metrics.dailyBreakdown.length >= 2')
    expect(page).not.toContain('aumentou')
  })

  it('uses canonical publication eligibility for the public profile link', () => {
    expect(page).toContain('isProfileCanonicallyEligible(account.id, profile.id)')
    expect(page).toContain('Ver meu perfil')
    expect(page).toContain("profile.status === 'ACTIVE' && canonicallyEligible")
  })

  it('renders an accessible restrained chart with a textual table alternative', () => {
    expect(page).toContain('role="img"')
    expect(page).toContain('<desc id="trend-svg-description">')
    expect(page).toContain('Ver dados diários em tabela')
    expect(page).toContain('<caption className="sr-only">')
    expect(css).toContain('.analytics-chart-line')
    expect(css).toContain('var(--velvet-aubergine)')
  })

  it('keeps period controls touch friendly and metrics responsive', () => {
    expect(css).toContain('.analytics-period a')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('@media (max-width: 600px)')
    expect(css).toContain('.analytics-kpis dl { grid-template-columns: repeat(2, 1fr); }')
  })
})
