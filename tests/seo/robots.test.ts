import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import robots from '@/app/robots'

describe('FASE 10 — Dynamic robots.txt Architecture', () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://admarketplace.com.br'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('generates production robots rules allowing public pages and disallowing private routes', () => {
    const robotsConfig = robots()

    expect(robotsConfig.rules).toBeDefined()
    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules

    expect(rules.userAgent).toBe('*')
    expect(rules.allow).toBe('/')
    expect(rules.disallow).toEqual([
      '/admin/',
      '/dashboard/',
      '/onboarding/',
      '/api/',
      '/auth/',
      '/complete-signup',
      '/suspended',
    ])
    expect(robotsConfig.sitemap).toBe('https://admarketplace.com.br/sitemap.xml')
  })

  it('emits global crawl block (Disallow: /) in development and staging environments', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'development'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    const devRobots = robots()
    const rules = Array.isArray(devRobots.rules) ? devRobots.rules[0] : devRobots.rules

    expect(rules.userAgent).toBe('*')
    expect(rules.disallow).toBe('/')
    expect(devRobots.sitemap).toBeUndefined()
  })

  it('emits global crawl block on preview/staging domains even if app env is production', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview-deploy.vercel.app'

    const stagingRobots = robots()
    const rules = Array.isArray(stagingRobots.rules) ? stagingRobots.rules[0] : stagingRobots.rules

    expect(rules.disallow).toBe('/')
  })
})
