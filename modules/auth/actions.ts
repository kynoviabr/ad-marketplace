'use server'

/**
 * Auth Server Actions — FASE 01
 *
 * All form submissions (signup, login, logout, password reset) go through here.
 * Server Actions run exclusively on the server — never in the browser.
 *
 * =============================================================================
 * SECURITY ARCHITECTURE:
 *
 * role/status:
 *   NEVER set from form data, user_metadata, or any user-controlled input.
 *   Set ONLY by the PostgreSQL trigger (hardcoded ADVERTISER/ACTIVE).
 *
 * terms_version / privacy_version:
 *   NOT sourced from user_metadata (untrusted, user-controlled).
 *   Written by this server action using the admin client (service_role)
 *   IMMEDIATELY after signUp(), using CURRENT_TERMS_VERSION and
 *   CURRENT_PRIVACY_VERSION constants from centralized server config.
 *   If this write fails, the account remains in safe incomplete state
 *   (terms_version IS NULL) and the DAL blocks operational access.
 *
 * Safe incomplete state:
 *   Trigger creates account_users with NULL terms/privacy.
 *   Server action writes authoritative values.
 *   DAL enforces that NULL terms = no operational access.
 *   This prevents a scenario where auth.users exists but terms are not recorded.
 *
 * Generic error messages:
 *   Login failures use generic message (no email/password distinction).
 *   Password reset always returns success (no account existence disclosure).
 *
 * Redirect safety:
 *   All redirect URLs use NEXT_PUBLIC_APP_URL.
 *   Callback validates redirects against safe regex (no open redirect).
 * =============================================================================
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SignupSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from './schemas'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/config/legal-versions'
import type { ActionResult } from './types'

// ---------------------------------------------------------------------------
// SIGNUP
// ---------------------------------------------------------------------------

export async function signupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    acceptedAge: formData.get('acceptedAge'),
    acceptedTerms: formData.get('acceptedTerms'),
  }

  // 1. Server-side Zod validation (includes 18+ and terms/privacy checkboxes)
  const parsed = SignupSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos abaixo.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { email, password } = parsed.data

  // Server-side timestamp — NOT from client
  const now = new Date().toISOString()

  const supabase = await createServerClient()

  // 2. Create auth user via Supabase Auth.
  //    The PostgreSQL trigger fires automatically and creates account_users
  //    with role=ADVERTISER, status=ACTIVE, terms=NULL (safe incomplete state).
  //
  //    SECURITY: We do NOT pass role, status, or terms versions in options.data.
  //    The trigger ignores user_metadata for authorization values.
  //    We only pass emailRedirectTo for the confirmation email.
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      // DO NOT pass role, status, or terms versions here.
      // These are server/DB-controlled values, not user-supplied metadata.
    },
  })

  if (signUpError || !authData.user) {
    return {
      success: false,
      error: 'Não foi possível criar sua conta. Tente novamente mais tarde.',
    }
  }

  // 3. Immediately write authoritative terms/privacy acceptance.
  //    Uses admin client (service_role) — runs server-side only, bypasses RLS.
  //    Versions come from centralized server constants, NOT from user input.
  //    The newly created user is not yet authenticated (email not confirmed),
  //    so we must use admin client to write their record.
  //
  //    If this write fails, the account remains in safe incomplete state
  //    (terms_version IS NULL). The DAL will redirect such users appropriately
  //    when they attempt to log in.
  const adminClient = createAdminClient()
  const { error: termsError } = await adminClient
    .from('account_users')
    .update({
      terms_version: CURRENT_TERMS_VERSION,   // from server config — NOT user_metadata
      terms_accepted_at: now,                  // server-side timestamp
      privacy_version: CURRENT_PRIVACY_VERSION, // from server config — NOT user_metadata
      privacy_accepted_at: now,                // server-side timestamp
    })
    .eq('auth_user_id', authData.user.id)

  if (termsError) {
    // Safe incomplete state: account exists but terms not recorded.
    // Log for monitoring (no sensitive data).
    console.error('[signup] Failed to write terms acceptance for user', authData.user.id, termsError.message)
    // We still proceed to verify-email — the DAL will handle the incomplete state on login.
  }

  redirect('/verify-email')
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = LoginSchema.safeParse(raw)

  if (!parsed.success) {
    // Generic error — do not distinguish validation vs auth failure
    return { success: false, error: 'E-mail ou senha inválidos.' }
  }

  const { email, password } = parsed.data
  const supabase = await createServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Generic message — never reveal whether email exists or password is wrong
    return { success: false, error: 'E-mail ou senha incorretos.' }
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// FORGOT PASSWORD
// ---------------------------------------------------------------------------

export async function forgotPasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get('email') }
  const parsed = ForgotPasswordSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'Informe um e-mail válido.' }
  }

  const supabase = await createServerClient()

  // Call resetPasswordForEmail regardless of whether the account exists.
  // Supabase handles the email silently if no account exists.
  // This prevents enumeration of registered email addresses.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  // Always return success — generic message (no account disclosure)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// RESET PASSWORD (new password after email link)
// ---------------------------------------------------------------------------

export async function resetPasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = ResetPasswordSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos abaixo.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createServerClient()

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return {
      success: false,
      error: 'Não foi possível redefinir a senha. O link pode ter expirado.',
    }
  }

  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// START ONBOARDING (NOT_STARTED → IN_PROGRESS)
// ---------------------------------------------------------------------------

export async function startOnboardingAction(): Promise<ActionResult> {
  // Use admin client for all writes — no client-originated UPDATE via RLS
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autenticado.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('account_users')
    .update({
      onboarding_status: 'IN_PROGRESS',
      onboarding_step: 1,
    })
    .eq('auth_user_id', user.id)

  if (error) {
    return { success: false, error: 'Não foi possível iniciar o onboarding.' }
  }

  return { success: true, data: undefined }
}

/**
 * Form-compatible wrapper for startOnboardingAction.
 * React form actions require void return type.
 */
export async function startOnboardingFormAction(): Promise<void> {
  await startOnboardingAction()
}
