
import os from 'node:os'
import path from 'node:path'

const DEFAULT_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const MIN_SNAPSHOT_INTERVAL_MS = 1000

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === '') {
    return fallback
  }

  return value.toLowerCase() === 'true'
}

function parsePort(value, fallback) {
  if (!value) {
    return fallback
  }

  const port = Number.parseInt(value, 10)

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('SETRAI_PORT must be a valid port number')
  }

  return port
}

function parseSnapshotInterval(value) {
  if (!value) {
    return DEFAULT_SNAPSHOT_INTERVAL_MS
  }

  const interval = Number(value)

  if (!Number.isInteger(interval) || interval < MIN_SNAPSHOT_INTERVAL_MS) {
    throw new Error(
      `SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS must be an integer of at least ${MIN_SNAPSHOT_INTERVAL_MS}`
    )
  }

  return interval
}

function resolveSnapshotPath(value) {
  if (value) {
    return path.resolve(value)
  }

  const dataHome = process.env.XDG_DATA_HOME ||
    path.join(os.homedir(), '.local', 'share')

  return path.join(dataHome, 'setrai', 'snapshot.json')
}

export function loadConfig() {
  const dataDir = process.env.SETRAI_DATA_DIR || './data'

  return {
    server: {
      host: process.env.SETRAI_HOST || '0.0.0.0',
      port: parsePort(process.env.SETRAI_PORT, 3000),
      dataDir,
      dbPath: process.env.SETRAI_DB_PATH || `${dataDir}/setrai.db`
    },

    auth: {
      enabled: parseBoolean(process.env.SETRAI_AUTH_ENABLED, false)
    },

    ai: {
      enabled: parseBoolean(process.env.AI_ENABLED, false),
      provider: process.env.AI_PROVIDER || 'ollama',
      model: process.env.AI_MODEL || '',
      ollamaUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
    },

    omarchy: {
      snapshotEnabled: parseBoolean(
        process.env.SETRAI_OMARCHY_SNAPSHOT_ENABLED,
        false
      ),
      snapshotPath: resolveSnapshotPath(
        process.env.SETRAI_OMARCHY_SNAPSHOT_PATH
      ),
      snapshotIntervalMs: parseSnapshotInterval(
        process.env.SETRAI_OMARCHY_SNAPSHOT_INTERVAL_MS
      )
    }
  }
}
