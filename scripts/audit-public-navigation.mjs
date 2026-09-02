#!/usr/bin/env node

const base = new URL(process.argv[2] || 'http://localhost:3000')
const sources = [
  '/', '/sao-paulo', '/sobre', '/como-funciona', '/seguranca', '/termos', '/privacidade', '/cookies', '/login',
  '/en', '/en/sao-paulo', '/en/about', '/en/how-it-works', '/en/safety', '/en/terms', '/en/privacy', '/en/cookies', '/en/login',
]

const cleanLabel = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
const rows = []
const responseCache = new Map()

async function inspect(target) {
  const key = target.href
  if (!responseCache.has(key)) responseCache.set(key, fetch(target, { redirect: 'follow' }))
  return responseCache.get(key)
}

for (const source of sources) {
  let html = ''
  try {
    const response = await fetch(new URL(source, base), { redirect: 'follow' })
    html = await response.text()
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    for (const match of html.matchAll(anchorPattern)) {
      const href = match[1]
      const target = new URL(href, new URL(source, base))
      if (target.origin !== base.origin || !['http:', 'https:'].includes(target.protocol)) continue
      const result = await inspect(target)
      rows.push({
        label: cleanLabel(match[2]) || '(accessible image/link)',
        source,
        locale: source === '/en' || source.startsWith('/en/') ? 'en' : 'pt-BR',
        href: `${target.pathname}${target.search}${target.hash}`,
        httpStatus: result.status,
        finalUrl: result.url,
        result: result.status >= 200 && result.status < 400 ? 'PASS' : 'FAIL',
      })
    }
  } catch (error) {
    rows.push({ label: '(source request)', source, locale: source.startsWith('/en') ? 'en' : 'pt-BR', href: source, httpStatus: 0, finalUrl: '', result: `FAIL: ${error instanceof Error ? error.message : 'request error'}` })
  }
}

const uniqueRows = [...new Map(rows.map((row) => [`${row.source}|${row.href}|${row.label}`, row])).values()]
console.log(JSON.stringify({ base: base.origin, checkedAt: new Date().toISOString(), totals: { links: uniqueRows.length, passed: uniqueRows.filter((row) => row.result === 'PASS').length, failed: uniqueRows.filter((row) => row.result !== 'PASS').length }, rows: uniqueRows }, null, 2))
process.exitCode = uniqueRows.some((row) => row.result !== 'PASS') ? 1 : 0
