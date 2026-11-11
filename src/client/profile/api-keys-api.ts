import { apiClient, type ApiClient } from '../shared/api/client.js'

export interface ApiKey {
  id: number
  name: string
  prefix: string
  scope: string
  createdAt: string
  lastUsedAt: string | null
}

export interface CreatedApiKey {
  key: string
  apiKey: ApiKey
}

export async function listApiKeys(client: ApiClient = apiClient): Promise<ApiKey[]> {
  const response = await client.get<{ apiKeys: ApiKey[] }>('/api/api-keys')
  return response.apiKeys
}

export function createApiKey(name: string, client: ApiClient = apiClient): Promise<CreatedApiKey> {
  return client.request<CreatedApiKey>('/api/api-keys', { method: 'POST', body: { name } })
}

export async function revokeApiKey(id: number, client: ApiClient = apiClient): Promise<void> {
  await client.request<void>(`/api/api-keys/${id}`, { method: 'DELETE' })
}
