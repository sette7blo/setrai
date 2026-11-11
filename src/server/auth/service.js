import crypto from 'node:crypto'

import { createApiKeyRepository } from '../db/repositories/api-keys.js'

const KEY_PREFIX = 'setrai_'
const VISIBLE_PREFIX_LENGTH = KEY_PREFIX.length + 6
const MAX_NAME_LENGTH = 60

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

function toPublicKey(row) {
  return {
    id: Number(row.id),
    name: row.name,
    prefix: row.prefix,
    scope: row.scope,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? null
  }
}

function normalizeName(value) {
  if (value !== undefined && typeof value !== 'string') throw httpError('Key name must be text', 400)
  const name = (value ?? '').trim()
  if (!name) throw httpError('Key name is required', 400)
  if (name.length > MAX_NAME_LENGTH) throw httpError(`Key name must be at most ${MAX_NAME_LENGTH} characters`, 400)
  return name
}

export function createAuthService(db) {
  const repository = createApiKeyRepository(db)

  function listKeys() {
    return repository.list().map(toPublicKey)
  }

  // The plain key is returned once here and never stored; only its hash is kept.
  function createKey(input = {}) {
    const name = normalizeName(input.name)
    const key = KEY_PREFIX + crypto.randomBytes(32).toString('base64url')
    const row = repository.insert({
      name,
      prefix: key.slice(0, VISIBLE_PREFIX_LENGTH),
      keyHash: hashKey(key),
      scope: 'admin'
    })
    return { key, apiKey: toPublicKey(row) }
  }

  function revokeKey(id) {
    if (!repository.remove(id)) throw httpError('API key not found', 404)
  }

  function verifyKey(key) {
    if (typeof key !== 'string' || !key.startsWith(KEY_PREFIX)) return null
    const row = repository.findByHash(hashKey(key))
    if (!row) return null
    repository.touch(row.id)
    return toPublicKey(row)
  }

  return { listKeys, createKey, revokeKey, verifyKey }
}
