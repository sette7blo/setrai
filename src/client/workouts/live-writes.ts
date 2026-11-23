// Live-state saves run one after another. A failed save is reported by its
// caller and must not block later writes, so the chain only waits for each
// earlier write to settle.
export interface WriteQueue {
  run<T>(write: () => Promise<T>): Promise<T>
  settled(): Promise<void>
}

export function createWriteQueue(): WriteQueue {
  let tail: Promise<unknown> = Promise.resolve()
  return {
    run(write) {
      const next = tail.catch(() => undefined).then(write)
      tail = next
      return next
    },
    settled() {
      return tail.then(() => undefined, () => undefined)
    }
  }
}
