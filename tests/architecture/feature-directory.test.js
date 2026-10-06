import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const checker = path.join(root, 'scripts/check-architecture.mjs')

test('server entry point is allowed while unknown server files still warn', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-architecture-'))

  try {
    fs.cpSync(path.join(root, 'docs'), path.join(fixture, 'docs'), { recursive: true })
    fs.copyFileSync(path.join(root, 'AGENTS.md'), path.join(fixture, 'AGENTS.md'))
    fs.mkdirSync(path.join(fixture, 'src/server'), { recursive: true })
    fs.writeFileSync(path.join(fixture, 'src/server/index.js'), '')
    fs.writeFileSync(path.join(fixture, 'src/server/unowned.js'), '')

    const output = execFileSync(process.execPath, [checker], {
      cwd: fixture,
      encoding: 'utf8'
    })

    assert.doesNotMatch(output, /index\.js: source file is outside/)
    assert.match(output, /unowned\.js: source file is outside a documented server feature directory/)
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})
