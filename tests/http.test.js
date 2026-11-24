import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { assertSameOriginWrite, readJsonBody, readRequestBuffer } from '../src/server/shared/http.js'

function request(chunks, contentType = 'application/json') {
  return Object.assign(Readable.from(chunks), { headers: { 'content-type': contentType } })
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

test('shared JSON body reader refuses non-JSON content types so cross-site forms cannot post', async () => {
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', '']) {
    await assert.rejects(
      readJsonBody(request(['{"name":"planted"}'], type)),
      error => error.statusCode === 415
    )
  }
  assert.deepEqual(await readJsonBody(request(['{"a":1}'], 'application/json; charset=utf-8')), { a: 1 })
  assert.deepEqual(await readJsonBody(request(['{"a":1}'], 'Application/JSON')), { a: 1 })
  // An empty body carries no data, so it needs no content type.
  assert.deepEqual(await readJsonBody(request([], '')), {})
})

test('cross-site browser writes are refused while same-origin and non-browser clients pass', () => {
  const req = (method, site) => ({ method, headers: site === undefined ? {} : { 'sec-fetch-site': site } })
  for (const site of ['cross-site', 'same-site', 'Cross-Site']) {
    for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) {
      assert.throws(() => assertSameOriginWrite(req(method, site)), error => error.statusCode === 403)
    }
  }
  for (const site of ['same-origin', 'none', undefined]) {
    assert.doesNotThrow(() => assertSameOriginWrite(req('POST', site)))
  }
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.doesNotThrow(() => assertSameOriginWrite(req(method, 'cross-site')))
  }
})

test('readJsonBody rejects JSON that is not an object', async () => {
  for (const raw of ['null', '42', '"text"', '[1,2]', 'true']) {
    await assert.rejects(
      readJsonBody(request([raw], 'application/json')),
      error => error.statusCode === 400 && /JSON object/.test(error.message)
    )
  }
})
