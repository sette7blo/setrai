export interface CountdownCue { key: string; endsAt: number }

// Schedule against the deadline, not the interval that repaints the countdown.
export function createCountdownAudio(createContext: () => AudioContext = () => new AudioContext()) {
  let context: AudioContext | null = null
  let key = ''
  let nodes: OscillatorNode[] = []
  let closed = false
  function cancel(): void {
    for (const node of nodes) {
      try { node.stop() } catch { /* Already ended. */ }
    }
    nodes = []
    key = ''
  }
  function sync(cue: CountdownCue | null, now = Date.now()): void {
    if (closed) return
    if (!cue || !context || context.state !== 'running') { cancel(); return }
    const next = `${cue.key}:${cue.endsAt}`
    if (key === next) return
    cancel()
    key = next
    const current = context.currentTime
    // Output timestamps account for the device's audio output delay when available.
    const stamp = context.getOutputTimestamp?.()
    const audibleNow = stamp?.performanceTime && stamp.contextTime
      ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
      : current - (context.baseLatency || 0) - (context.outputLatency || 0)
    const deadline = audibleNow + (cue.endsAt - now) / 1000
    for (let second = 5; second >= 0; second--) {
      const at = deadline - second
      // Returning from background must never replay a backlog of expired beeps.
      if (at < current - 0.1) continue
      const start = Math.max(current, at)
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = second === 0 ? 880 : 660
      gain.gain.setValueAtTime(0.04, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
      oscillator.connect(gain).connect(context.destination)
      oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect() }, { once: true })
      oscillator.start(start)
      oscillator.stop(start + 0.13)
      nodes.push(oscillator)
    }
  }
  return {
    sync,
    async unlock(): Promise<void> {
      if (closed) return
      try { context ??= createContext(); await context.resume() } catch { /* Sound is optional. */ }
    },
    close(): void { closed = true; cancel(); void context?.close().catch(() => undefined) }
  }
}
