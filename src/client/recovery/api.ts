import { apiClient, type ApiClient } from '../shared/api/client.js'
import { normalizeRecovery } from './format.js'
import type { RecoveryApiPayload, RecoveryOverview } from './types.js'

interface RecoveryResponse { recovery: RecoveryApiPayload }

export async function getRecovery(client: ApiClient = apiClient): Promise<RecoveryOverview> {
  const response = await client.get<RecoveryResponse>('/api/recovery')
  return normalizeRecovery(response.recovery)
}
