import { ApiError } from './errors.js'
import type {
  ApiErrorBody,
  RequestOptions
} from './types.js'

function normalizeBaseUrl(baseUrl = ''): string {
  return baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl
}

function requestHeaders(options: RequestOptions): HeadersInit {
  if (options.body === undefined) {
    return options.headers ?? {}
  }

  return {
    'Content-Type': 'application/json',
    ...(options.headers ?? {})
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as ApiErrorBody
    return body.error || 'Request failed.'
  } catch {
    return 'Request failed.'
  }
}

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = normalizeBaseUrl(baseUrl)
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: requestHeaders(options),
      body: options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
      signal: options.signal
    })

    if (!response.ok) {
      throw new ApiError(
        await parseError(response),
        response.status,
        path
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return await response.json() as T
  }

  async upload<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: formData,
      signal
    })

    if (!response.ok) {
      throw new ApiError(await parseError(response), response.status, path)
    }

    return await response.json() as T
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { signal })
  }
}

export const apiClient = new ApiClient()
