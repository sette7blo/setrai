import { sendJson } from '../shared/http.js'

export function createRecoveryRoutes(recoveryService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/recovery'
    ) {
      sendJson(res, 200, {
        recovery: recoveryService.getRecovery()
      })
      return true
    }

    return false
  }

  return { handle }
}
