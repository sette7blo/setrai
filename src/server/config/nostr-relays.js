// Workstr-web CANON_RELAYS: the union of its public and write defaults.
export const WORKSTR_RELAYS = [
  'wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net',
  'wss://relay.nos.social', 'wss://nostr.mom', 'wss://relay.snort.social',
  'wss://relay.wellorder.net', 'wss://bitcoiner.social', 'wss://relay.powr.build',
  'wss://nostr.bitcoiner.social', 'wss://nostr-pub.wellorder.net'
]

export function parseNostrRelays(value = '') {
  const configured = value.split(',').map(relay => relay.trim()).filter(Boolean)
  const relays = [...new Set(configured.length ? configured : WORKSTR_RELAYS)]
  if (relays.length > 20) throw new Error('Nostr supports at most 20 relays')
  for (const relay of relays) {
    let url
    try { url = new URL(relay) } catch { throw new Error('Invalid Nostr relay URL') }
    if (url.protocol !== 'wss:' || url.username || url.password || url.hash) {
      throw new Error('Nostr relays must use secure WebSocket URLs without credentials')
    }
  }
  return relays
}
