import { sendJson } from '../shared/http.js'

export function createStatisticsRoutes(statisticsService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/statistics'
    ) {
      sendJson(res, 200, {
        statistics: statisticsService.getOverview()
      })
      return true
    }

    return false
  }

  return { handle }
}
