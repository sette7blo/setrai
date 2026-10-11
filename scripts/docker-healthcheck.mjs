// Runs inside the image without extra packages or disclosure of configuration.
try {
  const port = process.env.SETRAI_PORT || '3000'
  const response = await fetch(`http://127.0.0.1:${port}/api/capabilities`, {
    signal: AbortSignal.timeout(4000)
  })
  if (!response.ok) throw new Error('Unavailable')
  const capabilities = await response.json()
  if (typeof capabilities.nostr !== 'boolean' || typeof capabilities.ai !== 'boolean') {
    throw new Error('Unexpected response')
  }
} catch {
  console.error('Setrai health check failed.')
  process.exitCode = 1
}
