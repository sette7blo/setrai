import { apiClient } from '../shared/api/client.js'
import type { Capabilities } from '../shared/api/types.js'

const DEFAULT_CAPABILITIES: Capabilities = {
  ai: false,
  nostr: false,
  nostrIdentity: false,
  moneroWallet: false
}

function readCapability(value: unknown): boolean {
  return value === true
}

export function parseCapabilities(input: unknown): Capabilities {
  if (!input || typeof input !== 'object') {
    return DEFAULT_CAPABILITIES
  }

  const record = input as Record<string, unknown>

  return {
    ai: readCapability(record.ai),
    nostr: readCapability(record.nostr),
    nostrIdentity: readCapability(record.nostr) && readCapability(record.nostrIdentity),
    moneroWallet: readCapability(record.moneroWallet)
  }
}

export async function loadCapabilities(): Promise<Capabilities> {
  return parseCapabilities(
    await apiClient.get<unknown>('/api/capabilities')
  )
}
