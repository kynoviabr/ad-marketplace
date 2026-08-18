import 'server-only'

export interface DiditClientConfig {
  apiKey: string
  baseUrl?: string
  workflowId: string
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

  constructor(config: DiditClientConfig) {
    if (!config.apiKey) {
      throw new Error('DiditClient requires a valid apiKey')
    }
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://verification.didit.me'
    this.workflowId = config.workflowId
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

    if (!response.ok) {
      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = await response.text()
      }
      throw new DiditApiError(`Didit API request failed with status ${response.status}`, response.status, body)
    }

    return response.json() as Promise<T>
  }

  async createSession(vendorData: string, callbackUrl?: string) {
    return this.request<{
      session_id: string
      verification_url: string
      session_token?: string
    }>('/v3/session/', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: this.workflowId,
        vendor_data: vendorData,
        callback: callbackUrl,
      }),
    })
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
