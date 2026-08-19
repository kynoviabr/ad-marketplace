/**
 * Known search engine and social preview crawler user-agent tokens (lowercase).
 */
const CRAWLER_USER_AGENT_TOKENS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'baiduspider',
  'duckduckbot',
  'slurp',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'applebot',
  'linkedinbot',
  'pinterestbot',
]

/**
 * Detects whether an incoming HTTP request originates from a known search engine crawler or social bot.
 *
 * Invariants:
 * - Bot detection is used SOLELY to suppress SEARCH_PERFORMED analytics event generation.
 * - ZERO CLOAKING: Crawlers receive 100% identical HTML, search results, metadata, and status codes.
 * - Zero raw User-Agent storage, zero crawler IP persistence, zero visitor fingerprinting.
 */
export function isSearchCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    return false
  }

  const normalized = userAgent.toLowerCase()
  return CRAWLER_USER_AGENT_TOKENS.some((token) => normalized.includes(token))
}
