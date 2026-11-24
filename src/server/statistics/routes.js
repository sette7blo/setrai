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

    const progressMatch = req.method === 'GET' && url.pathname.match(/^\/api\/statistics\/exercises\/([^/]+)$/)
    if (progressMatch) {
      let slug
      try {
        slug = decodeURIComponent(progressMatch[1])
      } catch {
        sendJson(res, 400, { error: 'Invalid exercise slug' })
        return true
      }
      const progress = statisticsService.getExerciseProgress(slug)
      if (!progress) sendJson(res, 404, { error: 'Exercise not found' })
      else sendJson(res, 200, { progress })
      return true
    }

    return false
  }

  return { handle }
}
