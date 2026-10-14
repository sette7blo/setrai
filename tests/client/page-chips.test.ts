import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

test('shared chip tokens unify metric and control chip families', () => {
  const tokens = fs.readFileSync(path.join(root, 'src/client/app/styles/tokens.css'), 'utf8')
  for (const key of [
    '--chip-radius',
    '--chip-metric-height',
    '--chip-control-height',
    '--chip-control-font',
    '--chip-metric-font',
  ]) {
    assert.match(tokens, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  const chips = fs.readFileSync(path.join(root, 'src/client/shared/page-chips.css'), 'utf8')
  assert.match(chips, /\.library-metric/)
  assert.match(chips, /\.filter-chip/)
  assert.match(chips, /\.equipment-chip/)
  assert.match(chips, /\.recovery-fresh-chips button/)
  assert.match(chips, /\.page-summary-metrics > span/)
  assert.match(chips, /\.recovery-quick-duration button/)
  assert.match(chips, /var\(--chip-control-height\)/)
  assert.match(chips, /var\(--chip-radius\)/)

  const main = fs.readFileSync(path.join(root, 'src/client/app/main.ts'), 'utf8')
  assert.match(main, /page-chips\.css/)

  // Live session actions remain a separate family on purpose.
  assert.doesNotMatch(chips, /\.live-action/)
  assert.doesNotMatch(chips, /\.live-primary/)
})
