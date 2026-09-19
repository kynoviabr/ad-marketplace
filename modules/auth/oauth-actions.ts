'use server'

/**
 * Google OAuth Server Actions — R11.5A
 */

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createSignedOAuthIntent, type OAuthIntent } from './oauth'
import { getTrustedAuthCallbackOrigin } from './origin'

/**
 * Server Action: Initiates Google OAuth with strict intent recording.
 * Sets HttpOnly secure cookie and returns the Supabase OAuth redirect URL.
 */
export async function startGoogleOAuthAction(intent: OAuthIntent): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    if (intent !== 'ADVERTISER' && intent !== 'CLIENT' && intent !== 'LOGIN') {
      return { success: false, error: 'Intenção de acesso inválida.' }
    }

    const token = createSignedOAuthIntent(intent)
    const cookieStore = await cookies()
    const trustedOrigin = getTrustedAuthCallbackOrigin()

    cookieStore.set('velvet_oauth_intent', token, {
      httpOnly: true,
      secure: trustedOrigin.startsWith('https:') || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    })

    const supabase = await createServerClient()
    const redirectTo = `${trustedOrigin}/auth/callback`

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
      console.error('[startGoogleOAuthAction] Supabase signInWithOAuth error:', error.message)
      return { success: false, error: error.message }
    }

    if (!data?.url) {
      console.error('[startGoogleOAuthAction] Provedor Google não retornou URL')
      return { success: false, error: 'Provedor Google não configurado.' }
    }

    return { success: true, url: data.url }
  } catch (err: any) {
    console.error('[startGoogleOAuthAction] Unexpected error:', err)
    return { success: false, error: err?.message || 'Erro inesperado na autenticação.' }
  }
}
