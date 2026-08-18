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

/** Routes that require authentication */
const PROTECTED_ROUTES = ['/dashboard', '/suspended']

/** Routes only accessible to unauthenticated users */
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = request.nextUrl.clone()
  const pathname = url.pathname

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
          response = NextResponse.next({
            request,
          })
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
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth-only routes
  if (isAuthOnlyRoute && isAuthenticated) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - api routes (handled by their own auth checks)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
