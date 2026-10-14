import assert from 'node:assert/strict'
import test from 'node:test'

import {
  capabilityLabel,
  findRoute,
  primaryNavPath
} from '../../src/client/app/router.js'
import {
  parseCapabilities
} from '../../src/client/app/capabilities.js'

test('capabilities parsing keeps missing or malformed integrations disabled', () => {
  assert.deepEqual(
    parseCapabilities({ ai: true, nostr: 'yes' }),
    {
      ai: true,
      nostr: false,
      nostrIdentity: false,
      moneroWallet: false
    }
  )

  assert.deepEqual(
    parseCapabilities(null),
    {
      ai: false,
      nostr: false,
      nostrIdentity: false,
      moneroWallet: false
    }
  )
})

test('capability label avoids disabled integration placeholders', () => {
  assert.equal(
    capabilityLabel({ ai: false, nostr: false, moneroWallet: false }),
    'Self-hosted training mode'
  )

  assert.equal(
    capabilityLabel({ ai: true, nostr: false, moneroWallet: false }),
    'Training plus ai'
  )
})

test('route lookup falls back to the Setrai home route', () => {
  assert.equal(findRoute('/profile').title, 'Settings')
  assert.equal(findRoute('/unknown').path, '/')
  assert.equal(findRoute('/statistics/body').title, 'Home')
  assert.equal(findRoute('/statistics/body').primaryAction, 'Log body weight')
})

test('home body route stays under Home primary navigation', () => {
  assert.equal(primaryNavPath('/statistics'), '/statistics')
  assert.equal(primaryNavPath('/statistics/body'), '/statistics')
  assert.equal(primaryNavPath('/statistics/training'), '/statistics')
  assert.equal(primaryNavPath('/'), '/statistics')
})


test('public discovery does not imply a configured identity', () => {
  assert.equal(parseCapabilities({ nostr: true }).nostrIdentity, false)
  assert.equal(parseCapabilities({ nostr: true, nostrIdentity: 'true' }).nostrIdentity, false)
  assert.equal(parseCapabilities({ nostr: false, nostrIdentity: true }).nostrIdentity, false)
  assert.equal(parseCapabilities({ nostr: true, nostrIdentity: true }).nostrIdentity, true)
  assert.equal(capabilityLabel({ ai: false, nostr: true, nostrIdentity: true, moneroWallet: false }), 'Training plus nostr')
})
