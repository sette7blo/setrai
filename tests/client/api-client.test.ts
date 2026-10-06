import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import { ApiError, readableApiError } from '../../src/client/shared/api/errors.js'

test('API client returns parsed JSON responses', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async (url) => {
      assert.equal(url, '/api/capabilities')
      return new Response(JSON.stringify({ ai: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const client = new ApiClient()
    assert.deepEqual(
      await client.get('/api/capabilities'),
      { ai: false }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('API client raises readable safe errors', async () => {
  const originalFetch = globalThis.fetch

  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: 'Unable to load exercises.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )

    const client = new ApiClient()
    await assert.rejects(
      () => client.get('/api/exercises'),
      (error) => {
        assert.equal(error instanceof ApiError, true)
        assert.equal(readableApiError(error), 'Unable to load exercises.')
        return true
      }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
