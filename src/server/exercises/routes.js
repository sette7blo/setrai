import {
  parseImageMultipart,
  resolveExerciseMediaFile,
  sendExerciseMediaFile,
  storeExerciseImage
} from './media.js'
import { readJsonBody, sendJson } from '../shared/http.js'

function parseExerciseId(pathname) {
  const match = pathname.match(/^\/api\/exercises\/(\d+)$/)
  if (!match) return null
  return Number(match[1])
}

export function createExerciseRoutes(exerciseService, { dataDir = './data' } = {}) {
  async function handle(req, res, url) {
    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      url.pathname.startsWith('/media/exercises/')
    ) {
      const fileName = decodeURIComponent(url.pathname.slice('/media/exercises/'.length))
      const filePath = resolveExerciseMediaFile(dataDir, fileName)
      if (!filePath) {
        sendJson(res, 404, { error: 'Image not found' })
        return true
      }
      sendExerciseMediaFile(res, filePath, req.method)
      return true
    }

    if (req.method === 'POST' && url.pathname === '/api/exercises/upload') {
      const contentType = req.headers['content-type'] || ''
      if (!contentType.toLowerCase().includes('multipart/form-data')) {
        sendJson(res, 415, { error: 'Image upload requires multipart form data' })
        return true
      }
      const body = await readRequestBody(req)
      const part = parseImageMultipart(body, contentType)
      const saved = storeExerciseImage(dataDir, part.buffer, part.contentType)
      sendJson(res, 201, { imageUrl: saved.imageUrl, bytes: saved.bytes })
      return true
    }

    if (req.method === 'GET' && url.pathname === '/api/exercises') {
      const favouriteParam = url.searchParams.get('favourite')
      let favourite = null
      if (favouriteParam === 'true') favourite = true
      if (favouriteParam === 'false') favourite = false

      const exercises = exerciseService.listExercises({
        search: url.searchParams.get('search') || '',
        favourite
      })
      sendJson(res, 200, { exercises })
      return true
    }

    if (req.method === 'POST' && url.pathname === '/api/exercises') {
      const body = await readJsonBody(req)
      const exercise = exerciseService.createExercise(body, { requireMovementType: true })
      sendJson(res, 201, { exercise })
      return true
    }

    const exerciseId = parseExerciseId(url.pathname)
    if (exerciseId === null) return false

    if (req.method === 'GET') {
      const exercise = exerciseService.getExercise(exerciseId)
      if (!exercise) {
        sendJson(res, 404, { error: 'Exercise not found' })
        return true
      }
      sendJson(res, 200, { exercise })
      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const exercise = exerciseService.updateExercise(exerciseId, body)
      if (!exercise) {
        sendJson(res, 404, { error: 'Exercise not found' })
        return true
      }
      sendJson(res, 200, { exercise })
      return true
    }

    if (req.method === 'DELETE') {
      const removed = exerciseService.deleteExercise(exerciseId)
      if (!removed) {
        sendJson(res, 404, { error: 'Exercise not found' })
        return true
      }
      res.writeHead(204)
      res.end()
      return true
    }

    return false
  }

  return { handle }
}
