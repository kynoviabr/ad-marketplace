import 'server-only'

export interface DiditClientConfig {
  apiKey: string
  baseUrl?: string
  workflowId: string
  logger?: (diagnostic: DiditSessionDiagnostic) => void
}

export type DiditSessionDiagnosticCategory =
  | 'DIDIT_SESSION_HTTP_ERROR'
  | 'DIDIT_SESSION_INVALID_CONFIG'
  | 'DIDIT_SESSION_INVALID_WORKFLOW'
  | 'DIDIT_SESSION_INVALID_CALLBACK'
  | 'DIDIT_SESSION_PROVIDER_VALIDATION_ERROR'
  | 'DIDIT_SESSION_OK'

export interface DiditSessionDiagnostic {
  category: DiditSessionDiagnosticCategory
  httpStatus: number | null
  providerCode: string | null
  providerMessage: string | null
  providerField: string | null
  endpointPath: '/v3/session/'
  diditApiKeyConfigured: boolean
  diditApiKeyLength: number
  diditWorkflowIdConfigured: boolean
  diditWorkflowIdLength: number
  appUrlConfigured: boolean
  appUrlHost: string | null
}

interface DiditSessionResponse {
  session_id: string
  url: string
  session_token?: string
}

interface SanitizedProviderError {
  code: string | null
  message: string | null
  field: string | null
}

export class DiditApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown
  ) {
    super(message)
    this.name = 'DiditApiError'
  }
}

/**
 * Server-to-Server HTTP Client for Didit API.
 */
export class DiditClient {
  private apiKey: string
  private baseUrl: string
  private workflowId: string
  private logger: (diagnostic: DiditSessionDiagnostic) => void

  constructor(config: DiditClientConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://verification.didit.me'
    this.workflowId = config.workflowId
    this.logger = config.logger ?? ((diagnostic) => {
      const method = diagnostic.category === 'DIDIT_SESSION_OK' ? 'info' : 'error'
      console[method]('[verification:didit:session]', diagnostic)
    })

    if (!config.apiKey || !config.workflowId) {
      this.logSessionDiagnostic('DIDIT_SESSION_INVALID_CONFIG')
      throw new Error('DiditClient requires configured apiKey and workflowId')
    }
  }

  private logSessionDiagnostic(
    category: DiditSessionDiagnosticCategory,
    details: Partial<DiditSessionDiagnostic> = {}
  ) {
    this.logger({
      category,
      httpStatus: null,
      providerCode: null,
      providerMessage: null,
      providerField: null,
      endpointPath: '/v3/session/',
      diditApiKeyConfigured: this.apiKey.length > 0,
      diditApiKeyLength: this.apiKey.length,
      diditWorkflowIdConfigured: this.workflowId.length > 0,
      diditWorkflowIdLength: this.workflowId.length,
      appUrlConfigured: false,
      appUrlHost: null,
      ...details,
    })
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const responseText = await response.text()
    let body: unknown
    try {
      body = JSON.parse(responseText)
    } catch {
      body = responseText
    }

    if (!response.ok) {
      throw new DiditApiError(`Didit API request failed with status ${response.status}`, response.status, body)
    }

    return body as T
  }

  async createSession(
    vendorData: string,
    callbackUrl?: string,
    appUrlConfigured = false
  ): Promise<DiditSessionResponse> {
    let appUrlHost: string | null = null
    if (callbackUrl) {
      try {
        const parsedCallback = new URL(callbackUrl)
        if (!['http:', 'https:'].includes(parsedCallback.protocol)) throw new Error('Invalid protocol')
        appUrlHost = parsedCallback.host
      } catch {
        this.logSessionDiagnostic('DIDIT_SESSION_INVALID_CALLBACK', {
          appUrlConfigured,
        })
        throw new Error('Didit session callback URL is invalid')
      }
    }

    try {
      const response = await this.request<unknown>('/v3/session/', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: this.workflowId,
          vendor_data: vendorData,
          callback: callbackUrl,
        }),
      })

      if (!isDiditSessionResponse(response)) {
        this.logSessionDiagnostic('DIDIT_SESSION_PROVIDER_VALIDATION_ERROR', {
          httpStatus: 502,
          providerMessage: 'Malformed Didit session response',
          appUrlConfigured,
          appUrlHost,
        })
        throw new DiditApiError('Didit API returned a malformed session response', 502)
      }

      this.logSessionDiagnostic('DIDIT_SESSION_OK', {
        httpStatus: 201,
        appUrlConfigured,
        appUrlHost,
      })
      return response
    } catch (error) {
      if (!(error instanceof DiditApiError) || error.statusCode === 502) throw error

      const providerError = sanitizeProviderError(error.responseBody, [
        this.apiKey,
        this.workflowId,
        vendorData,
        callbackUrl,
      ])
      const category = classifySessionError(error.statusCode, providerError.field)
      this.logSessionDiagnostic(category, {
        httpStatus: error.statusCode ?? null,
        providerCode: providerError.code,
        providerMessage: providerError.message,
        providerField: providerError.field,
        appUrlConfigured,
        appUrlHost,
      })
      throw new DiditApiError(
        `Didit API request failed with status ${error.statusCode ?? 'unknown'}`,
        error.statusCode,
        providerError
      )
    }
  }

  async getDecision(sessionId: string) {
    return this.request<{
      status: string
      session_kind?: string
      id_verifications?: Array<{
        status: string
        age?: number
        date_of_birth?: string
        issuing_country?: string
        document_type?: string
        warnings?: string[]
      }>
      liveness_checks?: Array<{
        status: string
      }>
      face_matches?: Array<{
        status: string
      }>
    }>(`/v3/session/${sessionId}/decision/`, {
      method: 'GET',
    })
  }
}

function isDiditSessionResponse(value: unknown): value is DiditSessionResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Record<string, unknown>
  return typeof response.session_id === 'string' && typeof response.url === 'string'
}

function sanitizeText(value: unknown, redactions: Array<string | undefined> = []): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  let sanitized = value
  for (const redaction of redactions) {
    if (redaction) sanitized = sanitized.replaceAll(redaction, '[redacted]')
  }
  return sanitized
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[redacted-id]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 240)
}

function sanitizeProviderError(
  value: unknown,
  redactions: Array<string | undefined>
): SanitizedProviderError {
  if (!value || typeof value !== 'object') {
    return { code: null, message: sanitizeText(value, redactions), field: null }
  }

  const body = value as Record<string, unknown>
  const allowedFields = ['workflow_id', 'callback', 'vendor_data', 'metadata', 'language']
  const field = allowedFields.find((key) => key in body) ?? null
  const fieldValue = field ? body[field] : undefined
  const fieldMessage = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue

  return {
    code: sanitizeText(body.code, redactions),
    message: sanitizeText(body.detail ?? body.message ?? body.error ?? fieldMessage, redactions),
    field,
  }
}

function classifySessionError(
  statusCode: number | undefined,
  field: string | null
): DiditSessionDiagnosticCategory {
  if (statusCode === 400 && field === 'workflow_id') return 'DIDIT_SESSION_INVALID_WORKFLOW'
  if (statusCode === 400 && field === 'callback') return 'DIDIT_SESSION_INVALID_CALLBACK'
  if (statusCode === 400) return 'DIDIT_SESSION_PROVIDER_VALIDATION_ERROR'
  return 'DIDIT_SESSION_HTTP_ERROR'
}
