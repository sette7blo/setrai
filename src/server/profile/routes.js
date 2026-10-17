import { readJsonBody, sendJson } from '../shared/http.js'

export function createProfileRoutes(profileService) {
  async function handle(req, res, url) {
    if (url.pathname !== '/api/profile') {
      return false
    }

    if (req.method === 'GET') {
      sendJson(res, 200, {
        profile: profileService.getProfile()
      })
      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      sendJson(res, 200, {
        profile: profileService.updateProfile(body)
      })
      return true
    }

    return false
  }

  return {
    handle
  }
}
