// src/server/index.js

import http from 'node:http'

import { loadConfig } from './config/config.js'
import {
  getCapabilities
} from './config/capabilities.js'
import {
  openDatabase
} from './db/connection.js'
import {
  createExerciseService
} from './exercises/service.js'
import {
  createExerciseRoutes
} from './exercises/routes.js'
import {
  createProgramService
} from './programs/service.js'
import {
  createProgramRoutes
} from './programs/routes.js'
import {
  createSessionService
} from './sessions/service.js'
import {
  createSessionRoutes
} from './sessions/routes.js'
import {
  createBodyService
} from './body/service.js'
import {
  createBodyRoutes
} from './body/routes.js'
import {
  createProfileService
} from './profile/service.js'
import {
  createProfileRoutes
} from './profile/routes.js'
import {
  createStatisticsService
} from './statistics/service.js'
import {
  createStatisticsRoutes
} from './statistics/routes.js'
import {
  createRecoveryService
} from './recovery/service.js'
import {
  createRecoveryRoutes
} from './recovery/routes.js'
import {
  createQuickWorkoutService
} from './quick-workout/service.js'
import {
  createQuickWorkoutRoutes
} from './quick-workout/routes.js'
import {
  handleStaticClientRoute
} from './shared/static-client.js'

const config = loadConfig()
const db = openDatabase(config.server.dbPath, {
  seed: true
})

const exerciseService =
  createExerciseService(db)
const programService =
  createProgramService(db)
const sessionService =
  createSessionService(db)
const bodyService =
  createBodyService(db)
const profileService =
  createProfileService(db)
const statisticsService =
  createStatisticsService(db)
const recoveryService =
  createRecoveryService(db)
const quickWorkoutService =
  createQuickWorkoutService(db)

const exerciseRoutes =
  createExerciseRoutes(exerciseService, {
    dataDir: config.server.dataDir
  })
const programRoutes =
  createProgramRoutes(programService)
const sessionRoutes =
  createSessionRoutes(sessionService)
const bodyRoutes =
  createBodyRoutes(bodyService)
const profileRoutes =
  createProfileRoutes(profileService)
const statisticsRoutes =
  createStatisticsRoutes(statisticsService)
const recoveryRoutes =
  createRecoveryRoutes(recoveryService)
const quickWorkoutRoutes =
  createQuickWorkoutRoutes(quickWorkoutService)


function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  })

  res.end(JSON.stringify(body))
}

const server = http.createServer(
  async (req, res) => {
    try {
      const url = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      )

      if (
        req.method === 'GET' &&
        url.pathname === '/api/capabilities'
      ) {
        sendJson(
          res,
          200,
          getCapabilities(config)
        )

        return
      }


      const handledExerciseRoute =
        await exerciseRoutes.handle(
          req,
          res,
          url
        )

      if (handledExerciseRoute) {
        return
      }

      const handledProgramRoute =
        await programRoutes.handle(
          req,
          res,
          url
        )

      if (handledProgramRoute) {
        return
      }

      const handledSessionRoute =
        await sessionRoutes.handle(
          req,
          res,
          url
        )

      if (handledSessionRoute) {
        return
      }

      const handledBodyRoute =
        await bodyRoutes.handle(
          req,
          res,
          url
        )

      if (handledBodyRoute) {
        return
      }

      const handledProfileRoute =
        await profileRoutes.handle(
          req,
          res,
          url
        )

      if (handledProfileRoute) {
        return
      }

      const handledStatisticsRoute =
        await statisticsRoutes.handle(
          req,
          res,
          url
        )

      if (handledStatisticsRoute) {
        return
      }

      const handledRecoveryRoute =
        await recoveryRoutes.handle(
          req,
          res,
          url
        )

      if (handledRecoveryRoute) {
        return
      }

      const handledQuickWorkoutRoute =
        await quickWorkoutRoutes.handle(
          req,
          res,
          url
        )

      if (handledQuickWorkoutRoute) {
        return
      }

      if (handleStaticClientRoute(req, res, url)) {
        return
      }

      if (
        req.method === 'GET' &&
        url.pathname === '/'
      ) {
        res.writeHead(200, {
          'Content-Type':
            'text/html; charset=utf-8'
        })

        res.end(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              >
              <title>Setrai</title>
            </head>

            <body>
              <h1>Setrai</h1>
              <p>
                Self-hosted AI-native training.
              </p>
            </body>
          </html>
        `)

        return
      }

      sendJson(res, 404, {
        error: 'Not found'
      })
    } catch (error) {
      const status =
        error.statusCode || 500

      if (status >= 500) {
        console.error(error)
      }

      sendJson(res, status, {
        error:
          status >= 500
            ? 'Internal server error'
            : error.message
      })
    }
  }
)

server.listen(
  config.server.port,
  config.server.host,
  () => {
    console.log(
      `Setrai listening on http://${config.server.host}:${config.server.port}`
    )

    console.log(
      `Database: ${config.server.dbPath}`
    )
  }
)

function shutdown() {
  console.log('Shutting down Setrai...')

  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
