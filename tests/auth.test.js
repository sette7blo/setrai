import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'

import { openDatabase } from '../src/server/db/connection.js'
import { createAuthService } from '../src/server/auth/service.js'
import { createAuthRoutes } from '../src/server/auth/routes.js'
import { createOmarchyRoutes } from '../src/server/omarchy/routes.js'

async function withAuth(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-auth-'))
  const db = openDatabase(path.join(directory, 'test.db'))
  try {
    const service = createAuthService(db)
    return await run({ db, service, routes: createAuthRoutes(service) })
  } finally {
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

function request(method, headers = {}, body) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)])
  return Object.assign(req, { method, headers })
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    writeHead(status) { this.statusCode = status },
    end(body = '') { this.body = body }
  }
}

const url = (pathname) => new URL(`http://setrai.test${pathname}`)

test('created keys are shown once, stored as a hash, and verify until revoked', () => withAuth(({ db, service }) => {
  const { key, apiKey } = service.createKey({ name: ' setrai-omarchy ' })
  assert.match(key, /^setrai_[A-Za-z0-9_-]{43}$/)
  assert.equal(apiKey.name, 'setrai-omarchy')
  assert.equal(apiKey.scope, 'admin')
  assert.ok(key.startsWith(apiKey.prefix))

  const stored = db.prepare('SELECT * FROM api_keys').get()
  assert.notEqual(stored.key_hash, key)
  assert.ok(!JSON.stringify(stored).includes(key))
  assert.ok(!JSON.stringify(service.listKeys()).includes(key))

  assert.equal(service.verifyKey(key).id, apiKey.id)
  assert.ok(service.listKeys()[0].lastUsedAt)
  assert.equal(service.verifyKey(`${key}x`), null)
  assert.equal(service.verifyKey('not-a-key'), null)

  service.revokeKey(apiKey.id)
  assert.equal(service.verifyKey(key), null)
  assert.deepEqual(service.listKeys(), [])
  assert.throws(() => service.revokeKey(apiKey.id), error => error.statusCode === 404)
}))

test('key names are required and bounded', () => withAuth(({ service }) => {
  assert.throws(() => service.createKey({ name: '  ' }), error => error.statusCode === 400)
  assert.throws(() => service.createKey({ name: 'x'.repeat(61) }), error => error.statusCode === 400)
  assert.throws(() => service.createKey({ name: 42 }), error => error.statusCode === 400)
}))

test('requests without a key pass; a presented key must be valid', () => withAuth(({ service, routes }) => {
  const { key } = service.createKey({ name: 'plugin' })
  assert.equal(routes.authenticate(request('GET')), null)
  assert.equal(routes.authenticate(request('GET', { authorization: `Bearer ${key}` })).name, 'plugin')
  assert.throws(() => routes.authenticate(request('GET', { authorization: 'Bearer setrai_wrong' })), error => error.statusCode === 401)
  assert.throws(() => routes.authenticate(request('GET', { authorization: `Basic ${key}` })), error => error.statusCode === 401)
}))

test('key routes create, list, describe, and revoke keys', async () => withAuth(async ({ service, routes }) => {
  const created = response()
  assert.equal(await routes.handle(request('POST', {}, { name: 'plugin' }), created, url('/api/api-keys'), null), true)
  assert.equal(created.statusCode, 201)
  assert.equal(created.headers['cache-control'], 'no-store')
  const { key, apiKey } = JSON.parse(created.body)

  const listed = response()
  await routes.handle(request('GET'), listed, url('/api/api-keys'), null)
  assert.deepEqual(JSON.parse(listed.body).apiKeys.map(item => item.id), [apiKey.id])

  const current = response()
  const caller = service.verifyKey(key)
  await routes.handle(request('GET'), current, url('/api/api-keys/current'), caller)
  assert.equal(JSON.parse(current.body).apiKey.id, apiKey.id)
  await assert.rejects(routes.handle(request('GET'), response(), url('/api/api-keys/current'), null), error => error.statusCode === 401)

  const revoked = response()
  await routes.handle(request('DELETE'), revoked, url(`/api/api-keys/${apiKey.id}`), caller)
  assert.equal(revoked.statusCode, 204)
  assert.equal(service.verifyKey(key), null)
  assert.equal(await routes.handle(request('GET'), response(), url('/api/exercises'), null), false)
}))

test('the Omarchy snapshot endpoint requires an API key', () => {
  const routes = createOmarchyRoutes({ getSnapshot: () => ({ schemaVersion: 1 }) })
  const denied = response()
  assert.equal(routes.handle(request('GET'), denied, url('/api/omarchy/snapshot'), null), true)
  assert.equal(denied.statusCode, 401)

  const allowed = response()
  routes.handle(request('GET'), allowed, url('/api/omarchy/snapshot'), { id: 1 })
  assert.equal(allowed.statusCode, 200)
  assert.deepEqual(JSON.parse(allowed.body), { snapshot: { schemaVersion: 1 } })
  assert.equal(routes.handle(request('GET'), response(), url('/api/sessions'), null), false)
})
