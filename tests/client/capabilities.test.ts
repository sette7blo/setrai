import assert from 'node:assert/strict'
import test from 'node:test'

import {
  capabilityLabel,
  findRoute
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
      moneroWallet: false
    }
  )

  assert.deepEqual(
    parseCapabilities(null),
    {
      ai: false,
      nostr: false,
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
  assert.equal(findRoute('/profile').title, 'Training profile')
  assert.equal(findRoute('/unknown').path, '/')
})
