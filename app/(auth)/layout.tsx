/**
 * (auth) route group layout
 * Wraps all auth pages: /signup, /login, /forgot-password, /reset-password, /verify-email
 *
 * Route groups use parentheses — (auth) — so they do NOT appear in the URL.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <div className="auth-container">{children}</div>
    </main>
  )
}
