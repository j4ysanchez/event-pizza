import { useUIStore } from '../store/uiStore'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  commandId?: string  // Idempotency key — injected for all mutations
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { commandId, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  // Idempotency key for mutations
  if (commandId) {
    headers.set('X-Command-Id', commandId)
  }

  // Causality token for read-your-own-writes
  const causalityToken = useUIStore.getState().causalityToken
  if (causalityToken) {
    headers.set('X-Causality-Token', causalityToken)
  }

  const response = await fetch(`/api${path}`, { ...fetchOptions, headers })

  // Store causality token from response for subsequent reads
  const newToken = response.headers.get('X-Causality-Token')
  if (newToken) {
    useUIStore.getState().setCausalityToken(newToken)
  }

  // 409 = duplicate command (idempotent success)
  if (response.status === 409) {
    return response.json() as Promise<T>
  }

  if (!response.ok) {
    let errorBody: { code?: string; message?: string } = {}
    try {
      errorBody = await response.json()
    } catch {
      // ignore parse failure
    }
    throw new ApiError(
      response.status,
      errorBody.code ?? 'UNKNOWN',
      errorBody.message ?? `HTTP ${response.status}`
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown, commandId: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      commandId,
    }),

  put: <T>(path: string, body: unknown, commandId: string) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      commandId,
    }),

  patch: <T>(path: string, body: unknown, commandId: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      commandId,
    }),

  delete: <T>(path: string, commandId: string) =>
    request<T>(path, { method: 'DELETE', commandId }),
}
