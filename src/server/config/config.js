import { parseNostrRelays } from './nostr-relays.js'

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

    nostr: {
      enabled: parseBoolean(process.env.NOSTR_ENABLED, false),
      identityEnabled: parseBoolean(process.env.NOSTR_ENABLED, false) &&
        Boolean(process.env.NOSTR_NSEC?.trim()),
      relays: parseBoolean(process.env.NOSTR_ENABLED, false)
        ? parseNostrRelays(process.env.NOSTR_RELAYS || '')
        : []
    },

    monero: {
      enabled: parseBoolean(process.env.MONERO_WALLET_ENABLED, false),
      node: process.env.MONERO_NODE || ''
    }
  }
}
