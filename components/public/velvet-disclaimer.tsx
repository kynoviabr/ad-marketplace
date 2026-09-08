import type { HTMLAttributes } from 'react'
import type { Locale } from '@/lib/i18n/config'

export type VelvetDisclaimerVariant =
  | 'role'
  | 'contact'
  | 'compact-contact'
  | 'verification'
  | 'footer'
  | 'reviews'

export const CANONICAL_ROLE_DISCLAIMER = {
  pt: 'A Velvet é uma plataforma de descoberta e contato direto. Não intermediamos conversas, negociações, pagamentos, serviços ou encontros realizados dentro ou fora da plataforma.',
  en: 'Velvet is a discovery and direct-contact platform. We do not intermediate conversations, negotiations, payments, services, or meetings held inside or outside the platform.',
} as const

export const CANONICAL_VERIFICATION_DISCLAIMER = {
  pt: 'A verificação confirma a identidade e a maioridade de quem anuncia. Ela não é uma garantia de comportamento, serviço, pagamento ou encontro.',
  en: 'Verification confirms the identity and legal age of the advertiser. It is not a guarantee of conduct, service, payment, or meetings.',
} as const

export const CANONICAL_CONTACT_SAFETY = {
  pt: {
    disclaimer: 'A conversa acontece diretamente entre você e a profissional. A Velvet não participa da negociação, do pagamento, da contratação ou do encontro, dentro ou fora da plataforma.',
    safety: 'Não compartilhe senhas, códigos de acesso, documentos ou dados bancários com desconhecidos.',
  },
  en: {
    disclaimer: 'The conversation happens directly between you and the professional. Velvet does not participate in negotiations, payments, hiring, or meetings, inside or outside the platform.',
    safety: 'Never share passwords, access codes, documents, or banking details with unknown parties.',
  },
} as const

export const CANONICAL_COMPACT_CONTACT = {
  pt: {
    disclaimer: 'Contato direto. A Velvet não participa do que for combinado entre vocês.',
    safety: 'Proteja seus dados pessoais e financeiros.',
  },
  en: {
    disclaimer: 'Direct contact. Velvet does not participate in arrangements made between you.',
    safety: 'Protect your personal and financial details.',
  },
} as const

export const CANONICAL_FOOTER_DISCLAIMER = {
  pt: 'A Velvet é uma plataforma de descoberta e contato direto. Não intermediamos conversas, pagamentos, serviços ou encontros realizados dentro ou fora da plataforma. A verificação confirma identidade e maioridade, mas não garante comportamento, serviço ou encontro.',
  en: 'Velvet is a discovery and direct-contact platform. We do not intermediate conversations, payments, services, or meetings held inside or outside the platform. Verification confirms identity and legal age, but does not guarantee conduct, service, or meetings.',
} as const

export const CANONICAL_REVIEWS_DISCLAIMER = {
  pt: 'As avaliações refletem a opinião de membros cadastrados e não constituem garantia da Velvet sobre serviços, conduta ou encontros.',
  en: 'Reviews reflect the opinions of registered members and do not constitute a guarantee by Velvet regarding services, conduct, or meetings.',
} as const

export interface VelvetDisclaimerProps extends HTMLAttributes<HTMLDivElement> {
  variant: VelvetDisclaimerVariant
  locale?: Locale
}

export function VelvetDisclaimer({
  variant,
  locale = 'pt-BR',
  className = '',
  ...props
}: VelvetDisclaimerProps) {
  const isPt = locale === 'pt-BR'

  if (variant === 'contact') {
    const texts = isPt ? CANONICAL_CONTACT_SAFETY.pt : CANONICAL_CONTACT_SAFETY.en
    return (
      <div className={`velvet-disclaimer velvet-disclaimer--contact ${className}`} {...props}>
        <p className="velvet-disclaimer-primary">{texts.disclaimer}</p>
        <p className="velvet-disclaimer-safety">{texts.safety}</p>
      </div>
    )
  }

  if (variant === 'compact-contact') {
    const texts = isPt ? CANONICAL_COMPACT_CONTACT.pt : CANONICAL_COMPACT_CONTACT.en
    return (
      <div className={`velvet-disclaimer velvet-disclaimer--compact ${className}`} {...props}>
        <p className="velvet-disclaimer-primary">{texts.disclaimer} {texts.safety}</p>
      </div>
    )
  }

  if (variant === 'verification') {
    const text = isPt ? CANONICAL_VERIFICATION_DISCLAIMER.pt : CANONICAL_VERIFICATION_DISCLAIMER.en
    return (
      <p className={`velvet-disclaimer velvet-disclaimer--verification ${className}`} {...props}>
        {text}
      </p>
    )
  }

  if (variant === 'role') {
    const text = isPt ? CANONICAL_ROLE_DISCLAIMER.pt : CANONICAL_ROLE_DISCLAIMER.en
    return (
      <p className={`velvet-disclaimer velvet-disclaimer--role ${className}`} {...props}>
        {text}
      </p>
    )
  }

  if (variant === 'reviews') {
    const text = isPt ? CANONICAL_REVIEWS_DISCLAIMER.pt : CANONICAL_REVIEWS_DISCLAIMER.en
    return (
      <p className={`velvet-disclaimer velvet-disclaimer--reviews ${className}`} {...props}>
        {text}
      </p>
    )
  }

  // Footer default
  const text = isPt ? CANONICAL_FOOTER_DISCLAIMER.pt : CANONICAL_FOOTER_DISCLAIMER.en
  return (
    <p className={`velvet-disclaimer velvet-disclaimer--footer ${className}`} {...props}>
      {text}
    </p>
  )
}

export function VelvetRoleDisclaimer({ locale }: { locale?: Locale }) {
  return <VelvetDisclaimer variant="role" locale={locale} />
}

export function VelvetContactSafetyNotice({
  locale,
  compact = false,
}: {
  locale?: Locale
  compact?: boolean
}) {
  return <VelvetDisclaimer variant={compact ? 'compact-contact' : 'contact'} locale={locale} />
}

export function VelvetVerificationDisclaimer({ locale }: { locale?: Locale }) {
  return <VelvetDisclaimer variant="verification" locale={locale} />
}

export function VelvetReviewsDisclaimer({ locale }: { locale?: Locale }) {
  return <VelvetDisclaimer variant="reviews" locale={locale} />
}
