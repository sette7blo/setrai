import assert from 'node:assert/strict'
import test from 'node:test'
import { loadConfig } from '../src/server/config/config.js'
import { getCapabilities } from '../src/server/config/capabilities.js'

test('identity visibility requires a configured key independently of public discovery', () => {
  const names = ['NOSTR_ENABLED', 'NOSTR_NSEC', 'NOSTR_RELAYS']
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]))
  try {
    process.env.NOSTR_RELAYS = ''
    for (const key of [undefined, '', '   ']) {
      process.env.NOSTR_ENABLED = 'true'
      if (key === undefined) delete process.env.NOSTR_NSEC
      else process.env.NOSTR_NSEC = key
      assert.deepEqual(getCapabilities(loadConfig()), {
        ai: loadConfig().ai.enabled, nostr: true, nostrIdentity: false,
        moneroWallet: loadConfig().monero.enabled
      })
    }
    process.env.NOSTR_NSEC = 'private-key-test-placeholder'
    const configured = loadConfig()
    assert.equal(getCapabilities(configured).nostrIdentity, true)
    assert.equal(JSON.stringify(configured).includes('private-key-test-placeholder'), false)
    assert.equal(JSON.stringify(getCapabilities(configured)).includes('private-key-test-placeholder'), false)
    process.env.NOSTR_ENABLED = 'false'
    const disabled = getCapabilities(loadConfig())
    assert.equal(disabled.nostr, false)
    assert.equal(disabled.nostrIdentity, false)
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name]
      else process.env[name] = original[name]
    }
  }
})
