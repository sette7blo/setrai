// src/server/statistics/routes.js

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(body))
}

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
