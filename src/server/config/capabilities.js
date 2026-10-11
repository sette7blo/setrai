export function getCapabilities(config) {
  return {
    ai: config.ai.enabled,
    nostr: config.nostr.enabled,
    nostrIdentity: config.nostr.enabled && config.nostr.identityEnabled === true,
    moneroWallet: config.monero.enabled
  }
}
