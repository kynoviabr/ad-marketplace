/**
 * Safe Metadata Sanitizer & Presenter — PX1C
 *
 * Implements strict, allowlist-only formatting for health probe metadata
 * in the Admin UI.
 *
 * SECURITY INVARIANTS:
 * 1. Never displays secrets, API keys, tokens, or raw credentials.
 * 2. Never displays raw database connection strings or internal bucket paths.
 * 3. Never dumps unparsed raw JSON into the DOM.
 * 4. Only allows known safe boolean, counter, or operational configuration flags.
 */

export interface SafeMetadataEntry {
  key: string
  label: string
  value: string
  isWarning?: boolean
}

/**
 * Normalizes and filters probe metadata into human-readable, safe operational entries.
 */
export function formatSafeProbeMetadata(
  metadata?: Record<string, unknown>,
  locale: string = 'pt-BR'
): SafeMetadataEntry[] {
  if (!metadata || typeof metadata !== 'object') {
    return []
  }

  const isPt = locale === 'pt-BR'
  const entries: SafeMetadataEntry[] = []

  // Allowlist Rule 1: Mock Provider / Gateway state
  if ('mockMode' in metadata && typeof metadata.mockMode === 'boolean') {
    entries.push({
      key: 'mockMode',
      label: isPt ? 'Modo de Cobrança' : 'Billing Mode',
      value: metadata.mockMode
        ? isPt ? 'MOCK Ativo (Sem cobrança real)' : 'MOCK Active (No live charges)'
        : isPt ? 'Gateway Real Configurado' : 'Live Gateway Configured',
      isWarning: metadata.mockMode === true,
    })
  }

  if ('provider' in metadata && typeof metadata.provider === 'string') {
    entries.push({
      key: 'provider',
      label: isPt ? 'Provedor Ativo' : 'Active Provider',
      value: String(metadata.provider),
    })
  }

  // Allowlist Rule 2: Auth readiness
  if ('authServiceReady' in metadata && typeof metadata.authServiceReady === 'boolean') {
    entries.push({
      key: 'authServiceReady',
      label: isPt ? 'Prontidão Auth' : 'Auth Readiness',
      value: metadata.authServiceReady ? (isPt ? 'Pronto' : 'Ready') : (isPt ? 'Inativo' : 'Inactive'),
    })
  }

  if ('adminClientReady' in metadata && typeof metadata.adminClientReady === 'boolean') {
    entries.push({
      key: 'adminClientReady',
      label: isPt ? 'Cliente Admin' : 'Admin Client',
      value: metadata.adminClientReady ? (isPt ? 'Inicializado' : 'Initialized') : (isPt ? 'Falha' : 'Failed'),
    })
  }

  // Allowlist Rule 3: Channel Flags (Email / WhatsApp OTP)
  if ('emailOtpEnabled' in metadata && typeof metadata.emailOtpEnabled === 'boolean') {
    entries.push({
      key: 'emailOtpEnabled',
      label: isPt ? 'Canal Email OTP' : 'Email OTP Channel',
      value: metadata.emailOtpEnabled ? (isPt ? 'Ativado' : 'Enabled') : (isPt ? 'Desativado' : 'Disabled'),
    })
  }

  if ('whatsappOtpEnabled' in metadata && typeof metadata.whatsappOtpEnabled === 'boolean') {
    entries.push({
      key: 'whatsappOtpEnabled',
      label: isPt ? 'Canal WhatsApp OTP' : 'WhatsApp OTP Channel',
      value: metadata.whatsappOtpEnabled ? (isPt ? 'Ativado' : 'Enabled') : (isPt ? 'Desativado' : 'Disabled'),
    })
  }

  // Allowlist Rule 4: Config missing count
  if ('missingCount' in metadata && typeof metadata.missingCount === 'number') {
    if (metadata.missingCount > 0) {
      entries.push({
        key: 'missingCount',
        label: isPt ? 'Parâmetros Ausentes' : 'Missing Parameters',
        value: `${metadata.missingCount} ${isPt ? 'item(ns)' : 'item(s)'}`,
        isWarning: true,
      })
    }
  }

  // Allowlist Rule 5: Generic configured boolean
  if ('configured' in metadata && typeof metadata.configured === 'boolean') {
    entries.push({
      key: 'configured',
      label: isPt ? 'Status de Configuração' : 'Config Status',
      value: metadata.configured ? (isPt ? 'Completo' : 'Complete') : (isPt ? 'Incompleto' : 'Incomplete'),
      isWarning: !metadata.configured,
    })
  }

  // Allowlist Rule 6: Storage bucket privacy flag (without exposing bucket name or URL)
  if ('isPublic' in metadata && typeof metadata.isPublic === 'boolean') {
    entries.push({
      key: 'isPublic',
      label: isPt ? 'Visibilidade do Bucket' : 'Bucket Visibility',
      value: metadata.isPublic ? (isPt ? 'Público' : 'Public') : (isPt ? 'Privado (Seguro)' : 'Private (Secure)'),
    })
  }

  return entries
}
