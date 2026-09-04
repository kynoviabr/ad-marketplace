'use server'

/**
 * Google OAuth Server Actions — R11.5A
 */

import { cookies, headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createSignedOAuthIntent, type OAuthIntent } from './oauth'

/**
 * Server Action: Initiates Google OAuth with strict intent recording.
 * Sets HttpOnly secure cookie and returns the Supabase OAuth redirect URL.
 */
export async function startGoogleOAuthAction(intent: OAuthIntent): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
    return { success: false, error: 'Intenção de acesso inválida.' }
  }

  const token = createSignedOAuthIntent(intent)
  const cookieStore = await cookies()
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')

  cookieStore.set('velvet_oauth_intent', token, {
    httpOnly: true,
    secure: proto === 'https' || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  try {
    const supabase = await createServerClient()
    const currentOrigin = host ? `${proto}://${host}` : null
    const appUrl = currentOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${appUrl}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data?.url) {
      return { success: false, error: 'Provedor Google não configurado.' }
    }

    return { success: true, url: data.url }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro inesperado na autenticação.' }
  }
}
