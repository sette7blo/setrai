import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { handleStaticClientRoute } from '../src/server/shared/static-client.js'

async function withStaticServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-static-test-'))
  const clientDist = path.join(directory, 'client')
  fs.mkdirSync(path.join(clientDist, 'assets'), { recursive: true })
  fs.writeFileSync(path.join(clientDist, 'index.html'), '<!doctype html><title>app</title>')
  fs.writeFileSync(path.join(clientDist, 'assets', 'app.js'), 'console.log(1)')
  fs.writeFileSync(path.join(directory, 'secret.txt'), 'outside')
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (!handleStaticClientRoute(req, res, url, clientDist)) {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    await run(base)
  } finally {
    await new Promise(resolve => server.close(resolve))
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

test('a directory request falls back to the app shell instead of crashing the server', async () => {
  await withStaticServer(async (base) => {
    for (const pathname of ['/assets', '/assets/']) {
      const response = await fetch(base + pathname)
      assert.equal(response.status, 200)
      assert.match(await response.text(), /<title>app<\/title>/)
    }
    const file = await fetch(`${base}/assets/app.js`)
    assert.equal(await file.text(), 'console.log(1)')
    assert.match(file.headers.get('content-type'), /javascript/)
  })
})

test('malformed escapes and traversal attempts never read outside the client build', async () => {
  await withStaticServer(async (base) => {
    for (const pathname of ['/%E0%A4%A', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt']) {
      const response = await fetch(base + pathname)
      assert.equal(response.status, 200, pathname)
      const body = await response.text()
      assert.doesNotMatch(body, /outside/, pathname)
      assert.match(body, /<title>app<\/title>/, pathname)
    }
  })
})
