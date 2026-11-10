import { browserAudioContext, createAudioActivation } from './live-audio-context.js'
export interface CountdownCue { key: string; endsAt: number }

// Schedule against the deadline, not the interval that repaints the countdown.
export function createCountdownAudio(createContext: () => AudioContext = browserAudioContext) {
  const activation = createAudioActivation(createContext)
  let context: AudioContext | null = null
  let key = ''
  let nodes: { node: OscillatorNode; start: number; final: boolean }[] = []
  const tails = new Set<OscillatorNode>()
  let endsAt = 0
  let closed = false
  function tone(at: number, frequency: number): OscillatorNode {
    const oscillator = context!.createOscillator()
    const gain = context!.createGain()
    const final = frequency === 1175
    const duration = final ? 0.65 : 0.15
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(final ? 0.8 : 0.6, at + 0.012)
    if (final) gain.gain.exponentialRampToValueAtTime(0.55, at + 0.28)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
    oscillator.connect(gain).connect(context!.destination)
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect(); gain.disconnect(); tails.delete(oscillator)
    }, { once: true })
    oscillator.start(at)
    oscillator.stop(at + duration)
    return oscillator
  }
  function cancel(finishTransition = false): void {
    for (const { node, start, final } of nodes) {
      if (finishTransition && final && context && context.currentTime >= start) { tails.add(node); continue }
      try { node.stop() } catch { /* Already ended. */ }
    }
    nodes = []
    key = ''
    endsAt = 0
  }
  function stopTails(): void {
    for (const node of tails) { try { node.stop() } catch { /* Already ended. */ } }
    tails.clear()
  }
  function sync(cue: CountdownCue | null, now = Date.now()): void {
    if (closed) return
    context = activation.current()
    if (!cue || !context || context.state !== 'running') {
      cancel(!cue && !!endsAt && now >= endsAt && context?.state === 'running')
      if (cue) void activation.resume()
      return
    }
    const next = `${cue.key}:${cue.endsAt}`
    if (key === next) return
    cancel(!!endsAt && now >= endsAt)
    key = next
    endsAt = cue.endsAt
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
      nodes.push({ node: tone(start, second === 0 ? 1175 : 880), start, final: second === 0 })
    }
  }
  async function unlock(): Promise<void> {
    if (closed) return
    const attempt = activation.unlock()
    const next = activation.current()
    if (next !== context) { cancel(); stopTails(); context = next }
    await attempt
  }
  return {
    sync,
    unlock,
    resume: activation.resume,
    background() { cancel(); stopTails(); activation.background() },
    close(): void {
      closed = true
      cancel()
      stopTails()
      activation.close()
    }
  }
}
