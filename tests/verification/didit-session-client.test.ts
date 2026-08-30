import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DiditApiError,
  DiditClient,
  type DiditSessionDiagnostic,
} from '@/modules/verification/providers/didit/client'
import { DiditProvider } from '@/modules/verification/providers/didit'

describe('Didit v3 session creation client', () => {
  const apiKey = 'fixture_api_key_never_real'
  const workflowId = '11111111-2222-4333-8444-555555555555'
  const callback = 'https://velvetgirls.club/onboarding/verificacao'
  const logger = vi.fn<(diagnostic: DiditSessionDiagnostic) => void>()
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function client(overrides: Partial<ConstructorParameters<typeof DiditClient>[0]> = {}) {
    return new DiditClient({ apiKey, workflowId, logger, ...overrides })
  }

  function response(body: unknown, status = 201): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('sends the current official Didit v3 session request contract', async () => {
    fetchMock.mockResolvedValue(response({
      session_id: 'session-fixture',
      session_token: 'token-fixture',
      url: 'https://verify.didit.me/session/token-fixture',
    }))

    await client().createSession('account-fixture', callback, true)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://verification.didit.me/v3/session/')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    })
    expect(JSON.parse(String(init?.body))).toEqual({
      workflow_id: workflowId,
      vendor_data: 'account-fixture',
      callback,
    })
  })

  it.each([
    ['API key', { apiKey: '' }],
    ['workflow ID', { workflowId: '' }],
  ])('fails closed when %s is missing', (_label, config) => {
    expect(() => client(config)).toThrow('configured apiKey and workflowId')
    expect(logger.mock.calls[0][0]).toMatchObject({
      category: 'DIDIT_SESSION_INVALID_CONFIG',
      diditApiKeyConfigured: Boolean('apiKey' in config ? config.apiKey : apiKey),
      diditWorkflowIdConfigured: Boolean('workflowId' in config ? config.workflowId : workflowId),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid callback URL before contacting Didit', async () => {
    await expect(client().createSession('account-fixture', 'not a url', true))
      .rejects.toThrow('callback URL is invalid')
    expect(logger.mock.calls[0][0].category).toBe('DIDIT_SESSION_INVALID_CALLBACK')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('classifies and sanitizes a Didit workflow validation error', async () => {
    fetchMock.mockResolvedValue(response({
      workflow_id: [`Invalid workflow_id ${workflowId} for ${callback}`],
    }, 400))

    await expect(client().createSession('account-fixture', callback, true))
      .rejects.toMatchObject({
        statusCode: 400,
        responseBody: {
          field: 'workflow_id',
        },
      })
    const diagnostic = logger.mock.calls[0][0]
    expect(diagnostic).toMatchObject({
      category: 'DIDIT_SESSION_INVALID_WORKFLOW',
      httpStatus: 400,
      providerField: 'workflow_id',
      appUrlConfigured: true,
      appUrlHost: 'velvetgirls.club',
    })
    expect(JSON.stringify(diagnostic)).not.toContain(workflowId)
    expect(JSON.stringify(diagnostic)).not.toContain(callback)
    expect(JSON.stringify(diagnostic)).not.toContain(apiKey)
  })

  it('classifies a generic provider HTTP 400 validation response', async () => {
    fetchMock.mockResolvedValue(response({ detail: 'You do not have enough credits.' }, 400))
    await expect(client().createSession('account-fixture', callback, true))
      .rejects.toBeInstanceOf(DiditApiError)
    expect(logger.mock.calls[0][0]).toMatchObject({
      category: 'DIDIT_SESSION_PROVIDER_VALIDATION_ERROR',
      providerMessage: 'You do not have enough credits.',
    })
  })

  it.each([401, 403])('reports provider HTTP %s without leaking credentials', async (status) => {
    fetchMock.mockResolvedValue(response({ detail: `Rejected ${apiKey}` }, status))
    await expect(client().createSession('account-fixture', callback, true))
      .rejects.toMatchObject({ statusCode: status })
    const diagnostic = logger.mock.calls[0][0]
    expect(diagnostic.category).toBe('DIDIT_SESSION_HTTP_ERROR')
    expect(JSON.stringify(diagnostic)).not.toContain(apiKey)
  })

  it('rejects a malformed successful provider response', async () => {
    fetchMock.mockResolvedValue(response({ session_id: 'session-without-url' }))
    await expect(client().createSession('account-fixture', callback, true))
      .rejects.toMatchObject({ statusCode: 502 })
    expect(logger.mock.calls[0][0]).toMatchObject({
      category: 'DIDIT_SESSION_PROVIDER_VALIDATION_ERROR',
      providerMessage: 'Malformed Didit session response',
    })
  })

  it('diagnoses a non-JSON provider response without consuming the body twice', async () => {
    fetchMock.mockResolvedValue(new Response('<html>provider error</html>', { status: 400 }))
    await expect(client().createSession('account-fixture', callback, true))
      .rejects.toMatchObject({ statusCode: 400 })
    expect(logger.mock.calls[0][0]).toMatchObject({
      category: 'DIDIT_SESSION_PROVIDER_VALIDATION_ERROR',
      providerMessage: '<html>provider error</html>',
    })
  })

  it('returns the official session url and emits only safe configuration metadata', async () => {
    fetchMock.mockResolvedValue(response({
      session_id: 'session-fixture',
      session_token: 'token-fixture',
      url: 'https://verify.didit.me/session/token-fixture',
    }))

    const created = await client().createSession('account-fixture', callback, true)
    expect(created.url).toBe('https://verify.didit.me/session/token-fixture')
    expect(logger.mock.calls[0][0]).toEqual({
      category: 'DIDIT_SESSION_OK',
      httpStatus: 201,
      providerCode: null,
      providerMessage: null,
      providerField: null,
      endpointPath: '/v3/session/',
      diditApiKeyConfigured: true,
      diditApiKeyLength: apiKey.length,
      diditWorkflowIdConfigured: true,
      diditWorkflowIdLength: workflowId.length,
      appUrlConfigured: true,
      appUrlHost: 'velvetgirls.club',
    })
  })

  it('maps the official url field into the provider contract', async () => {
    fetchMock.mockResolvedValue(response({
      session_id: 'session-fixture',
      session_token: 'token-fixture',
      url: 'https://verify.didit.me/session/token-fixture',
    }))
    const provider = new DiditProvider({
      apiKey,
      workflowId,
      webhookSecret: 'fixture_webhook_secret_never_real',
    })

    await expect(provider.createSession({
      accountUserId: 'account-fixture',
      callbackUrl: callback,
      appUrlConfigured: true,
    })).resolves.toEqual({
      providerSessionId: 'session-fixture',
      verificationUrl: 'https://verify.didit.me/session/token-fixture',
      sessionToken: 'token-fixture',
    })
  })
})
