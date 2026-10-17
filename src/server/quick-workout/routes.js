import { readJsonBody, sendJson } from '../shared/http.js'

export function createQuickWorkoutRoutes(quickWorkoutService) {
  async function handle(req, res, url) {
    if (
      req.method === 'POST' &&
      url.pathname === '/api/quick-workout'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        workout: quickWorkoutService.generate(body)
      })
      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/quick-workout/start'
    ) {
      const body = await readJsonBody(req)
      sendJson(res, 201, quickWorkoutService.start(body))
      return true
    }

    return false
  }

  return { handle }
}
