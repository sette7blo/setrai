// Workstr's WebKit activation strategy: prime during a real gesture and keep
// the context alive through silent stretches between countdowns.
export function browserAudioContext(): AudioContext {
  const audioGlobal = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }
  const Constructor = audioGlobal.AudioContext || audioGlobal.webkitAudioContext
  if (!Constructor) throw new Error('Audio unavailable')
  return new Constructor()
}

export function createAudioActivation(createContext: () => AudioContext) {
  let context: AudioContext | null = null
  let keepAlive: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  let pending: Promise<void> | null = null
  let rebuild = false
  let closed = false
  let unwatch = () => {}
  function stopKeepAlive(): void {
    if (!keepAlive) return
    try { keepAlive.source.stop() } catch { /* Already stopped. */ }
    keepAlive.source.disconnect()
    keepAlive.gain.disconnect()
    keepAlive = null
  }
  function startKeepAlive(): void {
    if (!context || context.state !== 'running' || keepAlive || rebuild || closed) return
    const source = context.createBufferSource()
    const rate = context.sampleRate || 22050
    source.buffer = context.createBuffer(1, rate, rate)
    source.loop = true
    const gain = context.createGain()
    gain.gain.setValueAtTime(0, context.currentTime)
    source.connect(gain)
    gain.connect(context.destination)
    source.start(0)
    keepAlive = { source, gain }
  }
  function resume(fromGesture = false): Promise<void> {
    if (closed || !context || context.state === 'closed') return Promise.resolve()
    if (context.state === 'running') { startKeepAlive(); return Promise.resolve() }
    if (pending && !fromGesture) return pending
    const current = context
    let timer: ReturnType<typeof setTimeout>
    // A stalled WebKit resume must not block the next tap or future cues.
    const timeout = new Promise<void>(resolve => { timer = setTimeout(resolve, 2000) })
    const attempt = Promise.race([current.resume(), timeout]).then(() => {
      if (current === context && !closed) startKeepAlive()
    }).catch(() => {}).finally(() => {
      clearTimeout(timer)
      if (pending === attempt) pending = null
    })
    pending = attempt
    return attempt
  }
  function disposeContext(): void {
    unwatch()
    stopKeepAlive()
    const stale = context
    context = null
    pending = null
    if (stale && stale.state !== 'closed') void stale.close().catch(() => {})
  }
  function unlock(): Promise<void> {
    if (closed) return Promise.resolve()
    try {
      if (context && (rebuild || context.state === 'closed' || (context.state as string) === 'interrupted')) disposeContext()
      rebuild = false
      if (!context) {
        context = createContext()
        const current = context
        const changed = () => {
          if (current !== context || closed) return
          try {
            if (current.state === 'running') startKeepAlive()
            else { stopKeepAlive(); void resume() }
          } catch { /* Optional device audio. */ }
        }
        current.addEventListener('statechange', changed)
        unwatch = () => current.removeEventListener('statechange', changed)
      }
      const attempt = resume(true)
      // This must happen synchronously inside click/touchend, before any await.
      const source = context.createBufferSource()
      source.buffer = context.createBuffer(1, 1, context.sampleRate || 22050)
      source.connect(context.destination)
      source.addEventListener('ended', () => source.disconnect(), { once: true })
      source.start(0)
      return attempt
    } catch { return Promise.resolve() }
  }
  return {
    current: () => context,
    unlock,
    resume: () => { try { return resume() } catch { return Promise.resolve() } },
    background() { rebuild = true; stopKeepAlive() },
    close() { closed = true; disposeContext() }
  }
}
