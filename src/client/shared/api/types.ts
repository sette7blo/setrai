export type CapabilityKey = 'ai'

export type Capabilities = Record<CapabilityKey, boolean>

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PATCH'
  | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

export interface ApiErrorBody {
  error?: string
}
