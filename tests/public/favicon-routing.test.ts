import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isReservedSlug } from '@/modules/seo/constants'

describe('Velvet favicon App Router handling', () => {
  const faviconPath = resolve(process.cwd(), 'app/favicon.ico')
  const cityRoute = readFileSync(resolve(process.cwd(), 'app/[city]/page.tsx'), 'utf8')

  it('provides a valid ICO through the official app/favicon.ico convention', () => {
    expect(existsSync(faviconPath)).toBe(true)
    const favicon = readFileSync(faviconPath)
    expect(favicon.subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]))
    expect(favicon.length).toBeGreaterThan(100)
  })

  it('keeps favicon.ico reserved from the dynamic city route', () => {
    expect(isReservedSlug('favicon.ico')).toBe(true)
    expect(cityRoute).toContain('if (isReservedSlug(citySlug))')
  })
})
