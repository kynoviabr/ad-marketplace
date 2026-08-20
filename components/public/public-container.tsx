/**
 * PublicContainer — canonical responsive container for public marketplace pages.
 *
 * Frozen spec (FASE 12.1C):
 * - Max width: 1280px (--container-xl)
 * - Horizontal padding: 16px mobile / 24px tablet / 32px desktop
 * - Centered with margin: 0 auto
 *
 * Usage:
 *   <PublicContainer>
 *     <YourContent />
 *   </PublicContainer>
 *
 * For full-width sections (trust row, acquisition section):
 *   Use PublicSection with fullWidth prop, then PublicContainer inside.
 */
export function PublicContainer({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <>
      <div
        className={`public-container${className ? ` ${className}` : ''}`}
        style={style}
      >
        {children}
      </div>
      <style>{`
        .public-container {
          width: 100%;
          max-width: var(--container-xl);
          margin-left: auto;
          margin-right: auto;
          padding-left: 16px;
          padding-right: 16px;
        }
        @media (min-width: 768px) {
          .public-container {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
        @media (min-width: 1024px) {
          .public-container {
            padding-left: 32px;
            padding-right: 32px;
          }
        }
      `}</style>
    </>
  )
}

/**
 * PublicSection — full-width section wrapper with optional background.
 *
 * Usage:
 *   <PublicSection background="muted">
 *     <PublicContainer>...</PublicContainer>
 *   </PublicSection>
 */
export function PublicSection({
  children,
  background = 'default',
  paddingY = 'md',
  style,
}: {
  children: React.ReactNode
  background?: 'default' | 'muted' | 'surface'
  paddingY?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}) {
  const bgMap = {
    default: 'var(--color-background)',
    muted: 'var(--color-surface-muted)',
    surface: 'var(--color-surface)',
  }

  const pyMap = {
    sm: '24px',
    md: '48px',
    lg: '80px',
  }

  return (
    <section
      style={{
        background: bgMap[background],
        paddingTop: pyMap[paddingY],
        paddingBottom: pyMap[paddingY],
        ...style,
      }}
    >
      {children}
    </section>
  )
}
