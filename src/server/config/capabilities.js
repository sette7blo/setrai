export function getCapabilities(config) {
  return {
    ai: config.ai.enabled,
    nostr: config.nostr.enabled,
    moneroWallet: config.monero.enabled
  }
}
