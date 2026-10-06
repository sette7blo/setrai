import { apiClient, type ApiClient } from '../shared/api/client.js'
import { normalizeStatistics } from './format.js'
import type { StatisticsApiPayload, StatisticsOverview } from './types.js'

interface StatisticsResponse { statistics: StatisticsApiPayload }

export async function getStatistics(client: ApiClient = apiClient): Promise<StatisticsOverview> {
  const response = await client.get<StatisticsResponse>('/api/statistics')
  return normalizeStatistics(response.statistics)
}
