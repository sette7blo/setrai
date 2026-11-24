import assert from 'node:assert/strict'
import test from 'node:test'
import { loadConfig } from '../src/server/config/config.js'
import { getCapabilities } from '../src/server/config/capabilities.js'

test('capabilities expose only supported optional integrations', () => {
  const config = loadConfig()
  assert.deepEqual(Object.keys(config).sort(), ['ai', 'auth', 'server'])
  assert.deepEqual(getCapabilities(config), {
    ai: false
  })
})

test('ai stays false while no AI feature exists, even when AI_ENABLED is true', () => {
  assert.deepEqual(getCapabilities({ ai: { enabled: true } }), { ai: false })
})
