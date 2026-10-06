// src/server/exercises/routes.js

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })

  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  const raw = Buffer.concat(chunks).toString('utf8')

  try {
    return JSON.parse(raw)
  } catch {
    const error = new Error('Invalid JSON body')
    error.statusCode = 400
    throw error
  }
}

function parseExerciseId(pathname) {
  const match = pathname.match(/^\/api\/exercises\/(\d+)$/)

  if (!match) {
    return null
  }

  return Number(match[1])
}

export function createExerciseRoutes(exerciseService) {
  async function handle(req, res, url) {
    if (
      req.method === 'GET' &&
      url.pathname === '/api/exercises'
    ) {
      const favouriteParam =
        url.searchParams.get('favourite')

      let favourite = null

      if (favouriteParam === 'true') {
        favourite = true
      }

      if (favouriteParam === 'false') {
        favourite = false
      }

      const exercises =
        exerciseService.listExercises({
          search:
            url.searchParams.get('search') || '',
          favourite
        })

      sendJson(res, 200, {
        exercises
      })

      return true
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/api/exercises'
    ) {
      const body = await readJsonBody(req)

      const exercise =
        exerciseService.createExercise(body)

      sendJson(res, 201, {
        exercise
      })

      return true
    }

    const exerciseId =
      parseExerciseId(url.pathname)

    if (exerciseId === null) {
      return false
    }

    if (req.method === 'GET') {
      const exercise =
        exerciseService.getExercise(exerciseId)

      if (!exercise) {
        sendJson(res, 404, {
          error: 'Exercise not found'
        })

        return true
      }

      sendJson(res, 200, {
        exercise
      })

      return true
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)

      const exercise =
        exerciseService.updateExercise(
          exerciseId,
          body
        )

      if (!exercise) {
        sendJson(res, 404, {
          error: 'Exercise not found'
        })

        return true
      }

      sendJson(res, 200, {
        exercise
      })

      return true
    }

    if (req.method === 'DELETE') {
      const removed =
        exerciseService.deleteExercise(
          exerciseId
        )

      if (!removed) {
        sendJson(res, 404, {
          error: 'Exercise not found'
        })

        return true
      }

      res.writeHead(204)
      res.end()

      return true
    }

    return false
  }

  return {
    handle
  }
}
