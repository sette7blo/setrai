import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { readJsonBody, readRequestBuffer } from '../src/server/shared/http.js'

function request(chunks) {
  return Readable.from(chunks)
}

test('shared JSON body reader parses valid and empty requests', async () => {
  assert.deepEqual(await readJsonBody(request([])), {})
  assert.deepEqual(await readJsonBody(request(['{"name":"Setrai"}'])), { name: 'Setrai' })
})

test('shared JSON body reader rejects malformed and oversized requests', async () => {
  await assert.rejects(readJsonBody(request(['{'])), error => error.statusCode === 400)
  await assert.rejects(
    readJsonBody(request(['12345']), { maxBytes: 4 }),
    error => error.statusCode === 413 && error.message === 'Request body is too large'
  )
})

test('shared request buffer preserves binary data and enforces limits', async () => {
  const body = await readRequestBuffer(request([Buffer.from([0, 1]), Buffer.from([2, 255])]), { maxBytes: 4 })
  assert.deepEqual([...body], [0, 1, 2, 255])
  await assert.rejects(
    readRequestBuffer(request([Buffer.alloc(5)]), { maxBytes: 4 }),
    error => error.statusCode === 413
  )
})
