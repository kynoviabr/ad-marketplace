/**
 * proxy.ts — Next.js 16 route proxy (formerly middleware.ts)
 *
 * IMPORTANT: In Next.js 16, middleware.ts was deprecated and renamed to proxy.ts.
 * The exported function name also changed from `middleware` to `proxy`.
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * Responsibilities:
 * 1. Refresh Supabase session cookies on every request (required by @supabase/ssr)
 * 2. Protect authenticated routes — redirect unauthenticated users to /login
 * 3. Redirect authenticated users away from auth pages to /dashboard
 *
 * SECURITY NOTES:
 * - Session verification here is for redirect UX only, NOT the security boundary.
 *   The actual security boundary is in Server Components / Server Actions via requireAuth().
 * - This proxy cannot use the admin/service-role client — only anon key for session refresh.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, resolveLocale } from '@/lib/i18n/config'
import { isLocaleRoutingExcluded, localeFromPathname, localizePathname, stripLocalePrefix } from '@/lib/i18n/routing'
import { CANONICAL_REQUEST_ID_HEADER, resolveCanonicalRequestId } from '@/modules/observability/request-id'

/** Routes that require authentication */
const PROTECTED_ROUTES = ['/dashboard', '/suspended', '/onboarding']

/** Routes only accessible to unauthenticated users */
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const requestedPathname = url.pathname
  const pathLocale = localeFromPathname(requestedPathname)
  const isAdminRoute = requestedPathname.startsWith('/admin')
  const locale = pathLocale ?? (requestedPathname === '/' || isAdminRoute
    ? resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value)
    : DEFAULT_LOCALE)
  const pathname = stripLocalePrefix(requestedPathname)
  const requestId = resolveCanonicalRequestId(request.headers.get(CANONICAL_REQUEST_ID_HEADER))
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LOCALE_HEADER, locale)
  requestHeaders.set(CANONICAL_REQUEST_ID_HEADER, requestId)

  // API endpoints bypass session refresh/locale redirection, but propagate x-request-id
  if (pathname.startsWith('/api/')) {
    const apiResponse = NextResponse.next({ request: { headers: requestHeaders } })
    apiResponse.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return apiResponse
  }

  // Internal endpoints keep one canonical path and are never duplicated under
  // a locale prefix. This also prevents prefixed API POST aliases.
  if (pathLocale && isLocaleRoutingExcluded(pathname)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const res = NextResponse.json({ error: 'Not found' }, { status: 404 })
      res.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
      return res
    }
    url.pathname = pathname
    const res = NextResponse.redirect(url)
    if (pathLocale === 'en') {
      res.cookies.set(LOCALE_COOKIE, 'en', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
      })
    }
    res.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return res
  }

  const createResponse = () => {
    let nextResponse: NextResponse
    if (pathLocale) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = pathname
      nextResponse = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
    } else {
      nextResponse = NextResponse.next({ request: { headers: requestHeaders } })
    }
    if (pathLocale === 'en') {
      nextResponse.cookies.set(LOCALE_COOKIE, 'en', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
      })
    }
    nextResponse.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return nextResponse
  }

  let response = createResponse()

  if (pathLocale === 'en') {
    request.cookies.set(LOCALE_COOKIE, 'en')
  }

  // Create a Supabase client that can read/write cookies via the request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = createResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          )
        },
      },
    }
  )

  // IMPORTANT: Always call getUser() to refresh the session token.
  // This must be called before any redirect logic.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    url.pathname = localizePathname('/login', locale)
    url.search = ''
    const redirectRes = NextResponse.redirect(url)
    redirectRes.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return redirectRes
  }

  // Redirect authenticated users away from auth-only routes
  if (isAuthOnlyRoute && isAuthenticated) {
    url.pathname = localizePathname('/onboarding', locale)
    const redirectRes = NextResponse.redirect(url)
    redirectRes.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return redirectRes
  }

  if (
    !pathLocale &&
    locale !== DEFAULT_LOCALE &&
    !isLocaleRoutingExcluded(requestedPathname) &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    url.pathname = localizePathname(requestedPathname, locale)
    const redirectRes = NextResponse.redirect(url)
    redirectRes.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
    return redirectRes
  }

  response.headers.set(CANONICAL_REQUEST_ID_HEADER, requestId)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
